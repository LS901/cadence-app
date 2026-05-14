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
    recentExperiment: null,
  });

  assert.equal(review.title, "No weekly synthesis yet");
  assert.match(review.nextStep, /dashboard check-in/i);
  assert.equal(review.plannerSuggestion.title, "Weekly experiment");
  assert.equal(review.plannerSuggestion.recurring, false);
  assert.equal(review.plannerSuggestion.historyAnchorTitle, null);
  assert.equal(review.plannerSuggestion.reviewWindowDays, 3);
  assert.match(review.plannerSuggestion.uncertaintyNote, /lightweight experiment/i);
  assert.equal(review.plannerSuggestion.supportStateLabel, "Pending test");
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
    recentExperiment: null,
  });

  assert.equal(review.title, "The week moved upward");
  assert.match(review.nextStep, /morning walk/i);
  assert.match(review.signalDetail, /supported pattern/i);
  assert.equal(review.plannerSuggestion.title, "Protect Morning walk");
  assert.equal(review.plannerSuggestion.historyAnchorTitle, "Morning walk");
  assert.equal(review.plannerSuggestion.category, "EXERCISE");
  assert.equal(review.plannerSuggestion.recurring, true);
  assert.equal(review.plannerSuggestion.recurrencePattern, "WEEKLY");
  assert.equal(review.plannerSuggestion.reviewWindowDays, 7);
  assert.match(review.plannerSuggestion.hypothesis, /protect morning walk/i);
  assert.match(review.plannerSuggestion.notes, /What to notice:/i);
  assert.match(review.plannerSuggestion.supportStateDetail, /complete the planned activity/i);
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
    recentExperiment: null,
  });

  assert.equal(archiveItem.weekLabel, "Apr 27 - May 3");
  assert.equal(archiveItem.title, "The week stayed broadly steady");
  assert.match(archiveItem.summary, /74\/100/i);
  assert.match(archiveItem.momentumDetail, /moved only/i);
  assert.match(archiveItem.signalDetail, /planned activities/i);
  assert.match(archiveItem.contextDetail, /No major life event/i);
});

test("buildWeeklyReview surfaces the most recent tested-support outcome when an experiment has been reviewed", () => {
  const review = buildWeeklyReview({
    recentMoodCount: 7,
    weeklyAverage: 73,
    previousAverage: 70,
    topInsight: {
      title: "Evening walk steadies the baseline",
      summary: "Days with a walk after work tend to end with less strain.",
      evidenceLabel: "Emerging pattern",
    },
    strongestContext: null,
    weakestHabit: null,
    completedActivities: 4,
    totalActivities: 5,
    journalCount: 1,
    recentExperiment: {
      title: "Evening walk",
      outcome: "SUPPORTED",
      note: "The rest of the evening felt calmer and easier to settle into.",
    },
  });

  assert.equal(review.plannerSuggestion.supportStateLabel, "Supported");
  assert.match(review.plannerSuggestion.supportStateDetail, /evening felt calmer/i);
  assert.match(review.nextStep, /repeat evening walk/i);
});