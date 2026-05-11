import assert from "node:assert/strict";
import test from "node:test";
import {
  buildRecurringOccurrences,
  RECURRING_OCCURRENCE_LIMIT,
} from "./life-event-recurrence";

const basePayload = {
  title: "Weekly therapy",
  category: "OTHER" as const,
  customCategoryLabel: null,
  description: "Standing support session",
  severityScore: 3,
  sentiment: "POSITIVE" as const,
  startAt: new Date("2026-05-01T09:00:00.000Z"),
  endAt: new Date("2026-05-01T10:30:00.000Z"),
  isOngoing: false,
  tags: ["support"],
};

test("buildRecurringOccurrences preserves event duration and respects the generation limit", () => {
  const occurrences = buildRecurringOccurrences({
    userId: "user-1",
    recurrenceSeriesId: "series-1",
    payload: basePayload,
    recurrenceConfig: {
      pattern: "DAILY",
      interval: 1,
      rule: null,
    },
  });

  assert.equal(occurrences.length, RECURRING_OCCURRENCE_LIMIT);
  assert.equal(occurrences[0]?.startAt.toISOString(), "2026-05-02T09:00:00.000Z");
  assert.equal(occurrences[0]?.endAt?.toISOString(), "2026-05-02T10:30:00.000Z");
  assert.equal(occurrences.at(-1)?.startAt.toISOString(), "2026-05-17T09:00:00.000Z");
  assert.ok(occurrences.every((occurrence) => occurrence.source === "RECURRING_GENERATED"));
  assert.ok(occurrences.every((occurrence) => occurrence.isOngoing === false));
});

test("buildRecurringOccurrences does not auto-generate future events for custom recurrence rules", () => {
  const occurrences = buildRecurringOccurrences({
    userId: "user-1",
    recurrenceSeriesId: "series-1",
    payload: basePayload,
    recurrenceConfig: {
      pattern: "CUSTOM",
      interval: 1,
      rule: "Every second Tuesday",
    },
  });

  assert.deepEqual(occurrences, []);
});