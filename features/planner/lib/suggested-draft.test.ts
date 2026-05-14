import assert from "node:assert/strict";
import test from "node:test";
import {
  getSuggestedDraftFromWeeklyReview,
  getSuggestedDraftHistoryMatch,
  getSuggestedDraftScheduledAt,
} from "./suggested-draft";

test("getSuggestedDraftFromWeeklyReview maps the weekly review suggestion into a planner draft", () => {
  const draft = getSuggestedDraftFromWeeklyReview({
    title: "Weekly review",
    summary: "A review summary.",
    momentumLabel: "Momentum",
    momentumDetail: "Momentum detail.",
    signalLabel: "Signal",
    signalDetail: "Signal detail.",
    contextLabel: "Context",
    contextDetail: "Context detail.",
    nextStep: "Next step.",
    plannerSuggestion: {
      title: "Protect Morning walk",
      historyAnchorTitle: "Morning walk",
      category: "EXERCISE",
      notes: "Protect it earlier in the week.",
      hypothesis: "If the walk stays protected, the baseline should steady sooner.",
      observationPrompt: "Notice whether the morning starts less defended.",
      reviewWindowDays: 7,
      uncertaintyNote: "Treat this as a lightweight experiment.",
      supportStateLabel: "Pending test",
      supportStateDetail: "Support appears only after follow-through.",
      durationMinutes: 45,
      recurring: true,
      recurrencePattern: "WEEKLY",
    },
  });

  assert.deepEqual(draft, {
    title: "Protect Morning walk",
    historyAnchorTitle: "Morning walk",
    category: "EXERCISE",
    notes: "Protect it earlier in the week.",
    hypothesis: "If the walk stays protected, the baseline should steady sooner.",
    observationPrompt: "Notice whether the morning starts less defended.",
    reviewWindowDays: "7",
    uncertaintyNote: "Treat this as a lightweight experiment.",
    durationMinutes: "45",
    recurring: true,
    recurrencePattern: "WEEKLY",
  });
});

test("getSuggestedDraftHistoryMatch finds a history item by the review anchor title", () => {
  const match = getSuggestedDraftHistoryMatch(
    {
      title: "Protect Morning walk",
      historyAnchorTitle: "Morning walk",
      category: "EXERCISE",
      notes: "Protect it earlier in the week.",
      durationMinutes: "45",
      recurring: true,
      recurrencePattern: "WEEKLY",
    },
    [
      {
        templateId: "template-1",
        title: "Morning walk",
        category: "EXERCISE",
        totalCount: 5,
        completionCount: 5,
        averageMoodScore: 78,
        lastCompletedAtIso: "2026-05-06T07:30:00.000Z",
      },
    ]
  );

  assert.equal(match?.templateId, "template-1");
});

test("getSuggestedDraftScheduledAt reuses the next future weekday and time from history", () => {
  const scheduledAt = getSuggestedDraftScheduledAt(
    {
      title: "Protect Morning walk",
      historyAnchorTitle: "Morning walk",
      category: "EXERCISE",
      notes: "Protect it earlier in the week.",
      durationMinutes: "45",
      recurring: true,
      recurrencePattern: "WEEKLY",
    },
    [
      {
        templateId: "template-1",
        title: "Morning walk",
        category: "EXERCISE",
        totalCount: 5,
        completionCount: 5,
        averageMoodScore: 78,
        lastCompletedAtIso: "2026-05-06T07:30:00.000Z",
      },
    ],
    new Date("2026-05-10T12:00:00.000Z")
  );

  assert.equal(scheduledAt?.toISOString(), "2026-05-13T07:30:00.000Z");
});