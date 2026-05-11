import assert from "node:assert/strict";
import test from "node:test";
import {
  getReflectionDraftPeriods,
  isQuickCaptureDraft,
} from "./reflection-draft";

test("getReflectionDraftPeriods seeds a starter block for a quick-capture draft", () => {
  const capturedAtIso = "2026-05-10T14:25:00.000Z";
  const expectedStartMinute = new Date(capturedAtIso).getHours() * 60;
  const periods = getReflectionDraftPeriods({
    id: "mood-draft-1",
    dayIso: "2026-05-10T00:00:00.000Z",
    draftCapturedAtIso: capturedAtIso,
    score: 64,
    notes: "A little flat this morning.",
    tags: [],
    periods: [],
    reflectionCompletedAtIso: null,
  });

  assert.equal(periods.length, 1);
  assert.equal(periods[0]?.score, 64);
  assert.equal(periods[0]?.startMinute, expectedStartMinute);
  assert.equal(periods[0]?.endMinute, expectedStartMinute + 2 * 60);
});

test("isQuickCaptureDraft is false once a reflection has real mood blocks", () => {
  const entry = {
    id: "mood-reflection-1",
    dayIso: "2026-05-10T00:00:00.000Z",
    draftCapturedAtIso: "2026-05-10T09:10:00.000Z",
    score: 72,
    notes: null,
    tags: ["focus"],
    reflectionCompletedAtIso: "2026-05-10T21:00:00.000Z",
    periods: [
      {
        id: "period-1",
        startMinute: 9 * 60,
        endMinute: 12 * 60,
        score: 72,
        notes: null,
        tags: ["focus"],
      },
    ],
  };

  assert.equal(isQuickCaptureDraft(entry), false);
  assert.equal(getReflectionDraftPeriods(entry).length, 1);
});