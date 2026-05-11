import { Prisma } from "@prisma/client";
import {
  eachDayOfInterval,
  endOfWeek,
  format,
  isToday,
  startOfWeek,
} from "date-fns";
import type { LifeEventItem } from "@/features/life-events/types";
import type {
  PlannerActivityHistory,
  PlannerActivityItem,
  PlannerData,
} from "@/features/planner/types";
import { mockActivities, mockLifeEventItems } from "@/lib/data/mock-cadence";
import { lifeEventOverlapsDay } from "@/lib/life-events";

function buildPlannerData(
  activities: PlannerActivityItem[],
  activityHistory: PlannerActivityHistory[],
  lifeEvents: LifeEventItem[],
  dataSource: PlannerData["dataSource"],
  now = new Date()
): PlannerData {
  const today = now;
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: weekStart, end: weekEnd }).map((day) => {
    const dateKey = format(day, "yyyy-MM-dd");
    const dayLifeEvents = lifeEvents.filter((lifeEvent) =>
      lifeEventOverlapsDay(
        {
          startAt: new Date(lifeEvent.startAtIso),
          endAt: lifeEvent.endAtIso ? new Date(lifeEvent.endAtIso) : null,
          isOngoing: lifeEvent.isOngoing,
        },
        day
      )
    );
    const dominantLifeEvent = [...dayLifeEvents].sort((left, right) => right.severityScore - left.severityScore)[0] ?? null;

    return {
      dateKey,
      shortLabel: format(day, "EEE"),
      fullLabel: format(day, "EEEE, MMM d"),
      dayNumber: format(day, "d"),
      isToday: isToday(day),
      context: {
        activeCount: dayLifeEvents.length,
        dominantTitle: dominantLifeEvent?.title ?? null,
        dominantSentiment: dominantLifeEvent?.sentiment ?? null,
        categories: dayLifeEvents.map((lifeEvent) => lifeEvent.categoryLabel).slice(0, 3),
      },
      items: activities.filter(
        (activity) => format(new Date(activity.scheduledAtIso), "yyyy-MM-dd") === dateKey
      ),
    };
  });

  const completed = activities.filter((activity) => activity.status === "COMPLETED").length;
  const skipped = activities.filter((activity) => activity.status === "SKIPPED").length;
  const scheduled = activities.filter((activity) => activity.status === "SCHEDULED").length;

  return {
    dataSource,
    weekLabel: `${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`,
    days,
    summary: {
      total: activities.length,
      scheduled,
      completed,
      skipped,
      recurring: activities.filter((activity) => activity.recurring).length,
      completionRate: activities.length
        ? Math.round((completed / activities.length) * 100)
        : 0,
    },
    activityHistory,
    lifeEvents,
  };
}

function mapActivity(
  activity: {
    id: string;
    templateId?: string | null;
    title: string;
    category: PlannerActivityItem["category"];
    status: PlannerActivityItem["status"];
    notes: string | null;
    recurring: boolean;
    recurrencePattern?: PlannerActivityItem["recurrencePattern"];
    recurrenceCustom?: string | null;
    scheduledAt: Date;
    durationMinutes: number | null;
    completionMoodScore: number | null;
  },
  now = new Date()
): PlannerActivityItem {
  return {
    id: activity.id,
    templateId: activity.templateId ?? null,
    title: activity.title,
    category: activity.category,
    status: activity.status,
    notes: activity.notes,
    recurring: activity.recurring,
    recurrencePattern: activity.recurrencePattern ?? null,
    recurrenceCustom: activity.recurrenceCustom ?? null,
    scheduledAtIso: activity.scheduledAt.toISOString(),
    scheduledTimeLabel: format(activity.scheduledAt, "h:mm a"),
    isFuture: activity.scheduledAt > now,
    durationMinutes: activity.durationMinutes,
    completionMoodScore: activity.completionMoodScore,
  };
}

function buildMockActivityHistory(
  items: Array<{
    title: string;
    category: PlannerActivityItem["category"];
    notes?: string;
    durationMinutes?: number | null;
    completionMoodScore: number | null;
    completedAt: Date | null;
    sortAt: Date;
  }>
): PlannerActivityHistory[] {
  const historyMap = new Map<
    string,
    PlannerActivityHistory & { moodSum: number }
  >();

  const sortedItems = [...items].sort(
    (left, right) => right.sortAt.getTime() - left.sortAt.getTime()
  );

  for (const item of sortedItems) {
    const key = item.title.trim().toLowerCase();
    const existing = historyMap.get(key);

    if (!existing) {
      historyMap.set(key, {
        templateId: `mock-template-${key}`,
        title: item.title,
        category: item.category,
        notes: item.notes ?? null,
        defaultDurationMinutes: item.durationMinutes ?? null,
        completionCount: item.completionMoodScore == null ? 0 : 1,
        totalCount: 1,
        averageMoodScore: item.completionMoodScore,
        lastCompletedAtIso: item.completedAt?.toISOString() ?? null,
        moodSum: item.completionMoodScore ?? 0,
      });
      continue;
    }

    existing.totalCount += 1;

    if (item.completionMoodScore != null) {
      existing.completionCount += 1;
      existing.moodSum += item.completionMoodScore;
    }

    if (
      item.completedAt &&
      (!existing.lastCompletedAtIso ||
        new Date(existing.lastCompletedAtIso) < item.completedAt)
    ) {
      existing.lastCompletedAtIso = item.completedAt.toISOString();
    }
  }

  return [...historyMap.values()]
    .map(({ moodSum, ...item }) => ({
      ...item,
      averageMoodScore: item.completionCount
        ? Math.round(moodSum / item.completionCount)
        : null,
    }))
    .sort((left, right) => {
      if (right.totalCount !== left.totalCount) {
        return right.totalCount - left.totalCount;
      }

      return left.title.localeCompare(right.title);
    });
}

