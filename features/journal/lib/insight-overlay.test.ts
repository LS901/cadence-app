import assert from "node:assert/strict";
import test from "node:test";
import { buildJournalInsightOverlays } from "./insight-overlay";

test("buildJournalInsightOverlays compares a story window against the current weekly review and archive", () => {
  const overlays = buildJournalInsightOverlays({
    storyWindows: [
      {
        id: "window-1",
        title: "Focus window",
        dateRangeLabel: "May 8 - May 10",
        windowStartIso: new Date("2026-05-08T12:00:00.000Z").toISOString(),
        windowEndIso: new Date("2026-05-10T12:00:00.000Z").toISOString(),
        summary: "A focused stretch.",
        entryIds: ["entry-1", "entry-2"],
        entryCount: 2,
        averageMoodScore: 72,
        moodMomentLabel: "lowest around 2:00 PM to 4:00 PM at 52/100",
        signalAnchors: ["Focus"],
      },
    ],
    weeklyReview: {
      title: "The week stayed broadly steady",
      summary: "Average mood landed at 67/100.",
      averageMoodScore: 67,
    },
    moodArchive: [
      {
        weekLabel: "Apr 27 - May 3",
        title: "The week moved upward",
        summary: "Average mood landed at 64/100.",
        averageMoodScore: 64,
      },
    ],
  });

  assert.equal(overlays.length, 1);
  assert.match(overlays[0]?.weeklyReview.comparison ?? "", /5 points above/i);
  assert.match(overlays[0]?.moodArchive.comparison ?? "", /8 points above/i);
});

test("buildJournalInsightOverlays handles missing archive signal gracefully", () => {
  const overlays = buildJournalInsightOverlays({
    storyWindows: [
      {
        id: "window-1",
        title: "Story window",
        dateRangeLabel: "May 8 - May 10",
        windowStartIso: new Date("2026-05-08T12:00:00.000Z").toISOString(),
        windowEndIso: new Date("2026-05-10T12:00:00.000Z").toISOString(),
        summary: "A reflective stretch.",
        entryIds: ["entry-1"],
        entryCount: 1,
        averageMoodScore: null,
        moodMomentLabel: null,
        signalAnchors: [],
      },
    ],
    weeklyReview: {
      title: "No weekly synthesis yet",
      summary: "Start with a few quick check-ins.",
      averageMoodScore: null,
    },
    moodArchive: [],
  });

  assert.equal(overlays[0]?.moodArchive.weekLabel, null);
  assert.match(overlays[0]?.moodArchive.comparison ?? "", /No older mood archive window exists yet/i);
});