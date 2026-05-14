import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import {
  completeDayReflectionMutationSchema,
  completeDayReflectionSchema,
  moodPeriodSchema,
  quickMoodCaptureMutationSchema,
} from "./mood";

test("quickMoodCaptureMutationSchema accepts a lightweight dashboard check-in", () => {
  const parsed = quickMoodCaptureMutationSchema.parse({
    day: "2026-05-10T00:00:00.000Z",
    score: 68,
    notes: "A little flat, but still steady enough to work.",
  });

  assert.equal(parsed.score, 68);
  assert.equal(parsed.notes, "A little flat, but still steady enough to work.");
});

test("quickMoodCaptureMutationSchema rejects out-of-range dashboard scores", () => {
  assert.throws(
    () =>
      quickMoodCaptureMutationSchema.parse({
        day: "2026-05-10T00:00:00.000Z",
        score: 140,
      }),
    ZodError
  );
});

test("moodPeriodSchema rejects periods whose end time is not after the start time", () => {
  assert.throws(
    () =>
      moodPeriodSchema.parse({
        startMinute: 480,
        endMinute: 480,
        score: 62,
        tags: [],
      }),
    ZodError
  );
});

test("completeDayReflectionMutationSchema accepts adjacent mood periods and contextual ratings", () => {
  const parsed = completeDayReflectionMutationSchema.parse({
    day: "2026-05-10T00:00:00.000Z",
    sleepHours: 7.5,
    sleepQuality: 4,
    workStress: 2,
    socialQuality: 5,
    notes: "A more grounded day with good recovery after work.",
    periods: [
      {
        startMinute: 480,
        endMinute: 720,
        score: 58,
        tags: ["steady"],
      },
      {
        startMinute: 720,
        endMinute: 1020,
        score: 74,
        tags: ["social"],
      },
    ],
  });

  assert.equal(parsed.sleepQuality, 4);
  assert.equal(parsed.workStress, 2);
  assert.equal(parsed.socialQuality, 5);
  assert.equal(parsed.periods.length, 2);
});

test("completeDayReflectionMutationSchema rejects overlapping mood periods on the later block", () => {
  const result = completeDayReflectionMutationSchema.safeParse({
    day: "2026-05-10T00:00:00.000Z",
    periods: [
      {
        startMinute: 480,
        endMinute: 720,
        score: 58,
        tags: [],
      },
      {
        startMinute: 700,
        endMinute: 900,
        score: 74,
        tags: [],
      },
    ],
  });

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.equal(result.error.issues[0]?.message, "Mood blocks cannot overlap.");
  assert.deepEqual(result.error.issues[0]?.path, ["periods", 1, "startMinute"]);
});

test("completeDayReflectionMutationSchema rejects contextual ratings outside the supported range", () => {
  assert.throws(
    () =>
      completeDayReflectionMutationSchema.parse({
        day: "2026-05-10T00:00:00.000Z",
        sleepQuality: 6,
        workStress: 0,
        socialQuality: 3,
        periods: [
          {
            startMinute: 480,
            endMinute: 720,
            score: 58,
            tags: [],
          },
        ],
      }),
    ZodError
  );
});

test("completeDayReflectionSchema accepts a persisted reflection payload with derived stability", () => {
  const parsed = completeDayReflectionSchema.parse({
    day: new Date("2026-05-10T00:00:00.000Z"),
    score: 66,
    moodStability: 81,
    energy: 70,
    stress: 35,
    sleepHours: 7.5,
    sleepQuality: 4,
    workStress: 2,
    socialQuality: 5,
    periods: [
      {
        startMinute: 480,
        endMinute: 720,
        score: 58,
        tags: ["steady"],
      },
      {
        startMinute: 720,
        endMinute: 1020,
        score: 74,
        tags: ["social"],
      },
    ],
    tags: ["balanced"],
  });

  assert.equal(parsed.moodStability, 81);
  assert.equal(parsed.periods[1]?.score, 74);
  assert.deepEqual(parsed.tags, ["balanced"]);
});

test("completeDayReflectionSchema rejects overlapping persisted mood periods on the later block", () => {
  const result = completeDayReflectionSchema.safeParse({
    day: new Date("2026-05-10T00:00:00.000Z"),
    score: 66,
    periods: [
      {
        startMinute: 480,
        endMinute: 720,
        score: 58,
        tags: [],
      },
      {
        startMinute: 700,
        endMinute: 900,
        score: 74,
        tags: [],
      },
    ],
    tags: [],
  });

  assert.equal(result.success, false);

  if (result.success) {
    return;
  }

  assert.equal(result.error.issues[0]?.message, "Mood blocks cannot overlap.");
  assert.deepEqual(result.error.issues[0]?.path, ["periods", 1, "startMinute"]);
});