import assert from "node:assert/strict";
import test from "node:test";
import {
  buildJournalPageDataFromSourceData,
  getJournalPageDataWithDependencies,
  type JournalQuerySourceData,
} from "./queries";
import { demoUser } from "@/lib/data/mock-cadence";

function createEntry(overrides: Partial<{ id: string; day: Date; title: string | null; content: string; moodScore: number | null }> = {}) {
  return {
    id: overrides.id ?? "journal-1",
    day: overrides.day ?? new Date("2026-05-10T08:00:00.000Z"),
    title: overrides.title ?? "Check-in",
    content: overrides.content ?? "Energy and focus felt steady after a morning walk.",
    moodScore: overrides.moodScore ?? 78,
  };
}

function createSourceData(): JournalQuerySourceData {
  return {
    moodEntries: [
      {
        day: new Date("2026-05-10T08:00:00.000Z"),
        score: 80,
        moodStability: 74,
        tags: ["steady", "focus"],
        periods: [
          {
            id: "period-1",
            startMinute: 540,
            endMinute: 660,
            score: 76,
            notes: "Solid morning.",
            tags: ["morning"],
          },
        ],
      },
    ],
    activities: [
      {
        id: "activity-1",
        title: "Morning walk",
        category: "EXERCISE",
        status: "COMPLETED",
        scheduledAt: new Date("2026-05-10T07:30:00.000Z"),
        completionMoodScore: 82,
      },
    ],
    lifeEvents: [
      {
        id: "life-event-1",
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
    ],
  };
}

test("getJournalPageDataWithDependencies uses mock data when the database is unavailable", async () => {
  const mockData = {
    dataSource: "mock",
    summary: { totalEntries: 0, entriesThisWeek: 0, writingStreak: 0, averageMoodScore: null },
    latestEntry: null,
    recentEntries: [],
    weeklyVolume: [],
    storyline: null,
    storyWindows: [],
    themeArchive: [],
    insightOverlays: [],
    availableLifeEvents: [],
    promptLibrary: [],
  };

  const result = await getJournalPageDataWithDependencies(demoUser.id, {
    hasDatabase: false,
    buildMockJournalPageData: () => mockData,
    findJournalEntries: async () => {
      throw new Error("should not run");
    },
    loadJournalSourceData: async () => {
      throw new Error("should not run");
    },
  });

  assert.equal(result, mockData);
});

test("getJournalPageDataWithDependencies returns an empty database state when no entries exist", async () => {
  const result = await getJournalPageDataWithDependencies(demoUser.id, {
    hasDatabase: true,
    buildMockJournalPageData: () => {
      throw new Error("should not build mock data");
    },
    findJournalEntries: async () => [],
    loadJournalSourceData: async () => createSourceData(),
  });

  assert.equal(result.dataSource, "database");
  assert.equal(result.latestEntry, null);
  assert.equal(result.recentEntries.length, 0);
  assert.ok(result.promptLibrary.length > 0);
});

test("buildJournalPageDataFromSourceData composes entry context and storytelling from loaded records", () => {
  const result = buildJournalPageDataFromSourceData(
    "database",
    [createEntry()],
    createSourceData().moodEntries,
    createSourceData().activities,
    createSourceData().lifeEvents
  );

  assert.equal(result.dataSource, "database");
  assert.equal(result.latestEntry?.id, "journal-1");
  assert.equal(result.recentEntries.length, 1);
  assert.equal(result.latestEntry?.context.activities.length, 1);
  assert.equal(result.latestEntry?.context.lifeEvents.length, 1);
  assert.ok(result.promptLibrary.length > 0);
});