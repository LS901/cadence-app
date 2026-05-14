import assert from "node:assert/strict";
import test from "node:test";
import { endOfDay, startOfDay, subDays } from "date-fns";
import {
  buildMockDashboardData,
  getMockScenarioData,
  getLatestMockMoodEntry,
  getMockPlannerItems,
  mockJournalEntries,
  mockMoodEntries,
} from "@/lib/data/mock-cadence";

test("buildMockDashboardData falls back to the default dashboard slice for an invalid focus window", () => {
  const result = buildMockDashboardData({
    start: new Date("2026-05-12T10:00:00.000Z"),
    end: new Date("2026-05-10T10:00:00.000Z"),
  });

  assert.equal(result.moodSeries.length, 7);
  assert.equal(result.overview[3]?.detail, "Daily journaling streak is holding steady");
  assert.match(result.overview[3]?.value ?? "", /days$/i);
});

test("buildMockDashboardData scopes journal summary details when a valid focus window is provided", () => {
  const focusWindow = {
    start: new Date("2026-05-08T10:00:00.000Z"),
    end: new Date("2026-05-10T22:00:00.000Z"),
  };
  const expectedJournalCount = mockJournalEntries.filter((entry) => {
    const day = entry.day;

    return day >= startOfDay(focusWindow.start) && day <= endOfDay(focusWindow.end);
  }).length;

  const result = buildMockDashboardData(focusWindow);

  assert.equal(result.overview[3]?.value, `${expectedJournalCount} entries`);
  assert.match(result.overview[3]?.detail ?? "", /Journal entries inside May 8 - May 10/i);
  assert.ok(result.moodSeries.length <= 3);
});

test("getMockPlannerItems returns chronologically sorted items and marks today", () => {
  const items = getMockPlannerItems();

  assert.ok(items.length > 0);

  for (let index = 1; index < items.length; index += 1) {
    assert.ok(items[index - 1]!.scheduledAt.getTime() <= items[index]!.scheduledAt.getTime());
  }

  const todayItem = items.find((item) => item.isToday);
  assert.ok(todayItem);
  assert.match(todayItem?.formattedDay ?? "", /,/);
  assert.match(todayItem?.formattedTime ?? "", /\d/);
});

test("getLatestMockMoodEntry returns the newest mock mood entry", () => {
  assert.equal(getLatestMockMoodEntry()?.id, mockMoodEntries.at(-1)?.id ?? null);
  assert.equal(getLatestMockMoodEntry()?.day.getTime(), mockMoodEntries.at(-1)?.day.getTime() ?? subDays(new Date(), 1).getTime());
});

test("buildMockDashboardData can switch to the alternate seeded scenario", () => {
  const result = buildMockDashboardData(null, "alternate");
  const alternateScenario = getMockScenarioData("alternate");

  assert.equal(result.recentContext[0]?.title, alternateScenario.lifeEventItems[0]?.title);
  assert.match(result.weeklyReview.signalDetail, /sleep|quiet|overload/i);
  assert.ok(result.weeklyReviewArchive.length > 0);
});