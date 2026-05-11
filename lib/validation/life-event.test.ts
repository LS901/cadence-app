import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import { lifeEventSchema } from "./life-event";

function createBaseEvent() {
  return {
    title: "Unexpected family logistics",
    category: "FAMILY_STRESS" as const,
    severityScore: 3,
    sentiment: "MIXED" as const,
    startAt: new Date("2030-05-10T09:00:00.000Z"),
    endAt: new Date("2030-05-10T17:00:00.000Z"),
    isOngoing: false,
    tags: ["family", "travel"],
  };
}

test("lifeEventSchema accepts a bounded event with optional recurrence omitted", () => {
  const parsed = lifeEventSchema.parse(createBaseEvent());

  assert.equal(parsed.title, "Unexpected family logistics");
  assert.equal(parsed.category, "FAMILY_STRESS");
  assert.equal(parsed.endAt?.toISOString(), "2030-05-10T17:00:00.000Z");
});

test("lifeEventSchema requires a custom label when the category is custom", () => {
  const result = lifeEventSchema.safeParse({
    ...createBaseEvent(),
    category: "CUSTOM",
    customCategoryLabel: "  ",
  });

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.equal(result.error.issues[0]?.message, "Add a short custom label for custom context categories.");
  assert.deepEqual(result.error.issues[0]?.path, ["customCategoryLabel"]);
});

test("lifeEventSchema requires an end time when the event is not ongoing", () => {
  const result = lifeEventSchema.safeParse({
    ...createBaseEvent(),
    endAt: undefined,
  });

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.equal(result.error.issues[0]?.message, "Add an end time or mark the event as ongoing.");
  assert.deepEqual(result.error.issues[0]?.path, ["endAt"]);
});

test("lifeEventSchema rejects end times that are earlier than the start time", () => {
  assert.throws(
    () =>
      lifeEventSchema.parse({
        ...createBaseEvent(),
        endAt: new Date("2030-05-10T08:59:00.000Z"),
      }),
    ZodError
  );
});

test("lifeEventSchema rejects ongoing events that also try to recur", () => {
  const result = lifeEventSchema.safeParse({
    ...createBaseEvent(),
    endAt: undefined,
    isOngoing: true,
    recurrencePattern: "WEEKLY",
    recurrenceInterval: 2,
  });

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.equal(result.error.issues[0]?.message, "Ongoing events cannot also generate repeating future occurrences.");
  assert.deepEqual(result.error.issues[0]?.path, ["recurrencePattern"]);
});

test("lifeEventSchema requires a rule when the recurrence pattern is custom", () => {
  const result = lifeEventSchema.safeParse({
    ...createBaseEvent(),
    recurrencePattern: "CUSTOM",
    recurrenceInterval: 3,
    recurrenceRule: " ",
  });

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.equal(result.error.issues[0]?.message, "Add a short custom rule for recurring context.");
  assert.deepEqual(result.error.issues[0]?.path, ["recurrenceRule"]);
});