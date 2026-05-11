import assert from "node:assert/strict";
import test from "node:test";
import {
  dedupeTags,
  deriveMoodSummary,
  findOverlappingMoodPeriodIndex,
  formatMinuteLabel,
  parseTagInput,
  timeInputToMinute,
} from "./mood";

test("findOverlappingMoodPeriodIndex ignores adjacent periods but flags the later overlapping block", () => {
  assert.equal(
    findOverlappingMoodPeriodIndex([
      { startMinute: 480, endMinute: 720, score: 60, tags: [] },
      { startMinute: 720, endMinute: 900, score: 70, tags: [] },
    ]),
    -1
  );

  assert.equal(
    findOverlappingMoodPeriodIndex([
      { startMinute: 720, endMinute: 900, score: 70, tags: [] },
      { startMinute: 480, endMinute: 780, score: 60, tags: [] },
    ]),
    1
  );
});

test("dedupeTags and parseTagInput normalize case, whitespace, and empty values", () => {
  assert.deepEqual(dedupeTags([" Focus ", "focus", " Rest", "", "REST"]), [
    "focus",
    "rest",
  ]);

  assert.deepEqual(parseTagInput(" Focus, rest,focus, , sleep "), [
    "focus",
    "rest",
    "sleep",
  ]);
});

test("deriveMoodSummary computes weighted score, stability, derived energy/stress, and merged tags", () => {
  const summary = deriveMoodSummary([
    {
      startMinute: 480,
      endMinute: 720,
      score: 58,
      tags: ["steady", "focus"],
    },
    {
      startMinute: 720,
      endMinute: 1020,
      score: 74,
      tags: ["social", "Focus"],
    },
  ]);

  assert.equal(summary.score, 67);
  assert.equal(summary.moodStability, 68);
  assert.equal(summary.energy, 73);
  assert.equal(summary.stress, 41);
  assert.deepEqual(summary.tags, ["steady", "focus", "social"]);
});

test("deriveMoodSummary clamps invalid input ranges before computing outputs", () => {
  const summary = deriveMoodSummary([
    {
      startMinute: -30,
      endMinute: 60,
      score: -10,
      tags: ["early"],
    },
    {
      startMinute: 1380,
      endMinute: 1500,
      score: 120,
      tags: ["late"],
    },
  ]);

  assert.equal(summary.score, 51);
  assert.equal(summary.moodStability, 1);
  assert.equal(summary.energy, 57);
  assert.equal(summary.stress, 57);
  assert.deepEqual(summary.tags, ["early", "late"]);
});

test("deriveMoodSummary returns null summaries for an empty period list", () => {
  assert.deepEqual(deriveMoodSummary([]), {
    score: null,
    moodStability: null,
    energy: null,
    stress: null,
    tags: [],
  });
});

test("timeInputToMinute and formatMinuteLabel normalize time values consistently", () => {
  assert.equal(timeInputToMinute("09:30"), 570);
  assert.equal(timeInputToMinute("25:90"), 1440);
  assert.equal(formatMinuteLabel(0), "12am");
  assert.equal(formatMinuteLabel(570), "9:30am");
  assert.equal(formatMinuteLabel(780), "1pm");
});