export function buildMockPlannerData(userId: string, now = new Date()): PlannerData {
  const today = now;
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  const mockHistory = buildMockActivityHistory(
    mockActivities
      .filter((activity) => activity.userId === userId)
      .map((activity) => ({
        title: activity.title,
        category: activity.category,
        notes: activity.notes,
        durationMinutes: null,
        completionMoodScore: activity.completionMoodScore ?? null,
        completedAt: activity.status === "COMPLETED" ? activity.scheduledAt : null,
        sortAt: activity.scheduledAt,
      }))
  );

  return buildPlannerData(
    mockActivities
      .filter(
        (activity) =>
          activity.userId === userId &&
          activity.scheduledAt >= weekStart &&
          activity.scheduledAt <= weekEnd
      )
      .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime())
      .map((activity) => ({
        id: activity.id,
        templateId: `mock-template-${activity.title.trim().toLowerCase().replace(/\s+/g, "-")}`,
        title: activity.title,
        category: activity.category,
        status: activity.status,
        notes: activity.notes ?? null,
        recurring: activity.recurring,
        recurrencePattern: activity.recurrencePattern ?? null,
        recurrenceCustom: activity.recurrenceCustom ?? null,
        scheduledAtIso: activity.scheduledAt.toISOString(),
        scheduledTimeLabel: format(activity.scheduledAt, "h:mm a"),
        isFuture: activity.scheduledAt > today,
        durationMinutes: null,
        completionMoodScore: activity.completionMoodScore ?? null,
      })),
    mockHistory,
    mockLifeEventItems,
    "mock",
    now
  );
}

export type PlannerQuerySourceData = {
  activities: Array<{
    id: string;
    templateId: string | null;
    title: string;
    category: PlannerActivityItem["category"];
    status: PlannerActivityItem["status"];
    notes: string | null;
    recurring: boolean;
    recurrencePattern: PlannerActivityItem["recurrencePattern"];
    recurrenceCustom: string | null;
    scheduledAt: Date;
    durationMinutes: number | null;
    completionMoodScore: number | null;
  }>;
  templates: Array<{
    id: string;
    title: string;
    category: PlannerActivityItem["category"];
    notes: string | null;
    defaultDurationMinutes: number | null;
    activities: Array<{
      completionMoodScore: number | null;
      completedAt: Date | null;
      scheduledAt: Date;
    }>;
  }>;
  lifeEvents: LifeEventItem[];
};

type PlannerQueryDependencies = {
  hasDatabase: boolean;
  buildMockPlannerData: (userId: string, now: Date) => PlannerData;
  preparePlannerData: (userId: string) => Promise<void>;
  loadPlannerSourceData: (userId: string, weekStart: Date, weekEnd: Date) => Promise<PlannerQuerySourceData>;
  now?: () => Date;
};

export function buildPlannerDataFromSourceData(
  sourceData: PlannerQuerySourceData,
  now = new Date()
): PlannerData {
  return buildPlannerData(
    sourceData.activities.map((activity) => mapActivity(activity, now)),
    sourceData.templates.map((template) => {
      const completionScores = template.activities
        .map((activity) => activity.completionMoodScore)
        .filter((value): value is number => value != null);
      const latestCompletedAt = template.activities.find((activity) => activity.completedAt)?.completedAt;

      return {
        templateId: template.id,
        title: template.title,
        category: template.category,
        notes: template.notes,
        defaultDurationMinutes: template.defaultDurationMinutes,
        completionCount: completionScores.length,
        totalCount: template.activities.length,
        averageMoodScore: completionScores.length
          ? Math.round(
              completionScores.reduce((sum, value) => sum + value, 0) /
                completionScores.length
            )
          : null,
        lastCompletedAtIso: latestCompletedAt?.toISOString() ?? null,
      };
    }),
    sourceData.lifeEvents,
    "database",
    now
  );
}

export async function getPlannerDataWithDependencies(
  userId: string,
  dependencies: PlannerQueryDependencies
): Promise<PlannerData> {
  const today = dependencies.now?.() ?? new Date();
  const weekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(today, { weekStartsOn: 1 });

  if (!dependencies.hasDatabase) {
    return dependencies.buildMockPlannerData(userId, today);
  }

  try {
    await dependencies.preparePlannerData(userId);
    const sourceData = await dependencies.loadPlannerSourceData(userId, weekStart, weekEnd);

    return buildPlannerDataFromSourceData(sourceData, today);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientInitializationError) {
      return dependencies.buildMockPlannerData(userId, today);
    }

    throw error;
  }
}