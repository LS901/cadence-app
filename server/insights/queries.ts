import { Prisma } from "@prisma/client";
import {
  demoUser,
  mockActivities,
  mockHabitLogs,
  mockHabits,
  mockJournalEntries,
  mockLifeEvents,
  mockMoodEntries,
} from "@/lib/data/mock-cadence";
import { db, hasDatabaseUrl } from "@/lib/db";
import {
  getAnalyticsLifeEventDayExposures,
  getAnalyticsLifeEvents,
  getLifeEventsContextData,
} from "@/server/life-events/queries";
import { buildInsightAnalysisSnapshot } from "@/server/insights/analysis";
import type { InsightsPageData } from "@/features/insights/types";
import type { InsightAnalysisSnapshot } from "@/server/insights/types";

async function buildMockInsightAnalysisSnapshot(userId = demoUser.id) {
  return buildInsightAnalysisSnapshot({
    activities: mockActivities,
    habits: mockHabits,
    habitLogs: mockHabitLogs,
    journalEntries: mockJournalEntries,
    moodEntries: mockMoodEntries,
    lifeEvents: mockLifeEvents,
    lifeEventDayExposures: await getAnalyticsLifeEventDayExposures(userId),
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
    buildMockInsightAnalysisSnapshot,
    loadInsightAnalysisSourceData,
    loadLifeEventsContextData: getLifeEventsContextData,
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

export async function getInsightAnalysisSnapshot(userId = demoUser.id) {
  return getInsightAnalysisSnapshotWithDependencies(userId);
}

export async function getInsightsPageDataWithDependencies(
  userId = demoUser.id,
  dependencies: InsightQueryDependencies = {
    hasDatabase: hasDatabaseUrl,
    buildMockInsightAnalysisSnapshot,
    loadInsightAnalysisSourceData,
    loadLifeEventsContextData: getLifeEventsContextData,
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

export async function getInsightsPageData(userId = demoUser.id): Promise<InsightsPageData> {
  return getInsightsPageDataWithDependencies(userId);
}