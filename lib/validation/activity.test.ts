import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import {
  normalizeActivityFormValues,
  normalizeActivityStatusMutation,
} from "./activity";

function createFormInput() {
  return {
    title: "  Evening walk  ",
    category: "EXERCISE",
    notes: "  Clear my head after work.  ",
    recurring: false,
    recurrencePattern: "",
    recurrenceCustom: "",
    scheduledAt: "2030-05-10T18:30:00.000Z",
    durationMinutes: "45",
    completionMoodScore: "72",
    entryMode: "PLANNED",
  };
}

test("normalizeActivityFormValues parses trimmed values and optional integers", () => {
  const parsed = normalizeActivityFormValues(createFormInput());

  assert.equal(parsed.title, "Evening walk");
  assert.equal(parsed.notes, "Clear my head after work.");
  assert.equal(parsed.recurring, false);
  assert.equal(parsed.recurrencePattern, undefined);
  assert.equal(parsed.recurrenceCustom, undefined);
  assert.equal(parsed.scheduledAt.toISOString(), "2030-05-10T18:30:00.000Z");
  assert.equal(parsed.durationMinutes, 45);
  assert.equal(parsed.completionMoodScore, 72);
});

test("normalizeActivityFormValues requires a recurrence pattern for recurring activities", () => {
  assert.throws(
    () =>
      normalizeActivityFormValues({
        ...createFormInput(),
        recurring: true,
        recurrencePattern: "",
      }),
    ZodError
  );
});

test("normalizeActivityFormValues requires a custom rule when recurrence is custom", () => {
  assert.throws(
    () =>
      normalizeActivityFormValues({
        ...createFormInput(),
        recurring: true,
        recurrencePattern: "CUSTOM",
        recurrenceCustom: "   ",
      }),
    ZodError
  );
});

test("normalizeActivityFormValues rejects non-whole or out-of-range numeric strings", () => {
  assert.throws(
    () =>
      normalizeActivityFormValues({
        ...createFormInput(),
        durationMinutes: "45.5",
      }),
    /Duration must be a whole number\./
  );

  assert.throws(
    () =>
      normalizeActivityFormValues({
        ...createFormInput(),
        completionMoodScore: "101",
      }),
    /Mood score must be between 1 and 100\./
  );
});

test("normalizeActivityStatusMutation parses valid status updates and blank mood scores", () => {
  const withMood = normalizeActivityStatusMutation({
    id: "activity-1",
    status: "COMPLETED",
    completionMoodScore: "64",
  });

  const withoutMood = normalizeActivityStatusMutation({
    id: "activity-2",
    status: "SKIPPED",
    completionMoodScore: "",
  });

  assert.deepEqual(withMood, {
    id: "activity-1",
    status: "COMPLETED",
    completionMoodScore: 64,
  });
  assert.deepEqual(withoutMood, {
    id: "activity-2",
    status: "SKIPPED",
    completionMoodScore: undefined,
  });
});

test("normalizeActivityStatusMutation rejects invalid mood score input", () => {
  assert.throws(
    () =>
      normalizeActivityStatusMutation({
        id: "activity-1",
        status: "COMPLETED",
        completionMoodScore: "bad",
      }),
    /Mood score must be a whole number\./
  );
});