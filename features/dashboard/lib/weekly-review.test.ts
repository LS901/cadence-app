import assert from "node:assert/strict";
import test from "node:test";
import { buildWeeklyReview, buildWeeklyReviewArchiveItem } from "./weekly-review";

test("buildWeeklyReview returns an empty-state synthesis when there is no weekly mood baseline", () => {
  const review = buildWeeklyReview({
    recentMoodCount: 0,
    weeklyAverage: null,
    previousAverage: null,
    topInsight: null,
    strongestContext: null,
    weakestHabit: null,
    completedActivities: 0,
    totalActivities: 0,
    journalCount: 0,
  });

  assert.equal(review.title, "No weekly synthesis yet");
  assert.match(review.nextStep, /dashboard check-in/i);
  assert.equal(review.plannerSuggestion.title, "Weekly experiment");
  assert.equal(review.plannerSuggestion.recurring, false);
  assert.equal(review.plannerSuggestion.historyAnchorTitle, null);
});

test("buildWeeklyReview prioritizes the weakest habit as the next step when weekly data exists", () => {
  const review = buildWeeklyReview({
    recentMoodCount: 7,
    weeklyAverage: 76,
    previousAverage: 69,
    topInsight: {
      title: "Exercise improves baseline mood",
      summary: "Days containing movement average higher mood than low-movement days.",
      evidenceLabel: "Supported pattern",
    },
    strongestContext: {
      title: "Travel disruption",
      severityLabel: "Moderate",
      sentimentLabel: "Mixed",
    },
    weakestHabit: {
      name: "Morning walk",
      progress: 43,
      type: "POSITIVE",
    },
    completedActivities: 3,
    totalActivities: 5,
    journalCount: 2,
  });

  assert.equal(review.title, "The week moved upward");
  assert.match(review.nextStep, /morning walk/i);
  assert.match(review.signalDetail, /supported pattern/i);
  assert.equal(review.plannerSuggestion.title, "Protect Morning walk");
  assert.equal(review.plannerSuggestion.historyAnchorTitle, "Morning walk");
  assert.equal(review.plannerSuggestion.category, "EXERCISE");
  assert.equal(review.plannerSuggestion.recurring, true);
  assert.equal(review.plannerSuggestion.recurrencePattern, "WEEKLY");
});

test("buildWeeklyReviewArchiveItem returns a compact archive record from a weekly review", () => {
  const archiveItem = buildWeeklyReviewArchiveItem("Apr 27 - May 3", {
    recentMoodCount: 7,
    weeklyAverage: 74,
    previousAverage: 70,
    topInsight: null,
    strongestContext: null,
    weakestHabit: null,
    completedActivities: 4,
    totalActivities: 5,
    journalCount: 2,
  });

  assert.equal(archiveItem.weekLabel, "Apr 27 - May 3");
  assert.equal(archiveItem.title, "The week stayed broadly steady");
  assert.match(archiveItem.summary, /74\/100/i);
});