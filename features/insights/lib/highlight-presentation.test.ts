import assert from "node:assert/strict";
import test from "node:test";
import {
  formatInsightEvidenceLine,
  getInsightSurfacePresentation,
} from "./highlight-presentation";

test("dashboard exploratory trust state keeps the stronger warning label", () => {
  const presentation = getInsightSurfacePresentation({
    surface: "dashboard",
    mode: "EXPLORATORY",
    nullState: null,
  });

  assert.deepEqual(presentation, {
    exploratoryBadgeLabel: "Exploratory only",
    emptyDescription:
      "Insight highlights will appear here once Cadence has enough stable data to compare behavior and mood.",
    emptyRecommendation: null,
  });
});

test("mood exploratory trust state preserves the softer watch wording", () => {
  const presentation = getInsightSurfacePresentation({
    surface: "mood",
    mode: "EXPLORATORY",
    nullState: null,
  });

  assert.equal(presentation.exploratoryBadgeLabel, "Watch, don’t trust yet");
});

test("planner empty trust state respects provided null-state guidance", () => {
  const presentation = getInsightSurfacePresentation({
    surface: "planner",
    mode: "EMPTY",
    nullState: {
      title: "Signals exist, but they are still exploratory",
      description: "The current week is still too sparse to trust.",
      recommendation: "Keep logging before using these patterns to plan around.",
    },
  });

  assert.deepEqual(presentation, {
    exploratoryBadgeLabel: null,
    emptyDescription: "The current week is still too sparse to trust.",
    emptyRecommendation: "Keep logging before using these patterns to plan around.",
  });
});

test("evidence line formatting stays stable across lightweight surfaces", () => {
  assert.equal(
    formatInsightEvidenceLine({
      alignedDayCount: 4,
      exposedDayCount: 6,
      sampleSize: 8,
      uncertaintySummary: "This is still early and should not drive decisions yet.",
    }),
    "4 of 8 relevant days align. This is still early and should not drive decisions yet."
  );
});