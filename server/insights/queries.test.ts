import assert from "node:assert/strict";
import test from "node:test";
import {
  buildInsightAnalysisSnapshotFromSourceData,
  getInsightAnalysisSnapshotWithDependencies,
  getInsightsPageDataWithDependencies,
  type InsightAnalysisSourceData,
} from "./queries";
import {
  demoUser,
  mockActivities,
  mockHabitLogs,
  mockHabits,
  mockJournalEntries,
  mockLifeEventItems,
  mockLifeEvents,
  mockMoodEntries,
} from "@/lib/data/mock-cadence";
import { buildLifeEventDayExposureRows } from "@/server/life-events/day-exposures";

function createSourceData(): InsightAnalysisSourceData {
  return {
    moodEntries: mockMoodEntries.map((entry) => ({
      ...entry,
      notes: entry.notes ?? null,
    })),
    activities: mockActivities,
    habits: mockHabits.map((habit) => ({
      ...habit,
      notes: habit.notes ?? null,
      isArchived: false,
    })),
    habitLogs: mockHabitLogs,
    journalEntries: mockJournalEntries.map((entry) => ({
      ...entry,
      title: entry.title ?? null,
      moodScore: entry.moodScore ?? null,
    })),
    lifeEvents: mockLifeEvents.map((event) => ({
      id: event.id,
      userId: event.userId,
      title: event.title,
      category: event.category,
      severityScore: event.severityScore,
      sentiment: event.sentiment ?? null,
      startAt: event.startAt,
      endAt: event.endAt ?? null,
      isOngoing: event.isOngoing,
      tags: event.tags,
    })),
    lifeEventDayExposures: buildLifeEventDayExposureRows(
      mockLifeEvents.map((event) => ({
        ...event,
        customCategoryLabel: event.customCategoryLabel ?? null,
        description: event.description ?? null,
        sentiment: event.sentiment ?? null,
        endAt: event.endAt ?? null,
        recurrenceSeriesId: null,
        source: "MANUAL" as const,
        recurrenceSeries: null,
      }))
    ).map((row) => ({
      id: `${row.lifeEventId}-${row.day.toISOString().slice(0, 10)}`,
      ...row,
    })),
  };
}

test("getInsightAnalysisSnapshotWithDependencies uses the mock builder when the database is unavailable", async () => {
  const mockSnapshot = { readiness: "EXPLORATORY_ONLY" } as Awaited<
    ReturnType<typeof getInsightAnalysisSnapshotWithDependencies>
  >;
  let invokedUserId: string | null = null;

  const result = await getInsightAnalysisSnapshotWithDependencies(demoUser.id, {
    hasDatabase: false,
    buildMockInsightAnalysisSnapshot: async (userId) => {
      invokedUserId = userId;
      return mockSnapshot;
    },
    loadInsightAnalysisSourceData: async () => {
      throw new Error("should not load database data");
    },
    loadLifeEventsContextData: async () => ({
      dataSource: "mock",
      lifeEvents: [],
      summary: {
        totalEvents: 0,
        activeEvents: 0,
        ongoingEvents: 0,
        highSeverityEvents: 0,
        negativeEvents: 0,
      },
    }),
  });

  assert.equal(result, mockSnapshot);
  assert.equal(invokedUserId, demoUser.id);
});

test("buildInsightAnalysisSnapshotFromSourceData converts loaded records into an analysis snapshot", () => {
  const sourceData = createSourceData();
  const result = buildInsightAnalysisSnapshotFromSourceData(sourceData);

  assert.ok(result.generatedAt instanceof Date);
  assert.ok(result.rows.length > 0);
  assert.ok(["NOT_ENOUGH_DATA", "EXPLORATORY_ONLY", "ACTIONABLE"].includes(result.readiness));
  assert.ok(result.summary.trackedDays >= 0);
  assert.equal(result.rows.every((row) => row.day instanceof Date), true);
});

test("getInsightsPageDataWithDependencies returns page data using the analysis snapshot and context source", async () => {
  const analysis = buildInsightAnalysisSnapshotFromSourceData(createSourceData());
  const context = {
    dataSource: "database" as const,
    lifeEvents: mockLifeEventItems,
    summary: {
      totalEvents: mockLifeEventItems.length,
      activeEvents: mockLifeEventItems.length,
      ongoingEvents: mockLifeEventItems.filter((event) => event.isOngoing).length,
      highSeverityEvents: mockLifeEventItems.filter((event) => event.severityScore >= 4).length,
      negativeEvents: mockLifeEventItems.filter((event) => event.sentiment === "NEGATIVE").length,
    },
  };

  const result = await getInsightsPageDataWithDependencies(demoUser.id, {
    hasDatabase: true,
    buildMockInsightAnalysisSnapshot: async () => analysis,
    loadInsightAnalysisSourceData: async () => createSourceData(),
    loadLifeEventsContextData: async () => context,
  });

  assert.equal(result.dataSource, "database");
  assert.equal(result.context, context);
  assert.equal(result.analysis.readiness, analysis.readiness);
  assert.deepEqual(result.analysis.summary, analysis.summary);
});