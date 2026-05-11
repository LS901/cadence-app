import { differenceInCalendarDays, endOfDay, endOfWeek, format, isSameDay, startOfDay, startOfWeek, subDays, subWeeks } from "date-fns";
import { Prisma } from "@prisma/client";
import { buildMockDashboardData, type DashboardData } from "@/lib/data/mock-cadence";
import { db, hasDatabaseUrl } from "@/lib/db";
import { buildLifeEventTimeline } from "@/lib/life-events";
import { buildWeeklyReview, buildWeeklyReviewArchiveItem } from "@/features/dashboard/lib/weekly-review";
import {
  getAnalyticsLifeEventDayExposures,
  getAnalyticsLifeEvents,
  getLifeEventsContextData,
} from "@/server/life-events/queries";
import { buildInsightAnalysisSnapshot } from "@/server/insights/analysis";

function overlapsWindow(startAtIso: string, endAtIso: string | null, isOngoing: boolean, windowStart: Date, windowEnd: Date) {
  const startAt = new Date(startAtIso);
  const resolvedEnd = endAtIso ? new Date(endAtIso) : isOngoing ? windowEnd : startAt;

  return startAt <= windowEnd && resolvedEnd >= windowStart;
}

function getAverageMood(entries: Array<{ score: number }>) {
  return entries.length
    ? Math.round(entries.reduce((total, entry) => total + entry.score, 0) / entries.length)
    : null;
}

type FocusWindow = {
  start: Date;
  end: Date;
};

function normalizeFocusWindow(window?: FocusWindow | null) {
  if (!window) {
    return null;
  }

  const start = startOfDay(window.start);
  const end = endOfDay(window.end);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return null;
  }

  return { start, end };
}

function isWithinFocusWindow(date: Date, window: FocusWindow | null) {
  if (!window) {
    return true;
  }

  return date >= window.start && date <= window.end;
}

function getComparisonWindow(window: FocusWindow | null) {
  if (!window) {
    return null;
  }

  const dayCount = differenceInCalendarDays(window.end, window.start) + 1;

  return {
    start: startOfDay(subDays(window.start, dayCount)),
    end: endOfDay(subDays(window.start, 1)),
  };
}

function overlapsAnalyticsWindow(startAt: Date, endAt: Date | null | undefined, isOngoing: boolean, window: FocusWindow | null) {
  if (!window) {
    return true;
  }

  const resolvedEnd = endAt ? endAt : isOngoing ? window.end : startAt;

  return startAt <= window.end && resolvedEnd >= window.start;
}

async function loadDashboardQuerySourceData(userId: string) {
  const [moodEntries, habitLogs, habits, activities, journalEntries, lifeEvents, lifeEventDayExposures, context] = await Promise.all([
    db!.moodEntry.findMany({
      where: { userId },
      include: {
        periods: {
          orderBy: {
            startMinute: "asc",
          },
        },
      },
      orderBy: { day: "asc" },
      take: 35,
    }),
    db!.habitLog.findMany({
      where: { userId },
      include: { habit: true },
      orderBy: { day: "desc" },
      take: 56,
    }),
    db!.habit.findMany({ where: { userId, isArchived: false } }),
    db!.activity.findMany({
      where: { userId },
      orderBy: { scheduledAt: "desc" },
      take: 40,
    }),
    db!.journalEntry.findMany({
      where: { userId },
      orderBy: { day: "desc" },
      take: 21,
    }),
    getAnalyticsLifeEvents(userId),
    getAnalyticsLifeEventDayExposures(userId),
    getLifeEventsContextData(userId),
  ]);

  return {
    moodEntries,
    habitLogs,
    habits,
    activities,
    journalEntries,
    lifeEvents,
    lifeEventDayExposures,
    context,
  };
}

export type DashboardQuerySourceData = Awaited<ReturnType<typeof loadDashboardQuerySourceData>>;

type DashboardQueryDependencies = {
  hasDatabase: boolean;
  buildMockData: (focusWindow: FocusWindow | null) => DashboardData;
  loadDashboardQuerySourceData: (userId: string) => Promise<DashboardQuerySourceData>;
  now?: () => Date;
};

function isRecoverablePrismaError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  );
}

