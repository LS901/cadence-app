import assert from "node:assert/strict";
import test from "node:test";
import { isSameDay } from "date-fns";
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
    activities: mockActivities,
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
  const focusWindow = {
    start: new Date("2026-05-08T10:00:00.000Z"),
    end: new Date("2026-05-10T22:00:00.000Z"),
  };
  const referenceNow = new Date("2026-05-10T18:00:00.000Z");
  const expectedTodayEntry = sourceData.moodEntries.find((entry) => isSameDay(entry.day, referenceNow));

  const result = buildDashboardDataFromSourceData(demoUser.id, sourceData, focusWindow, referenceNow);

  assert.equal(result.overview.length, 4);
  assert.equal(result.overview[0]?.label, "Weekly mood average");
  assert.ok(result.moodSeries.length > 0);
  assert.ok(result.moodSeries.length <= 3);
  const quickCaptureDay = new Date(result.todayQuickCapture.dayIso);
  assert.equal(quickCaptureDay.getFullYear(), 2026);
  assert.equal(quickCaptureDay.getMonth(), 4);
  assert.equal(quickCaptureDay.getDate(), 10);
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
    result.overview[3]?.detail.includes("May 8 - May 10"),
    true
  );
});