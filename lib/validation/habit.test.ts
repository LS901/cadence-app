import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import { habitSchema } from "./habit";

function createHabitInput() {
  return {
    name: "Morning walk",
    category: "MOVEMENT" as const,
    type: "POSITIVE" as const,
    notes: "A short walk to reset before work.",
    targetPerWeek: 5,
  };
}

test("habitSchema accepts a valid habit payload", () => {
  const parsed = habitSchema.parse(createHabitInput());

  assert.equal(parsed.name, "Morning walk");
  assert.equal(parsed.category, "MOVEMENT");
  assert.equal(parsed.type, "POSITIVE");
  assert.equal(parsed.targetPerWeek, 5);
});

test("habitSchema rejects names that are too short", () => {
  assert.throws(
    () =>
      habitSchema.parse({
        ...createHabitInput(),
        name: "A",
      }),
    ZodError
  );
});

test("habitSchema rejects unsupported categories and habit types", () => {
  assert.throws(
    () =>
      habitSchema.parse({
        ...createHabitInput(),
        category: "FITNESS",
      }),
    ZodError
  );

  assert.throws(
    () =>
      habitSchema.parse({
        ...createHabitInput(),
        type: "NEUTRAL",
      }),
    ZodError
  );
});

test("habitSchema rejects notes longer than the supported limit", () => {
  assert.throws(
    () =>
      habitSchema.parse({
        ...createHabitInput(),
        notes: "x".repeat(241),
      }),
    ZodError
  );
});

test("habitSchema enforces integer weekly targets within range", () => {
  assert.throws(
    () =>
      habitSchema.parse({
        ...createHabitInput(),
        targetPerWeek: 0,
      }),
    ZodError
  );

  assert.throws(
    () =>
      habitSchema.parse({
        ...createHabitInput(),
        targetPerWeek: 14.5,
      }),
    ZodError
  );

  assert.throws(
    () =>
      habitSchema.parse({
        ...createHabitInput(),
        targetPerWeek: 15,
      }),
    ZodError
  );
});