export function buildDashboardDataFromSourceData(
  userId: string,
  sourceData: DashboardQuerySourceData,
  normalizedFocusWindow: FocusWindow | null,
  now = new Date()
): DashboardData {
  const {
    moodEntries,
    habitLogs,
    habits,
    activities,
    journalEntries,
    lifeEvents,
    lifeEventDayExposures,
    context,
  } = sourceData;

  const comparisonWindow = getComparisonWindow(normalizedFocusWindow);
  const recentMood = normalizedFocusWindow
    ? moodEntries.filter((entry) => isWithinFocusWindow(entry.day, normalizedFocusWindow))
    : moodEntries.slice(-7);
  const previousMood = comparisonWindow
    ? moodEntries.filter((entry) => isWithinFocusWindow(entry.day, comparisonWindow))
    : moodEntries.slice(-14, -7);
  const weeklyAverage = recentMood.length
    ? Math.round(recentMood.reduce((total, entry) => total + entry.score, 0) / recentMood.length)
    : 0;
  const previousAverage = previousMood.length
    ? Math.round(previousMood.reduce((total, entry) => total + entry.score, 0) / previousMood.length)
    : weeklyAverage;
  const recentHabitLogs = normalizedFocusWindow
    ? habitLogs.filter((log) => isWithinFocusWindow(log.day, normalizedFocusWindow))
    : habitLogs.filter((log) => log.day >= subDays(now, 6));
  const recentActivities = normalizedFocusWindow
    ? activities.filter((activity) => isWithinFocusWindow(activity.scheduledAt, normalizedFocusWindow))
    : activities.filter((activity) => activity.scheduledAt >= subDays(now, 6));
  const scopedJournalEntries = normalizedFocusWindow
    ? journalEntries.filter((entry) => isWithinFocusWindow(entry.day, normalizedFocusWindow))
    : journalEntries;
  const scopedAnalyticsLifeEvents = normalizedFocusWindow
    ? lifeEvents.filter((event) => overlapsAnalyticsWindow(event.startAt, event.endAt, event.isOngoing, normalizedFocusWindow))
    : lifeEvents;
  const scopedLifeEventDayExposures = normalizedFocusWindow
    ? lifeEventDayExposures.filter((exposure) => isWithinFocusWindow(exposure.day, normalizedFocusWindow))
    : lifeEventDayExposures;
  const scopedMoodEntries = normalizedFocusWindow
    ? moodEntries.filter((entry) => isWithinFocusWindow(entry.day, normalizedFocusWindow))
    : moodEntries;
  const habitCompletionLogs = recentHabitLogs.filter((log) => log.status === "COMPLETED").length;
  const activityCompletion = recentActivities.filter((activity) => activity.status === "COMPLETED").length;
  const todayMoodEntry = moodEntries.find((entry) => isSameDay(entry.day, now)) ?? null;
  const analysisSnapshot = buildInsightAnalysisSnapshot({
    activities: normalizedFocusWindow ? recentActivities : activities,
    habits,
    habitLogs: normalizedFocusWindow ? recentHabitLogs : habitLogs,
    journalEntries: scopedJournalEntries,
    lifeEvents: scopedAnalyticsLifeEvents,
    lifeEventDayExposures: scopedLifeEventDayExposures,
    moodEntries: scopedMoodEntries.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      day: entry.day,
      score: entry.score,
      energy: entry.energy,
      stress: entry.stress,
      sleepHours: entry.sleepHours == null ? null : Number(entry.sleepHours),
      sleepQuality: entry.sleepQuality,
      workStress: entry.workStress,
      socialQuality: entry.socialQuality,
      moodStability: entry.moodStability,
      notes: entry.notes,
      tags: entry.tags,
      periods: entry.periods.map((period) => ({
        id: period.id,
        moodEntryId: period.moodEntryId,
        userId: period.userId,
        day: period.day,
        startMinute: period.startMinute,
        endMinute: period.endMinute,
        score: period.score,
        notes: period.notes,
        tags: period.tags,
      })),
    })),
  });
  const insightHighlights = (analysisSnapshot.candidates.length
    ? analysisSnapshot.candidates
    : analysisSnapshot.exploratoryCandidates).slice(0, 3).map((candidate) => ({
    id: candidate.id,
    userId,
    title: candidate.title,
    summary: candidate.summary,
    metric: candidate.metric,
    strength: candidate.strength,
    confidence: candidate.confidence,
    direction: candidate.direction,
    lagDays: candidate.lagDays,
    evidenceLabel: candidate.evidenceLabel,
    evidenceLevel: candidate.evidenceLevel,
    sampleSize: candidate.sampleSize,
    exposedDayCount: candidate.exposedDayCount,
    alignedDayCount: candidate.alignedDayCount,
    uncertaintySummary: candidate.uncertaintySummary,
  }));
  const scopedContextEvents = normalizedFocusWindow
    ? context.lifeEvents.filter((event) => overlapsWindow(event.startAtIso, event.endAtIso, event.isOngoing, normalizedFocusWindow.start, normalizedFocusWindow.end))
    : context.lifeEvents;
  const recentContext = scopedContextEvents.slice(0, 3);
  const contextTimeline = buildLifeEventTimeline(
    recentMood.map((entry) => ({
      day: format(entry.day, "EEE"),
      date: entry.day,
    })),
    scopedContextEvents.map((event) => ({
      title: event.title,
      severityScore: event.severityScore,
      sentiment: event.sentiment,
      startAt: new Date(event.startAtIso),
      endAt: event.endAtIso ? new Date(event.endAtIso) : null,
      isOngoing: event.isOngoing,
    }))
  );
  const habitsSnapshot = habits.map((habit) => {
    const logsForHabit = recentHabitLogs.filter((log) => log.habitId === habit.id);
    const completed = logsForHabit.filter((log) => log.status === "COMPLETED").length;

    return {
      id: habit.id,
      name: habit.name,
      progress: Math.round((completed / Math.max(logsForHabit.length, 1)) * 100),
      type: habit.type,
    };
  });
  const weakestHabit = habitsSnapshot.reduce<(typeof habitsSnapshot)[number] | null>((currentWeakest, habit) => {
    if (!currentWeakest || habit.progress < currentWeakest.progress) {
      return habit;
    }

    return currentWeakest;
  }, null);
  const weeklyReview = buildWeeklyReview({
    recentMoodCount: recentMood.length,
    weeklyAverage: recentMood.length ? weeklyAverage : null,
    previousAverage: previousMood.length ? previousAverage : null,
    topInsight: insightHighlights[0]
      ? {
          title: insightHighlights[0].title,
          summary: insightHighlights[0].summary,
          evidenceLabel: insightHighlights[0].evidenceLabel,
        }
      : null,
    strongestContext: recentContext[0]
      ? {
          title: recentContext[0].title,
          severityLabel: recentContext[0].severityLabel,
          sentimentLabel: recentContext[0].sentimentLabel,
        }
      : null,
    weakestHabit: weakestHabit
      ? {
          name: weakestHabit.name,
          progress: weakestHabit.progress,
          type: weakestHabit.type,
        }
      : null,
    completedActivities: activityCompletion,
    totalActivities: recentActivities.length,
    journalCount: normalizedFocusWindow
      ? scopedJournalEntries.length
      : journalEntries.filter((entry) => entry.day >= subDays(now, 6)).length,
  });
  const currentWeekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weeklyReviewArchive = Array.from({ length: 3 }, (_, index) => {
    const weekStart = subWeeks(currentWeekStart, index + 1);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const previousWeekStart = subWeeks(weekStart, 1);
    const previousWeekEnd = endOfWeek(previousWeekStart, { weekStartsOn: 1 });
    const weekMood = moodEntries.filter((entry) => entry.day >= weekStart && entry.day <= weekEnd);
    const previousWeekMood = moodEntries.filter((entry) => entry.day >= previousWeekStart && entry.day <= previousWeekEnd);
    const weekActivities = activities.filter((activity) => activity.scheduledAt >= weekStart && activity.scheduledAt <= weekEnd);
    const weekJournalEntries = journalEntries.filter((entry) => entry.day >= weekStart && entry.day <= weekEnd);
    const weekLifeEvents = context.lifeEvents
      .filter((event) => overlapsWindow(event.startAtIso, event.endAtIso, event.isOngoing, weekStart, weekEnd))
      .sort((left, right) => right.severityScore - left.severityScore);
    const weekHabitLogs = habitLogs.filter((log) => log.day >= weekStart && log.day <= weekEnd);
    const weekWeakestHabit = habits
      .map((habit) => {
        const logsForHabit = weekHabitLogs.filter((log) => log.habitId === habit.id);

        if (!logsForHabit.length) {
          return null;
        }

        const completedForHabit = logsForHabit.filter((log) => log.status === "COMPLETED").length;

        return {
          name: habit.name,
          progress: Math.round((completedForHabit / logsForHabit.length) * 100),
          type: habit.type,
        };
      })
      .filter((habit): habit is { name: string; progress: number; type: "POSITIVE" | "NEGATIVE" } => Boolean(habit))
      .reduce<{ name: string; progress: number; type: "POSITIVE" | "NEGATIVE" } | null>((currentWeakest, habit) => {
        if (!currentWeakest || habit.progress < currentWeakest.progress) {
          return habit;
        }

        return currentWeakest;
      }, null);

    if (!weekMood.length && !weekActivities.length && !weekJournalEntries.length && !weekLifeEvents.length) {
      return null;
    }

    return buildWeeklyReviewArchiveItem(`${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`, {
      recentMoodCount: weekMood.length,
      weeklyAverage: getAverageMood(weekMood),
      previousAverage: getAverageMood(previousWeekMood),
      topInsight: null,
      strongestContext: weekLifeEvents[0]
        ? {
            title: weekLifeEvents[0].title,
            severityLabel: weekLifeEvents[0].severityLabel,
            sentimentLabel: weekLifeEvents[0].sentimentLabel,
          }
        : null,
      weakestHabit: weekWeakestHabit,
      completedActivities: weekActivities.filter((activity) => activity.status === "COMPLETED").length,
      totalActivities: weekActivities.length,
      journalCount: weekJournalEntries.length,
    });
  }).filter((item): item is NonNullable<typeof item> => Boolean(item));

  return {
    overview: [
      {
        label: "Weekly mood average",
        value: recentMood.length ? `${weeklyAverage} / 100` : "No entry yet",
        detail: recentMood.length
          ? `${weeklyAverage - previousAverage >= 0 ? "+" : ""}${weeklyAverage - previousAverage} vs last week`
          : "Save a quick dashboard check-in to start the baseline.",
      },
      {
        label: "Habit completion",
        value: `${Math.round((habitCompletionLogs / Math.max(recentHabitLogs.length, 1)) * 100)}%`,
        detail: `${habitCompletionLogs} of ${recentHabitLogs.length} habit logs completed`,
      },
      {
        label: "Activity completion",
        value: `${Math.round((activityCompletion / Math.max(recentActivities.length, 1)) * 100)}%`,
        detail: `${activityCompletion} of ${recentActivities.length} planned activities done`,
      },
      {
        label: "Reflection streak",
        value: `${normalizedFocusWindow ? scopedJournalEntries.length : journalEntries.length} entries`,
        detail: (normalizedFocusWindow ? scopedJournalEntries.length : journalEntries.length)
          ? normalizedFocusWindow
            ? `Journal entries inside ${format(normalizedFocusWindow.start, "MMM d")} - ${format(normalizedFocusWindow.end, "MMM d")}`
            : "Recent writing cadence is available for trend analysis"
          : "No recent journal entries yet.",
      },
    ],
    moodSeries: recentMood.map((entry) => ({
      day: format(entry.day, "EEE"),
      score: entry.score,
      energy: entry.energy ?? entry.score,
    })),
    todayQuickCapture: {
      dayIso: (todayMoodEntry?.day ?? now).toISOString(),
      score: todayMoodEntry?.score ?? null,
      notes: todayMoodEntry?.notes ?? null,
      reflectionCompleted: Boolean(todayMoodEntry?.reflectionCompletedAt),
      hasPeriods: Boolean(todayMoodEntry?.periods.length),
    },
    contextTimeline,
    recentContext,
    insights: insightHighlights,
    insightHighlightMode: analysisSnapshot.candidates.length ? "PRIMARY" : analysisSnapshot.exploratoryCandidates.length ? "EXPLORATORY" : "EMPTY",
    insightNullState: analysisSnapshot.nullState,
    weeklyReview,
    weeklyReviewArchive,
    recentFeed: [
      ...scopedJournalEntries.slice(0, 2).map((entry) => ({
        id: entry.id,
        title: entry.title ?? "Journal entry",
        description: entry.content,
        meta: `${entry.day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · Journal`,
      })),
      ...recentActivities.slice(0, 2).map((activity) => ({
        id: activity.id,
        title: activity.title,
        description: activity.notes ?? `${activity.status.toLowerCase()} activity logged in ${activity.category.toLowerCase()}`,
        meta: `${activity.scheduledAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${activity.category.toLowerCase()}`,
      })),
    ],
    plannerPreview: recentActivities.slice(0, 4).map((activity) => ({
      id: activity.id,
      title: activity.title,
      when: activity.scheduledAt.toLocaleString("en-US", {
        weekday: "short",
        hour: "numeric",
        minute: "2-digit",
      }),
      status: activity.status.toLowerCase(),
      category: activity.category.toLowerCase(),
    })),
    habitsSnapshot,
  } satisfies DashboardData;
}

export async function getDashboardDataWithDependencies(
  userId: string,
  focusWindow?: FocusWindow | null,
  dependencies: DashboardQueryDependencies = {
    hasDatabase: hasDatabaseUrl,
    buildMockData: buildMockDashboardData,
    loadDashboardQuerySourceData,
  }
): Promise<DashboardData> {
  const normalizedFocusWindow = normalizeFocusWindow(focusWindow);

  if (!dependencies.hasDatabase) {
    return dependencies.buildMockData(normalizedFocusWindow);
  }

  try {
    const sourceData = await dependencies.loadDashboardQuerySourceData(userId);

    return buildDashboardDataFromSourceData(
      userId,
      sourceData,
      normalizedFocusWindow,
      dependencies.now?.() ?? new Date()
    );
  } catch (error) {
    if (isRecoverablePrismaError(error)) {
      return dependencies.buildMockData(normalizedFocusWindow);
    }

    throw error;
  }
}

export async function getDashboardData(userId: string, focusWindow?: FocusWindow | null): Promise<DashboardData> {
  return getDashboardDataWithDependencies(userId, focusWindow);
}