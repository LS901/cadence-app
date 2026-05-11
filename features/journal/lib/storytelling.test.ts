import assert from "node:assert/strict";
import test from "node:test";
import type { JournalEntryItem } from "@/features/journal/types";
import { buildJournalStorytelling } from "./storytelling";

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
      periodHighlights: [
        {
          id: "period-1",
          timeLabel: "2:00 PM to 4:00 PM",
          score: 52,
          tags: ["stress"],
          notes: "Afternoon drag",
        },
      ],
      activities: [],
      lifeEvents: [],
      correlationSummary: null,
      ...overrides.context,
    },
  };
}

test("buildJournalStorytelling creates a storyline from repeated themes and context", () => {
  const storytelling = buildJournalStorytelling([
    createEntry({
      id: "entry-1",
      dayIso: new Date("2026-05-10T12:00:00.000Z").toISOString(),
      moodScore: 72,
      context: {
        ...createEntry().context,
        derivedTags: ["focus"],
        lifeEvents: [{ id: "life-1", title: "Work sprint" } as JournalEntryItem["context"]["lifeEvents"][number]],
      },
    }),
    createEntry({
      id: "entry-2",
      dayIso: new Date("2026-05-09T12:00:00.000Z").toISOString(),
      moodScore: 56,
      context: {
        ...createEntry().context,
        derivedTags: ["focus", "stress"],
        lifeEvents: [{ id: "life-1", title: "Work sprint" } as JournalEntryItem["context"]["lifeEvents"][number]],
      },
    }),
    createEntry({
      id: "entry-3",
      dayIso: new Date("2026-05-08T12:00:00.000Z").toISOString(),
      moodScore: 61,
      context: {
        ...createEntry().context,
        derivedTags: ["movement"],
        lifeEvents: [],
      },
    }),
  ]);

  assert.ok(storytelling.storyline);
  assert.match(storytelling.storyline?.title ?? "", /focus/i);
  assert.match(storytelling.storyline?.summary ?? "", /Work sprint/i);
  assert.ok(storytelling.storyline?.signalAnchors.includes("Focus"));
});

test("buildJournalStorytelling creates grouped story windows with date ranges", () => {
  const storytelling = buildJournalStorytelling([
    createEntry({ id: "entry-1", dayIso: new Date("2026-05-10T12:00:00.000Z").toISOString() }),
    createEntry({ id: "entry-2", dayIso: new Date("2026-05-09T12:00:00.000Z").toISOString() }),
    createEntry({ id: "entry-3", dayIso: new Date("2026-05-08T12:00:00.000Z").toISOString() }),
    createEntry({ id: "entry-4", dayIso: new Date("2026-05-06T12:00:00.000Z").toISOString(), context: { ...createEntry().context, derivedTags: ["stress"] } }),
  ]);

  assert.equal(storytelling.storyWindows.length, 2);
  assert.equal(storytelling.storyWindows[0]?.dateRangeLabel, "May 8 - May 10");
  assert.equal(storytelling.storyWindows[0]?.entryCount, 3);
  assert.match(storytelling.storyWindows[0]?.summary ?? "", /Average mood tag/i);
});

test("buildJournalStorytelling returns an empty storytelling state when there are no entries", () => {
  const storytelling = buildJournalStorytelling([]);

  assert.equal(storytelling.storyline, null);
  assert.deepEqual(storytelling.storyWindows, []);
});