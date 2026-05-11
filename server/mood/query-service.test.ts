import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMoodPageDataFromSource,
  getMoodPageDataWithDependencies,
  type MoodEntryRecord,
} from "./query-service";
import { demoUser } from "@/lib/data/mock-cadence";
import type { InsightAnalysisSnapshot } from "@/server/insights/types";
import type { LifeEventsContextData } from "@/features/life-events/types";

function createEntry(overrides: Partial<MoodEntryRecord> = {}): MoodEntryRecord {
  return {
    id: overrides.id ?? "entry-1",
    day: overrides.day ?? new Date("2026-05-10T08:00:00.000Z"),
    updatedAt: overrides.updatedAt ?? new Date("2026-05-10T09:00:00.000Z"),
    score: overrides.score ?? 78,
    energy: overrides.energy ?? 74,
    stress: overrides.stress ?? 30,
    sleepHours: overrides.sleepHours ?? 7.5,
    sleepQuality: overrides.sleepQuality ?? 4,
    workStress: overrides.workStress ?? 2,
    socialQuality: overrides.socialQuality ?? 4,
    moodStability: overrides.moodStability ?? 72,
    notes: overrides.notes ?? null,
    tags: overrides.tags ?? ["steady"],
    reflectionCompletedAt: overrides.reflectionCompletedAt ?? new Date("2026-05-10T20:00:00.000Z"),
    periods: overrides.periods ?? [
      {
        id: "period-1",
        startMinute: 540,
        endMinute: 660,
        score: 75,
        notes: null,
        tags: ["morning"],
      },
    ],
  };
}

function createInsightSnapshot(): InsightAnalysisSnapshot {
  return {
    generatedAt: new Date("2026-05-10T12:00:00.000Z"),
    rows: [],
    candidates: [
      {
        id: "insight-1",
        title: "Sleep steadies mood",
        summary: "Longer sleep tracks with steadier mood.",
        evidenceLevel: "SUPPORTED",
        evidenceLabel: "Supported",
        evidenceSummary: "Strong enough pattern.",
        adjustmentSummary: "Adjusted for context.",
        metric: "SLEEP_TO_MOOD",
        direction: "POSITIVE",
        strength: 0.6,
        rawStrength: 0.6,
        adjustedStrength: 0.6,
        confidence: 0.8,
        rawConfidence: 0.8,
        adjustedConfidence: 0.8,
        lagDays: 0,
        sampleSize: 10,
        exposedDayCount: 5,
        alignedDayCount: 4,
        confoundedExposedDayCount: 1,
        uncertaintySummary: "Some uncertainty remains.",
        payload: {},
      },
    ],
    exploratoryCandidates: [],
    readiness: "ACTIONABLE",
    nullState: null,
    summary: {
      trackedDays: 10,
      minimumReliableDays: 7,
      supportedSignals: 1,
      emergingSignals: 0,
      exploratorySignals: 0,
      visibleLagDays: [0],
    },
  };
}

function createContextData(): LifeEventsContextData {
  return {
    dataSource: "database",
    lifeEvents: [
      {
        id: "life-event-in-window",
        title: "Travel day",
        category: "TRAVEL",
        categoryLabel: "Travel",
        customCategoryLabel: null,
        description: null,
        severityScore: 3,
        severityLabel: "Heavy",
        sentiment: "MIXED",
        sentimentLabel: "Mixed",
        startAtIso: "2026-05-10T06:00:00.000Z",
        endAtIso: "2026-05-10T18:00:00.000Z",
        isOngoing: false,
        source: "MANUAL",
        isRecurring: false,
        recurrencePattern: null,
        recurrenceInterval: null,
        recurrenceRule: null,
        recurrenceLabel: null,
        seriesTitle: null,
        tags: ["travel"],
        windowLabel: "May 10, 2026 · 6:00 AM to 6:00 PM",
      },
      {
        id: "life-event-outside-window",
        title: "Outside window",
        category: "OTHER",
        categoryLabel: "Other",
        customCategoryLabel: null,
        description: null,
        severityScore: 2,
        severityLabel: "Noticeable",
        sentiment: "NEUTRAL",
        sentimentLabel: "Context only",
        startAtIso: "2026-05-07T06:00:00.000Z",
        endAtIso: "2026-05-07T08:00:00.000Z",
        isOngoing: false,
        source: "MANUAL",
        isRecurring: false,
        recurrencePattern: null,
        recurrenceInterval: null,
        recurrenceRule: null,
        recurrenceLabel: null,
        seriesTitle: null,
        tags: ["other"],
        windowLabel: "May 7, 2026 · 6:00 AM to 8:00 AM",
      },
    ],
    summary: {
      totalEvents: 2,
      activeEvents: 1,
      ongoingEvents: 0,
      highSeverityEvents: 0,
      negativeEvents: 0,
    },
  };
}

test("getMoodPageDataWithDependencies uses mock data when the database is unavailable", async () => {
  const mockData = {
    dataSource: "mock",
    todayEntry: null,
    recentEntries: [],
    moodSeries: [],
    contextTimeline: [],
    currentEntryContext: [],
    recentContext: [],
    insightHighlights: [],
    insightHighlightMode: "EMPTY",
    insightNullState: null,
  };

  const result = await getMoodPageDataWithDependencies(demoUser.id, null, {
    hasDatabase: false,
    buildMockMoodPageData: () => mockData,
    findMoodEntries: async () => {
      throw new Error("should not run");
    },
    getInsightSnapshot: async () => {
      throw new Error("should not run");
    },
    getLifeEventsContextData: async () => {
      throw new Error("should not run");
    },
  });

  assert.equal(result, mockData);
});

test("getMoodPageDataWithDependencies returns an empty database state when no entries exist", async () => {
  const result = await getMoodPageDataWithDependencies(demoUser.id, null, {
    hasDatabase: true,
    buildMockMoodPageData: () => {
      throw new Error("should not build mock data");
    },
    findMoodEntries: async () => [],
    getInsightSnapshot: async () => createInsightSnapshot(),
    getLifeEventsContextData: async () => createContextData(),
  });

  assert.equal(result.dataSource, "database");
  assert.equal(result.recentEntries.length, 0);
  assert.equal(result.insightHighlightMode, "EMPTY");
});

test("buildMoodPageDataFromSource applies the focus window and context filters coherently", () => {
  const now = new Date("2026-05-10T12:00:00.000Z");
  const result = buildMoodPageDataFromSource(
    [
      createEntry({
        id: "entry-before-window",
        day: new Date("2026-05-09T08:00:00.000Z"),
        updatedAt: new Date("2026-05-09T09:00:00.000Z"),
        reflectionCompletedAt: new Date("2026-05-09T20:00:00.000Z"),
      }),
      createEntry({ id: "entry-in-window" }),
    ],
    createInsightSnapshot(),
    createContextData(),
    {
      start: new Date("2026-05-10T00:00:00.000Z"),
      end: new Date("2026-05-10T23:59:59.000Z"),
    },
    now
  );

  assert.equal(result.dataSource, "database");
  assert.equal(result.todayEntry?.id, "entry-in-window");
  assert.equal(result.recentEntries.length, 1);
  assert.equal(result.recentEntries[0]?.id, "entry-in-window");
  assert.equal(result.recentContext.length, 1);
  assert.equal(result.currentEntryContext.length, 1);
  assert.equal(result.contextTimeline.length, 1);
  assert.equal(result.insightHighlightMode, "PRIMARY");
});