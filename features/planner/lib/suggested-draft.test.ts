import assert from "node:assert/strict";
import test from "node:test";
import {
  getSuggestedDraftHistoryMatch,
  getSuggestedDraftScheduledAt,
} from "./suggested-draft";

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