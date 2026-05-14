import { Prisma } from "@prisma/client";
import type { LifeEventsContextData } from "@/features/life-events/types";
import {
  demoUser,
  getMockScenarioData,
} from "@/lib/data/mock-cadence";
import { defaultMockScenario, type MockScenarioKey } from "@/lib/data/mock-scenarios";
import { db, hasDatabaseUrl } from "@/lib/db";
import {
  getAnalyticsLifeEvents,
  getAnalyticsLifeEventDayExposures,
} from "@/server/life-events/queries";
import { buildLifeEventDayExposureRows } from "@/server/life-events/day-exposures";
import {
  buildMockLifeEventRecordsFromEvents,
  buildLifeEventsContextData,
  getLifeEventsContextDataWithDependencies,
  type LifeEventDayExposureRecord,
  type LifeEventRecord,
} from "@/server/life-events/query-service";
import { buildInsightAnalysisSnapshot } from "@/server/insights/analysis";
import type { InsightsPageData } from "@/features/insights/types";
import type { InsightAnalysisSnapshot } from "@/server/insights/types";

export function buildMockInsightLifeEventDayExposures(
  scenario: MockScenarioKey = defaultMockScenario
) {
  return buildLifeEventDayExposureRows(
    buildMockLifeEventRecordsFromEvents(getMockScenarioData(scenario).lifeEvents)
  ).map((row) => ({
    id: `${row.lifeEventId}-${row.day.toISOString().slice(0, 10)}`,
    ...row,
  }));
}

export function buildMockInsightsContextData(
  scenario: MockScenarioKey = defaultMockScenario
): LifeEventsContextData {
  return buildLifeEventsContextData(
    "mock",
    buildMockLifeEventRecordsFromEvents(getMockScenarioData(scenario).lifeEvents)
  );
}

async function loadLifeEventsContextDataForScenario(
  userId: string,
  scenario: MockScenarioKey = defaultMockScenario
) {
  return getLifeEventsContextDataWithDependencies(userId, {
    hasLifeEventDatabase: hasDatabaseUrl && Boolean(db?.lifeEvent),
    hasExposureDatabase: hasDatabaseUrl && Boolean(db?.lifeEventDayExposure),
    buildMockLifeEventRecords: () => buildMockLifeEventRecordsFromEvents(getMockScenarioData(scenario).lifeEvents),
    findLifeEventRecords: async (currentUserId) => {
      return (await db!.lifeEvent.findMany({
        where: { userId: currentUserId },
        include: {
          recurrenceSeries: {
            select: {
              title: true,
              recurrencePattern: true,
              recurrenceInterval: true,
              recurrenceRule: true,
            },
          },
        },
        orderBy: [{ startAt: "desc" }, { updatedAt: "desc" }],
        take: 40,
      })) as LifeEventRecord[];
    },
    findLifeEventDayExposureRecords: async (currentUserId) => {
      return (await db!.lifeEventDayExposure.findMany({
        where: { userId: currentUserId },
        orderBy: [{ day: "asc" }],
        take: 180,
      })) as LifeEventDayExposureRecord[];
    },
  });
}

async function buildMockInsightAnalysisSnapshot(
  scenario: MockScenarioKey = defaultMockScenario
) {
  const scenarioData = getMockScenarioData(scenario);
  return buildInsightAnalysisSnapshot({
    activities: scenarioData.activities,
    habits: scenarioData.habits,
    habitLogs: scenarioData.habitLogs,
    journalEntries: scenarioData.journalEntries,
    moodEntries: scenarioData.moodEntries,
    lifeEvents: scenarioData.lifeEvents,
    lifeEventDayExposures: buildMockInsightLifeEventDayExposures(scenario),
  });
}

async function loadInsightAnalysisSourceData(userId: string) {
  const [moodEntries, activities, habits, habitLogs, journalEntries, lifeEvents, lifeEventDayExposures] = await Promise.all([
    db!.moodEntry.findMany({
      where: { userId },
      include: { periods: { orderBy: { startMinute: "asc" } } },
      orderBy: { day: "asc" },
      take: 30,
    }),
    db!.activity.findMany({ where: { userId }, orderBy: { scheduledAt: "asc" }, take: 120 }),
    db!.habit.findMany({ where: { userId, isArchived: false } }),
    db!.habitLog.findMany({ where: { userId }, orderBy: { day: "asc" }, take: 120 }),
    db!.journalEntry.findMany({ where: { userId }, orderBy: { day: "asc" }, take: 60 }),
    getAnalyticsLifeEvents(userId),
    getAnalyticsLifeEventDayExposures(userId),
  ]);

  return {
    moodEntries,
    activities,
    habits,
    habitLogs,
    journalEntries,
    lifeEvents,
    lifeEventDayExposures,
  };
}

