import { format } from "date-fns";
import type {
  JournalEntryItem,
  JournalStoryWindow,
  JournalThemeArchiveItem,
} from "@/features/journal/types";

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getAverageMoodScore(entries: JournalEntryItem[]) {
  const scores = entries.map((entry) => entry.moodScore).filter((score): score is number => score != null);

  if (!scores.length) {
    return null;
  }

  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function getDateRangeLabel(entries: JournalEntryItem[]) {
  const dates = entries
    .map((entry) => new Date(entry.dayIso))
    .sort((left, right) => left.getTime() - right.getTime());

  if (!dates.length) {
    return "";
  }

  const startLabel = format(dates[0], "MMM d");
  const endLabel = format(dates.at(-1) ?? dates[0], "MMM d");

  return startLabel === endLabel ? startLabel : `${startLabel} - ${endLabel}`;
}

function getMoodTrajectorySummary(entries: JournalEntryItem[]) {
  const scoredEntries = [...entries]
    .filter((entry): entry is JournalEntryItem & { moodScore: number } => entry.moodScore != null)
    .sort((left, right) => new Date(left.dayIso).getTime() - new Date(right.dayIso).getTime());

  if (!scoredEntries.length) {
    return "No mood-tagged entries are attached to this theme yet, so the archive is currently narrative-first.";
  }

  if (scoredEntries.length === 1) {
    return `${scoredEntries[0].moodScore}/100 is the only mood anchor attached to this theme so far.`;
  }

  const firstScore = scoredEntries[0].moodScore;
  const lastScore = scoredEntries.at(-1)?.moodScore ?? firstScore;
  const difference = lastScore - firstScore;

  if (Math.abs(difference) >= 8) {
    return difference > 0
      ? `Mood tags connected to this theme climbed from ${firstScore}/100 to ${lastScore}/100 across the archive.`
      : `Mood tags connected to this theme softened from ${firstScore}/100 to ${lastScore}/100 across the archive.`;
  }

  const averageMoodScore = getAverageMoodScore(scoredEntries);

  return averageMoodScore != null
    ? `Mood tags linked to this theme stayed relatively steady around ${averageMoodScore}/100.`
    : "Mood signal for this theme is still too thin to summarize cleanly.";
}

function getContextSummary(entries: JournalEntryItem[]) {
  const lifeEventCounts = entries.reduce<Map<string, number>>((counts, entry) => {
    entry.context.lifeEvents.forEach((lifeEvent) => {
      counts.set(lifeEvent.title, (counts.get(lifeEvent.title) ?? 0) + 1);
    });

    return counts;
  }, new Map());

  const dominantLifeEvents = [...lifeEventCounts.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, 2)
    .map(([title]) => title);

  if (!dominantLifeEvents.length) {
    return "No repeated life-context markers were logged alongside this theme yet, so the archive is mainly tracking the behavioral narrative.";
  }

  if (dominantLifeEvents.length === 1) {
    return `${dominantLifeEvents[0]} is the clearest recurring life backdrop linked to this theme.`;
  }

  return `${dominantLifeEvents[0]} and ${dominantLifeEvents[1]} are the clearest recurring life backdrops linked to this theme.`;
}

export function buildJournalThemeArchive(
  entries: JournalEntryItem[],
  storyWindows: JournalStoryWindow[]
): JournalThemeArchiveItem[] {
  const entriesByTheme = entries.reduce<Map<string, JournalEntryItem[]>>((themes, entry) => {
    entry.context.derivedTags.forEach((tag) => {
      const existingEntries = themes.get(tag) ?? [];
      themes.set(tag, [...existingEntries, entry]);
    });

    return themes;
  }, new Map());

  return [...entriesByTheme.entries()]
    .filter(([, themedEntries]) => themedEntries.length >= 2)
    .map(([tag, themedEntries]) => {
      const sortedEntries = [...themedEntries].sort(
        (left, right) => new Date(right.dayIso).getTime() - new Date(left.dayIso).getTime()
      );
      const relatedWindows = storyWindows.filter((window) =>
        window.entryIds.some((entryId) => themedEntries.some((entry) => entry.id === entryId))
      );

      return {
        tag,
        label: titleCase(tag),
        entryCount: themedEntries.length,
        averageMoodScore: getAverageMoodScore(themedEntries),
        latestEntryDayLabel: format(new Date(sortedEntries[0].dayIso), "MMM d"),
        dateRangeLabel: getDateRangeLabel(sortedEntries),
        moodTrajectorySummary: getMoodTrajectorySummary(sortedEntries),
        contextSummary: getContextSummary(sortedEntries),
        relatedWindowIds: relatedWindows.map((window) => window.id),
        relatedWindowLabels: relatedWindows.map((window) => window.dateRangeLabel),
        sampleEntryIds: sortedEntries.slice(0, 4).map((entry) => entry.id),
      };
    })
    .sort((left, right) => right.entryCount - left.entryCount || left.label.localeCompare(right.label));
}