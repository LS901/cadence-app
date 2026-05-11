import { Prisma } from "@prisma/client";
import { format, startOfDay, subDays } from "date-fns";
import type {
  HabitDayCell,
  HabitItem,
  HabitLogStatusValue,
  HabitTrendWeek,
  HabitsPageData,
  HabitTypeValue,
} from "@/features/habits/types";
import { mockHabitLogs, mockHabits } from "@/lib/data/mock-cadence";

const RECENT_DAYS = 7;
const HISTORY_WINDOW_DAYS = 28;
const TREND_WEEKS = 4;
const DAYS_PER_WEEK = 7;

export type HabitWithLogs = {
  id: string;
  name: string;
  category: HabitItem["category"];
  type: HabitTypeValue;
  notes?: string | null;
  targetPerWeek: number;
  logs: Array<{
    day: Date;
    status: HabitLogStatusValue;
  }>;
};

type HabitsQueryDependencies = {
  hasDatabase: boolean;
  buildMockHabitsPageData: (now: Date) => HabitsPageData;
  findHabits: (userId: string, cutoff: Date) => Promise<HabitWithLogs[]>;
  now?: () => Date;
};

function getAlignedStatus(type: HabitTypeValue): HabitLogStatusValue {
  return type === "POSITIVE" ? "COMPLETED" : "SKIPPED";
}

function getDayKey(day: Date) {
  return startOfDay(day).toISOString().slice(0, 10);
}

function buildHistoryDays(logs: HabitWithLogs["logs"], now: Date) {
  const today = startOfDay(now);
  const logByDay = new Map(logs.map((log) => [getDayKey(log.day), log.status]));

  return Array.from({ length: HISTORY_WINDOW_DAYS }, (_, index) => {
    const day = subDays(today, HISTORY_WINDOW_DAYS - index - 1);
    const status = logByDay.get(getDayKey(day)) ?? "PENDING";

    return {
      dayIso: day.toISOString(),
      shortLabel: format(day, "EEEEE"),
      label: format(day, "MMM d"),
      status,
      isToday: index === HISTORY_WINDOW_DAYS - 1,
    } satisfies HabitDayCell;
  });
}

function buildRecentDays(historyDays: HabitDayCell[]) {
  return historyDays.slice(-RECENT_DAYS);
}

function getTargetProgress(targetPerWeek: number, alignedDays: number) {
  return Math.min(100, Math.round((alignedDays / Math.max(targetPerWeek, 1)) * 100));
}

function getStreak(type: HabitTypeValue, historyDays: HabitDayCell[]) {
  const alignedStatus = getAlignedStatus(type);
  let streak = 0;

  for (let index = historyDays.length - 1; index >= 0; index -= 1) {
    const status = historyDays[index]?.status;

    if (status !== alignedStatus) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function buildTrendWeeks(
  historyDays: HabitDayCell[],
  type: HabitTypeValue,
  targetPerWeek: number
) {
  const alignedStatus = getAlignedStatus(type);

  return Array.from({ length: TREND_WEEKS }, (_, index) => {
    const weekDays = historyDays.slice(index * DAYS_PER_WEEK, (index + 1) * DAYS_PER_WEEK);
    const alignedDays = weekDays.filter((day) => day.status === alignedStatus).length;
    const loggedDays = weekDays.filter((day) => day.status !== "PENDING").length;

    return {
      label: weekDays[0]?.label ?? `Week ${index + 1}`,
      alignedDays,
      loggedDays,
      progress: getTargetProgress(targetPerWeek, alignedDays),
      targetHit: alignedDays >= targetPerWeek,
    } satisfies HabitTrendWeek;
  });
}

function buildHabitItem(habit: HabitWithLogs, now: Date): HabitItem {
  const alignedStatus = getAlignedStatus(habit.type);
  const historyDays = buildHistoryDays(habit.logs, now);
  const recentDays = buildRecentDays(historyDays);
  const alignedDays = recentDays.filter((day) => day.status === alignedStatus).length;
  const todayStatus = recentDays.find((day) => day.isToday)?.status;

  return {
    id: habit.id,
    name: habit.name,
    category: habit.category,
    type: habit.type,
    notes: habit.notes ?? null,
    targetPerWeek: habit.targetPerWeek,
    targetProgress: getTargetProgress(habit.targetPerWeek, alignedDays),
    alignedDays,
    streak: getStreak(habit.type, historyDays),
    todayStatus:
      todayStatus === "COMPLETED" || todayStatus === "SKIPPED"
        ? todayStatus
        : null,
    historyDays,
    recentDays,
    trendWeeks: buildTrendWeeks(historyDays, habit.type, habit.targetPerWeek),
  };
}

function buildSummary(habits: HabitItem[]) {
  const onTrackToday = habits.filter((habit) => {
    if (!habit.todayStatus) {
      return false;
    }

    return habit.todayStatus === getAlignedStatus(habit.type);
  }).length;

  const totalAlignedDays = habits.reduce((sum, habit) => sum + habit.alignedDays, 0);
  const totalPossibleDays = habits.length * RECENT_DAYS;

  return {
    activeHabits: habits.length,
    onTrackToday,
    weeklyConsistencyRate: totalPossibleDays
      ? Math.round((totalAlignedDays / totalPossibleDays) * 100)
      : 0,
    bestStreak: habits.reduce((best, habit) => Math.max(best, habit.streak), 0),
  };
}

export function buildHabitsPageDataFromSource(
  source: "mock" | "database",
  habits: HabitWithLogs[],
  now = new Date()
): HabitsPageData {
  const items = habits.map((habit) => buildHabitItem(habit, now));

  return {
    dataSource: source,
    summary: buildSummary(items),
    positiveHabits: items.filter((habit) => habit.type === "POSITIVE"),
    negativeHabits: items.filter((habit) => habit.type === "NEGATIVE"),
  };
}

function isRecoverablePrismaError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  );
}

export function buildMockHabitsPageData(now = new Date()) {
  const cutoff = subDays(startOfDay(now), HISTORY_WINDOW_DAYS - 1);

  return buildHabitsPageDataFromSource(
    "mock",
    mockHabits.map((habit) => ({
      ...habit,
      logs: mockHabitLogs
        .filter((log) => log.habitId === habit.id && log.day >= cutoff)
        .map((log) => ({
          day: log.day,
          status: log.status,
        })),
    })),
    now
  );
}

export async function getHabitsPageDataWithDependencies(
  userId: string,
  dependencies: HabitsQueryDependencies
): Promise<HabitsPageData> {
  const now = dependencies.now?.() ?? new Date();

  if (!dependencies.hasDatabase) {
    return dependencies.buildMockHabitsPageData(now);
  }

  const cutoff = subDays(startOfDay(now), HISTORY_WINDOW_DAYS - 1);

  try {
    const habits = await dependencies.findHabits(userId, cutoff);
    return buildHabitsPageDataFromSource("database", habits, now);
  } catch (error) {
    if (isRecoverablePrismaError(error)) {
      return dependencies.buildMockHabitsPageData(now);
    }

    throw error;
  }
}