export type InsightAnalysisSourceData = Awaited<ReturnType<typeof loadInsightAnalysisSourceData>>;

type InsightQueryDependencies = {
  hasDatabase: boolean;
  buildMockInsightAnalysisSnapshot: (userId: string) => Promise<InsightAnalysisSnapshot>;
  loadInsightAnalysisSourceData: (userId: string) => Promise<InsightAnalysisSourceData>;
  loadLifeEventsContextData: (userId: string) => Promise<InsightsPageData["context"]>;
};

function isRecoverablePrismaError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  );
}

export function buildInsightAnalysisSnapshotFromSourceData(sourceData: InsightAnalysisSourceData) {
  return buildInsightAnalysisSnapshot({
    activities: sourceData.activities,
    habits: sourceData.habits,
    habitLogs: sourceData.habitLogs,
    journalEntries: sourceData.journalEntries,
    lifeEvents: sourceData.lifeEvents,
    lifeEventDayExposures: sourceData.lifeEventDayExposures,
    moodEntries: sourceData.moodEntries.map((entry) => ({
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
}

export async function getInsightAnalysisSnapshotWithDependencies(
  userId = demoUser.id,
  dependencies: InsightQueryDependencies = {
    hasDatabase: hasDatabaseUrl,
    buildMockInsightAnalysisSnapshot: async () => buildMockInsightAnalysisSnapshot(),
    loadInsightAnalysisSourceData,
    loadLifeEventsContextData: (currentUserId) => loadLifeEventsContextDataForScenario(currentUserId),
  }
) {
  if (!dependencies.hasDatabase) {
    return dependencies.buildMockInsightAnalysisSnapshot(userId);
  }

  try {
    const sourceData = await dependencies.loadInsightAnalysisSourceData(userId);

    return buildInsightAnalysisSnapshotFromSourceData(sourceData);
  } catch (error) {
    if (isRecoverablePrismaError(error)) {
      return dependencies.buildMockInsightAnalysisSnapshot(userId);
    }

    throw error;
  }
}

export async function getInsightAnalysisSnapshot(
  userId = demoUser.id,
  scenario: MockScenarioKey = defaultMockScenario
) {
  return getInsightAnalysisSnapshotWithDependencies(userId, {
    hasDatabase: hasDatabaseUrl,
    buildMockInsightAnalysisSnapshot: async () => buildMockInsightAnalysisSnapshot(scenario),
    loadInsightAnalysisSourceData,
    loadLifeEventsContextData: (currentUserId) => loadLifeEventsContextDataForScenario(currentUserId, scenario),
  });
}

export async function getInsightsPageDataWithDependencies(
  userId = demoUser.id,
  dependencies: InsightQueryDependencies = {
    hasDatabase: hasDatabaseUrl,
    buildMockInsightAnalysisSnapshot: async () => buildMockInsightAnalysisSnapshot(),
    loadInsightAnalysisSourceData,
    loadLifeEventsContextData: (currentUserId) => loadLifeEventsContextDataForScenario(currentUserId),
  }
): Promise<InsightsPageData> {
  const [analysis, context] = await Promise.all([
    getInsightAnalysisSnapshotWithDependencies(userId, dependencies),
    dependencies.loadLifeEventsContextData(userId),
  ]);

  return {
    dataSource: context.dataSource,
    analysis,
    context,
  };
}

export async function getInsightsPageData(
  userId = demoUser.id,
  scenario: MockScenarioKey = defaultMockScenario
): Promise<InsightsPageData> {
  return getInsightsPageDataWithDependencies(userId, {
    hasDatabase: hasDatabaseUrl,
    buildMockInsightAnalysisSnapshot: async () => buildMockInsightAnalysisSnapshot(scenario),
    loadInsightAnalysisSourceData,
    loadLifeEventsContextData: (currentUserId) => loadLifeEventsContextDataForScenario(currentUserId, scenario),
  });
}