import assert from "node:assert/strict";
import test from "node:test";
import type { JournalEntryItem, JournalStoryWindow } from "@/features/journal/types";
import { buildJournalThemeArchive } from "./theme-archive";

function createEntry(overrides: Partial<JournalEntryItem> = {}): JournalEntryItem {
  return {
    id: overrides.id ?? "entry-1",
    dayIso: overrides.dayIso ?? new Date("2026-05-10T12:00:00.000Z").toISOString(),
    title: overrides.title ?? "Check-in",
    content: overrides.content ?? "Reflecting on the day",
    moodScore: overrides.moodScore ?? 64,
    excerpt: overrides.excerpt ?? "Reflecting on the day",
    wordCount: overrides.wordCount ?? 4,
    context: {
      derivedTags: ["focus"],
      moodScore: 64,
      moodStability: 58,
      dominantTags: ["focus"],
      periodHighlights: [],
      activities: [],
      lifeEvents: [],
      correlationSummary: null,
      ...overrides.context,
    },
  };
}

function createWindow(overrides: Partial<JournalStoryWindow> = {}): JournalStoryWindow {
  return {
    id: overrides.id ?? "window-1",
    title: overrides.title ?? "Focus window",
    dateRangeLabel: overrides.dateRangeLabel ?? "May 8 - May 10",
    windowStartIso: overrides.windowStartIso ?? new Date("2026-05-08T12:00:00.000Z").toISOString(),
    windowEndIso: overrides.windowEndIso ?? new Date("2026-05-10T12:00:00.000Z").toISOString(),
    summary: overrides.summary ?? "A focused stretch.",
    entryIds: overrides.entryIds ?? ["entry-1", "entry-2"],
    entryCount: overrides.entryCount ?? 2,
    averageMoodScore: overrides.averageMoodScore ?? 66,
    moodMomentLabel: overrides.moodMomentLabel ?? null,
    signalAnchors: overrides.signalAnchors ?? ["Focus"],
  };
}

test("buildJournalThemeArchive groups repeated tags across story windows", () => {
  const archive = buildJournalThemeArchive(
    [
      createEntry({
        id: "entry-1",
        moodScore: 58,
        context: {
          ...createEntry().context,
          derivedTags: ["focus"],
          lifeEvents: [{ id: "life-1", title: "Work sprint" } as JournalEntryItem["context"]["lifeEvents"][number]],
        },
      }),
      createEntry({
        id: "entry-2",
        dayIso: new Date("2026-05-09T12:00:00.000Z").toISOString(),
        moodScore: 72,
        context: {
          ...createEntry().context,
          derivedTags: ["focus", "stress"],
          lifeEvents: [{ id: "life-1", title: "Work sprint" } as JournalEntryItem["context"]["lifeEvents"][number]],
        },
      }),
      createEntry({ id: "entry-3", dayIso: new Date("2026-05-08T12:00:00.000Z").toISOString(), context: { ...createEntry().context, derivedTags: ["stress"] } }),
    ],
    [
      createWindow({ id: "window-1", entryIds: ["entry-1", "entry-2"] }),
      createWindow({ id: "window-2", dateRangeLabel: "May 6 - May 8", entryIds: ["entry-2", "entry-3"] }),
    ]
  );

  assert.equal(archive.length, 2);
  assert.equal(archive[0]?.tag, "focus");
  assert.equal(archive[0]?.dateRangeLabel, "May 9 - May 10");
  assert.match(archive[0]?.moodTrajectorySummary ?? "", /softened from 72\/100 to 58\/100/i);
  assert.match(archive[0]?.contextSummary ?? "", /Work sprint/i);
  assert.deepEqual(archive[1]?.relatedWindowLabels, ["May 8 - May 10", "May 6 - May 8"]);
});

test("buildJournalThemeArchive ignores one-off tags", () => {
  const archive = buildJournalThemeArchive(
    [
      createEntry({ id: "entry-1", context: { ...createEntry().context, derivedTags: ["focus"] } }),
      createEntry({ id: "entry-2", context: { ...createEntry().context, derivedTags: ["movement"] } }),
    ],
    [createWindow()]
  );

  assert.deepEqual(archive, []);
});