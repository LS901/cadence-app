import { startOfDay, subDays } from "date-fns";
import type { LifeEventItem } from "@/features/life-events/types";
import type {
  JournalEntryItem,
  JournalPromptTemplate,
  JournalSummary,
} from "@/features/journal/types";

type JournalPromptLibraryInput = {
  latestEntry: JournalEntryItem | null;
  recentEntries: JournalEntryItem[];
  summary: JournalSummary;
  availableLifeEvents: LifeEventItem[];
};

const FALLBACK_PROMPTS: JournalPromptTemplate[] = [
  {
    id: "energy-check",
    label: "Energy check",
    description: "Capture what added lift, drag, or steadiness across the day.",
    prompt: "Where did your energy rise, dip, or recover today, and what seemed to shape that shift?",
    whyNow: "Useful when you want a clean starting angle without over-structuring the entry.",
  },
  {
    id: "friction-point",
    label: "Friction point",
    description: "Name the part of the day that felt sticky and why.",
    prompt: "What created the most friction today, and what would make that stretch feel lighter next time?",
    whyNow: "Useful when the day felt heavy but the pattern is still hard to name clearly.",
  },
  {
    id: "carry-forward",
    label: "Carry forward",
    description: "Keep one thing worth repeating visible.",
    prompt: "What is one pattern, ritual, or decision from today that feels worth carrying into tomorrow?",
    whyNow: "Useful when you want the journal to preserve what worked, not just what went wrong.",
  },
];

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function buildTagPatternPrompt(recentEntries: JournalEntryItem[]): JournalPromptTemplate | null {
  const tagCounts = recentEntries.slice(0, 6).reduce<Map<string, number>>((counts, entry) => {
    entry.context.derivedTags.forEach((tag) => {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    });

    return counts;
  }, new Map());

  const dominantTag = [...tagCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0];

  if (!dominantTag || dominantTag[1] < 2) {
    return null;
  }

  const [tag, count] = dominantTag;
  const label = titleCase(tag);

  return {
    id: "tag-pattern",
    label: `${label} pattern`,
    description: `Recent entries keep circling ${tag}. Use this to name what is repeating instead of only logging another isolated day.`,
    prompt: `You've touched ${tag} in ${count} recent entries. What keeps repeating here, and what feels structural rather than situational?`,
    whyNow: `Suggested from ${count} recent journal entries tagged ${tag}.`,
  };
}

function buildMoodPrompt(latestEntry: JournalEntryItem | null): JournalPromptTemplate | null {
  if (!latestEntry) {
    return null;
  }

  const lowestPeriod = [...latestEntry.context.periodHighlights].sort((left, right) => left.score - right.score)[0];
  if (lowestPeriod && lowestPeriod.score < 60) {
    return {
      id: "mood-debrief",
      label: "Mood debrief",
      description: "Use the journal to explain the hardest stretch in the day rather than leaving it as a number on the timeline.",
      prompt: `Your day dipped around ${lowestPeriod.timeLabel}. What was happening before that stretch, and what shaped the recovery after it?`,
      whyNow: "Suggested because your recent mood timeline already contains a clear low point worth interpreting.",
    };
  }

  const strongActivity = latestEntry.context.activities.find(
    (activity) => activity.status === "COMPLETED" && activity.completionMoodScore != null && activity.completionMoodScore >= 75
  );
  if (strongActivity) {
    return {
      id: "activity-carry-forward",
      label: "Repeat what helped",
      description: "Turn a good activity signal into a repeatable note before it fades into a vague memory.",
      prompt: `${strongActivity.title} landed well recently. What made it work, and what would make it easier to repeat under normal conditions?`,
      whyNow: `Suggested from a strong completed activity signal around ${strongActivity.title}.`,
    };
  }

  if (latestEntry.moodScore != null && latestEntry.moodScore >= 75) {
    return {
      id: "high-day-carry-forward",
      label: "Hold onto the lift",
      description: "A better day is easiest to learn from while the texture is still fresh.",
      prompt: `This recently tracked as a ${latestEntry.moodScore}/100 day. What supported that baseline, and which part is most repeatable tomorrow?`,
      whyNow: "Suggested because recent journaling points to a stronger day worth unpacking before it blurs.",
    };
  }

  return null;
}

function buildContextPrompt(availableLifeEvents: LifeEventItem[]): JournalPromptTemplate | null {
  const recentWindowStart = subDays(startOfDay(new Date()), 7);
  const contextEvent = [...availableLifeEvents]
    .filter((event) => {
      if (event.isOngoing) {
        return true;
      }

      const endAt = event.endAtIso ? new Date(event.endAtIso) : new Date(event.startAtIso);
      return endAt >= recentWindowStart;
    })
    .sort((left, right) => right.severityScore - left.severityScore)[0];

  if (!contextEvent) {
    return null;
  }

  return {
    id: "context-in-view",
    label: "Context in view",
    description: `Bring ${contextEvent.title} into the narrative so the journal reflects the real backdrop, not just isolated behavior.`,
    prompt: `${contextEvent.title} is part of the wider picture right now. How did it shape your energy, choices, or emotional tone today?`,
    whyNow: `Suggested because ${contextEvent.title} is still part of your recent life context.`,
  };
}

export function buildJournalPromptLibrary({
  latestEntry,
  recentEntries,
  summary,
  availableLifeEvents,
}: JournalPromptLibraryInput): JournalPromptTemplate[] {
  const prompts = [
    buildTagPatternPrompt(recentEntries),
    buildMoodPrompt(latestEntry),
    buildContextPrompt(availableLifeEvents),
  ].filter((prompt): prompt is JournalPromptTemplate => Boolean(prompt));

  if (!summary.entriesThisWeek && !prompts.length) {
    return FALLBACK_PROMPTS;
  }

  const seenIds = new Set(prompts.map((prompt) => prompt.id));
  const fallbackPrompts = FALLBACK_PROMPTS.filter((prompt) => !seenIds.has(prompt.id));

  return [...prompts, ...fallbackPrompts].slice(0, 3);
}