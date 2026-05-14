import assert from "node:assert/strict";
import test from "node:test";
import { format, isSameDay, subDays } from "date-fns";
import {
  buildDashboardDataFromSourceData,
  getDashboardDataWithDependencies,
  type DashboardQuerySourceData,
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

function createSourceData(): DashboardQuerySourceData {
  return {
    moodEntries: mockMoodEntries.map((entry) => ({
      ...entry,
      notes: entry.notes ?? null,
    })),
    habitLogs: mockHabitLogs.map((log) => ({
      ...log,
      habit: mockHabits.find((habit) => habit.id === log.habitId)!,
    })),
    habits: mockHabits.map((habit) => ({
      ...habit,
      notes: habit.notes ?? null,
      isArchived: false,
    })),
    activities: mockActivities.map((activity) => ({
      ...activity,
      experimentHypothesis: null,
      experimentObservationPrompt: null,
      experimentReviewWindowDays: null,
      experimentUncertaintyNote: null,
      experimentOutcome: null,
      experimentOutcomeNote: null,
      experimentReviewedAt: null,
    })),
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
    context: {
      dataSource: "mock",
      lifeEvents: mockLifeEventItems,
      summary: {
        totalEvents: mockLifeEventItems.length,
        activeEvents: mockLifeEventItems.length,
        ongoingEvents: mockLifeEventItems.filter((event) => event.isOngoing).length,
        highSeverityEvents: mockLifeEventItems.filter((event) => event.severityScore >= 4).length,
        negativeEvents: mockLifeEventItems.filter((event) => event.sentiment === "NEGATIVE").length,
      },
    },
  };
}

test("getDashboardDataWithDependencies uses the mock builder when the database is unavailable", async () => {
  const mockData = { overview: [{ label: "mock", value: "1", detail: "fallback" }] } as Awaited<
    ReturnType<typeof getDashboardDataWithDependencies>
  >;
  let receivedWindow: { start: Date; end: Date } | null | undefined;

  const result = await getDashboardDataWithDependencies(demoUser.id, {
    start: new Date("2030-05-10T11:00:00.000Z"),
    end: new Date("2030-05-12T22:00:00.000Z"),
  }, {
    hasDatabase: false,
    buildMockData: (window) => {
      receivedWindow = window;
      return mockData;
    },
    loadDashboardQuerySourceData: async () => {
      throw new Error("should not load database data");
    },
  });

  assert.equal(result, mockData);
  assert.equal(receivedWindow?.start.getFullYear(), 2030);
  assert.equal(receivedWindow?.start.getMonth(), 4);
  assert.equal(receivedWindow?.start.getDate(), 10);
  assert.equal(receivedWindow?.start.getHours(), 0);
  assert.equal(receivedWindow?.start.getMinutes(), 0);
  assert.equal(receivedWindow?.end.getFullYear(), 2030);
  assert.equal(receivedWindow?.end.getMonth(), 4);
  assert.equal(receivedWindow?.end.getDate(), 12);
  assert.equal(receivedWindow?.end.getHours(), 23);
  assert.equal(receivedWindow?.end.getMinutes(), 59);
});

test("buildDashboardDataFromSourceData applies the focus window and keeps the dashboard composition coherent", () => {
  const sourceData = createSourceData();
  const referenceNow = sourceData.moodEntries.reduce(
    (latestDay, entry) => (entry.day > latestDay ? entry.day : latestDay),
    sourceData.moodEntries[0]!.day
  );
  const focusWindow = {
    start: subDays(referenceNow, 2),
    end: referenceNow,
  };
  const expectedTodayEntry = sourceData.moodEntries.find((entry) => isSameDay(entry.day, referenceNow));

  const result = buildDashboardDataFromSourceData(demoUser.id, sourceData, focusWindow, referenceNow);

  assert.equal(result.overview.length, 4);
  assert.equal(result.overview[0]?.label, "Weekly mood average");
  assert.ok(result.moodSeries.length > 0);
  assert.ok(result.moodSeries.length <= 3);
  const quickCaptureDay = new Date(result.todayQuickCapture.dayIso);
  assert.equal(quickCaptureDay.getFullYear(), referenceNow.getFullYear());
  assert.equal(quickCaptureDay.getMonth(), referenceNow.getMonth());
  assert.equal(quickCaptureDay.getDate(), referenceNow.getDate());
  assert.equal(quickCaptureDay.getHours(), 0);
  assert.equal(quickCaptureDay.getMinutes(), 0);
  assert.equal(result.todayQuickCapture.score, expectedTodayEntry?.score ?? null);
  assert.ok(result.contextTimeline.length > 0);
  assert.ok(result.recentContext.length <= 3);
  assert.ok(["PRIMARY", "EXPLORATORY", "EMPTY"].includes(result.insightHighlightMode));
  assert.ok(result.weeklyReviewArchive.length >= 0);
  assert.ok(result.recentFeed.length <= 4);
  assert.ok(result.plannerPreview.length <= 4);
  assert.ok(result.habitsSnapshot.every((habit) => habit.progress >= 0 && habit.progress <= 100));
  assert.equal(
    result.overview[3]?.detail.includes(
      `${format(focusWindow.start, "MMM d")} - ${format(focusWindow.end, "MMM d")}`
    ),
    true
  );
});

test("buildDashboardDataFromSourceData surfaces the latest reviewed planner experiment into the weekly review", () => {
  const sourceData = createSourceData();
  const referenceNow = new Date("2026-05-10T18:00:00.000Z");
  sourceData.activities = sourceData.activities.map((activity, index) =>
    index === 0
      ? {
          ...activity,
          title: "Acceptance experiment walk",
          status: "COMPLETED",
          scheduledAt: new Date("2026-05-10T16:30:00.000Z"),
          completedAt: new Date("2026-05-10T17:15:00.000Z"),
          experimentHypothesis: "If I walk after work, the evening should settle faster.",
          experimentObservationPrompt: "Notice whether the evening feels calmer afterward.",
          experimentReviewWindowDays: 3,
          experimentUncertaintyNote: "One completion is directional, not proof.",
          experimentOutcome: "SUPPORTED" as const,
          experimentOutcomeNote: "The evening settled quickly and felt easier to manage.",
          experimentReviewedAt: new Date("2026-05-10T17:30:00.000Z"),
        }
      : activity
  );

  const result = buildDashboardDataFromSourceData(demoUser.id, sourceData, null, referenceNow);

  assert.equal(result.weeklyReview.plannerSuggestion.supportStateLabel, "Supported");
  assert.match(result.weeklyReview.plannerSuggestion.supportStateDetail, /settled quickly/i);
});

test("buildDashboardDataFromSourceData excludes future activities from the default completion denominator", () => {
  const sourceData = createSourceData();
  const referenceNow = new Date("2026-05-10T18:00:00.000Z");

  sourceData.activities = [
    {
      ...sourceData.activities[0]!,
      title: "Completed walk",
      scheduledAt: new Date("2026-05-09T09:00:00.000Z"),
      status: "COMPLETED",
      completedAt: new Date("2026-05-09T09:45:00.000Z"),
    },
    {
      ...sourceData.activities[1]!,
      title: "Future stretch",
      scheduledAt: new Date("2026-05-11T09:00:00.000Z"),
      status: "PLANNED",
      completedAt: null,
    },
  ];

  const result = buildDashboardDataFromSourceData(demoUser.id, sourceData, null, referenceNow);

  assert.equal(result.overview[2]?.label, "Activity completion");
  assert.equal(result.overview[2]?.value, "100%");
  assert.equal(result.overview[2]?.detail, "1 of 1 planned activities done");
});