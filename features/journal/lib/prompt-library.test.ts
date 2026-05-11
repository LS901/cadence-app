import assert from "node:assert/strict";
import test from "node:test";
import type { LifeEventItem } from "@/features/life-events/types";
import type { JournalEntryItem, JournalSummary } from "@/features/journal/types";
import { buildJournalPromptLibrary } from "./prompt-library";

function createSummary(overrides: Partial<JournalSummary> = {}): JournalSummary {
  return {
    totalEntries: 3,
    entriesThisWeek: 2,
    writingStreak: 2,
    averageMoodScore: 69,
    ...overrides,
  };
}

function createEntry(overrides: Partial<JournalEntryItem> = {}): JournalEntryItem {
  return {
    id: overrides.id ?? "entry-1",
    dayIso: overrides.dayIso ?? new Date("2026-05-10T12:00:00.000Z").toISOString(),
    title: overrides.title ?? "Check-in",
    content: overrides.content ?? "A reflective entry",
    moodScore: overrides.moodScore ?? 58,
    excerpt: overrides.excerpt ?? "A reflective entry",
    wordCount: overrides.wordCount ?? 3,
    context: {
      derivedTags: ["stress"],
      moodScore: 58,
      moodStability: 41,
      dominantTags: ["stress"],
      periodHighlights: [
        {
          id: "period-1",
          timeLabel: "2:00 PM to 4:00 PM",
          score: 49,
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

function createLifeEvent(overrides: Partial<LifeEventItem> = {}): LifeEventItem {
  return {
    id: overrides.id ?? "life-event-1",
    title: overrides.title ?? "Family visit",
    category: overrides.category ?? "RELATIONSHIP_STRESS",
    categoryLabel: overrides.categoryLabel ?? "Relationship stress",
    customCategoryLabel: overrides.customCategoryLabel ?? null,
    description: overrides.description ?? null,
    severityScore: overrides.severityScore ?? 4,
    severityLabel: overrides.severityLabel ?? "Elevated",
    sentiment: overrides.sentiment ?? "MIXED",
    sentimentLabel: overrides.sentimentLabel ?? "Mixed",
    startAtIso: overrides.startAtIso ?? new Date("2026-05-08T12:00:00.000Z").toISOString(),
    endAtIso: overrides.endAtIso ?? null,
    isOngoing: overrides.isOngoing ?? true,
    source: overrides.source ?? "MANUAL",
    isRecurring: overrides.isRecurring ?? false,
    recurrencePattern: overrides.recurrencePattern ?? null,
    recurrenceInterval: overrides.recurrenceInterval ?? null,
    recurrenceRule: overrides.recurrenceRule ?? null,
    recurrenceLabel: overrides.recurrenceLabel ?? null,
    seriesTitle: overrides.seriesTitle ?? null,
    tags: overrides.tags ?? ["family"],
    windowLabel: overrides.windowLabel ?? "Now",
  };
}

test("buildJournalPromptLibrary prioritizes repeated recent themes", () => {
  const prompts = buildJournalPromptLibrary({
    latestEntry: createEntry(),
    recentEntries: [createEntry(), createEntry({ id: "entry-2" }), createEntry({ id: "entry-3", context: { ...createEntry().context, derivedTags: ["energy"] } })],
    summary: createSummary(),
    availableLifeEvents: [],
  });

  assert.equal(prompts[0]?.id, "tag-pattern");
  assert.match(prompts[0]?.label ?? "", /stress/i);
  assert.match(prompts[0]?.whyNow ?? "", /2 recent journal entries tagged stress/i);
});

test("buildJournalPromptLibrary includes recent life context when available", () => {
  const prompts = buildJournalPromptLibrary({
    latestEntry: createEntry({ context: { ...createEntry().context, periodHighlights: [] } }),
    recentEntries: [createEntry({ context: { ...createEntry().context, derivedTags: ["focus"] } })],
    summary: createSummary(),
    availableLifeEvents: [createLifeEvent()],
  });

  const contextPrompt = prompts.find((prompt) => prompt.id === "context-in-view");
  assert.ok(contextPrompt);
  assert.match(contextPrompt?.whyNow ?? "", /Family visit/i);
});

test("buildJournalPromptLibrary falls back to the default prompt set when no patterns are available", () => {
  const prompts = buildJournalPromptLibrary({
    latestEntry: null,
    recentEntries: [],
    summary: createSummary({ totalEntries: 0, entriesThisWeek: 0, writingStreak: 0, averageMoodScore: null }),
    availableLifeEvents: [],
  });

  assert.deepEqual(
    prompts.map((prompt) => prompt.id),
    ["energy-check", "friction-point", "carry-forward"]
  );
});