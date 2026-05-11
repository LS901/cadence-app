import { format } from "date-fns";
import type {
  JournalEntryItem,
  JournalStoryWindow,
  JournalStoryline,
} from "@/features/journal/types";

const STORYLINE_ENTRY_LIMIT = 5;
const STORY_WINDOW_ENTRY_SIZE = 3;
const STORY_WINDOW_LIMIT = 2;

function titleCase(value: string) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function joinPhrases(values: string[]) {
  if (!values.length) {
    return "";
  }

  if (values.length === 1) {
    return values[0];
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function getCounts(values: string[]) {
  return values.reduce<Map<string, number>>((counts, value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
    return counts;
  }, new Map());
}

function getTopValues(values: string[], limit: number) {
  return [...getCounts(values).entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([value]) => value);
}

function getAverageMoodScore(entries: JournalEntryItem[]) {
  const scores = entries.map((entry) => entry.moodScore).filter((score): score is number => score != null);

  if (!scores.length) {
    return null;
  }

  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function getMoodTrajectory(entries: JournalEntryItem[]) {
  const scoredEntries = [...entries]
    .filter((entry): entry is JournalEntryItem & { moodScore: number } => entry.moodScore != null)
    .sort((left, right) => new Date(left.dayIso).getTime() - new Date(right.dayIso).getTime());

  if (!scoredEntries.length) {
    return null;
  }

  if (scoredEntries.length === 1) {
    return `${scoredEntries[0].moodScore}/100 is the only mood-tagged anchor in this stretch so far.`;
  }

  const firstScore = scoredEntries[0].moodScore;
  const lastScore = scoredEntries.at(-1)?.moodScore ?? firstScore;
  const difference = lastScore - firstScore;

  if (Math.abs(difference) >= 8) {
    return difference > 0
      ? `Mood tags lifted from ${firstScore}/100 to ${lastScore}/100 across this stretch.`
      : `Mood tags softened from ${firstScore}/100 to ${lastScore}/100 across this stretch.`;
  }

  const averageMoodScore = getAverageMoodScore(scoredEntries);

  return averageMoodScore != null
    ? `Mood tags stayed relatively steady around ${averageMoodScore}/100 across this stretch.`
    : null;
}

function getMoodMomentLabel(entries: JournalEntryItem[]) {
  const periods = entries.flatMap((entry) => entry.context.periodHighlights);

  if (!periods.length) {
    return null;
  }

  const lowestPeriod = periods.reduce((lowest, period) => (period.score < lowest.score ? period : lowest), periods[0]);
  if (lowestPeriod.score < 60) {
    return `lowest around ${lowestPeriod.timeLabel} at ${lowestPeriod.score}/100`;
  }

  const highestPeriod = periods.reduce((highest, period) => (period.score > highest.score ? period : highest), periods[0]);
  return `strongest around ${highestPeriod.timeLabel} at ${highestPeriod.score}/100`;
}

function getDateRangeLabel(entries: JournalEntryItem[]) {
  const dates = entries
    .map((entry) => new Date(entry.dayIso))
    .sort((left, right) => left.getTime() - right.getTime());

  if (!dates.length) {
    return "";
  }

  if (dates.length === 1 || dates[0].toDateString() === dates.at(-1)?.toDateString()) {
    return format(dates[0], "MMM d");
  }

  return `${format(dates[0], "MMM d")} - ${format(dates.at(-1) ?? dates[0], "MMM d")}`;
}

function getWindowBounds(entries: JournalEntryItem[]) {
  const dates = entries
    .map((entry) => new Date(entry.dayIso))
    .sort((left, right) => left.getTime() - right.getTime());

  if (!dates.length) {
    const now = new Date().toISOString();

    return {
      windowStartIso: now,
      windowEndIso: now,
    };
  }

  return {
    windowStartIso: dates[0].toISOString(),
    windowEndIso: dates.at(-1)?.toISOString() ?? dates[0].toISOString(),
  };
}

function buildSignalAnchors(entries: JournalEntryItem[]) {
  const dominantTags = getTopValues(
    entries.flatMap((entry) => entry.context.derivedTags.map((tag) => titleCase(tag))),
    2
  );
  const lifeEventTitles = getTopValues(
    entries.flatMap((entry) => entry.context.lifeEvents.map((lifeEvent) => lifeEvent.title)),
    2
  );

  return [...dominantTags, ...lifeEventTitles].slice(0, 3);
}

function buildStoryline(entries: JournalEntryItem[]): JournalStoryline | null {
  if (!entries.length) {
    return null;
  }

  const storylineEntries = entries.slice(0, STORYLINE_ENTRY_LIMIT);
  const dominantTags = getTopValues(storylineEntries.flatMap((entry) => entry.context.derivedTags), 3);
  const lifeEventTitles = getTopValues(
    storylineEntries.flatMap((entry) => entry.context.lifeEvents.map((lifeEvent) => lifeEvent.title)),
    2
  );
  const moodTrajectory = getMoodTrajectory(storylineEntries);
  const moodMomentLabel = getMoodMomentLabel(storylineEntries);
  const title = dominantTags.length
    ? `${titleCase(dominantTags[0])} keeps resurfacing`
    : lifeEventTitles.length
      ? `${lifeEventTitles[0]} is still shaping the backdrop`
      : "Recent writing is forming a clearer storyline";

  const summaryParts = [
    dominantTags.length
      ? `Across the last ${storylineEntries.length} entries, the writing keeps circling ${joinPhrases(dominantTags.map((tag) => titleCase(tag)))}.`
      : `Across the last ${storylineEntries.length} entries, the narrative is starting to cohere into a clearer pattern instead of isolated daily notes.`,
    moodTrajectory,
    lifeEventTitles.length ? `${lifeEventTitles[0]} remains part of the wider context around these entries.` : null,
    moodMomentLabel ? `The clearest mood signal was ${moodMomentLabel}.` : null,
  ].filter((part): part is string => Boolean(part));

  return {
    title,
    summary: summaryParts.join(" "),
    signalAnchors: buildSignalAnchors(storylineEntries),
  };
}

function buildStoryWindows(entries: JournalEntryItem[]): JournalStoryWindow[] {
  const windowEntries = entries.slice(0, STORY_WINDOW_ENTRY_SIZE * STORY_WINDOW_LIMIT);

  return Array.from({ length: Math.ceil(windowEntries.length / STORY_WINDOW_ENTRY_SIZE) }, (_, index) => {
    const startIndex = index * STORY_WINDOW_ENTRY_SIZE;
    const currentWindowEntries = windowEntries.slice(startIndex, startIndex + STORY_WINDOW_ENTRY_SIZE);
    const dominantTags = getTopValues(currentWindowEntries.flatMap((entry) => entry.context.derivedTags), 2);
    const lifeEventTitles = getTopValues(
      currentWindowEntries.flatMap((entry) => entry.context.lifeEvents.map((lifeEvent) => lifeEvent.title)),
      2
    );
    const moodMomentLabel = getMoodMomentLabel(currentWindowEntries);
    const averageMoodScore = getAverageMoodScore(currentWindowEntries);
    const title = dominantTags.length
      ? `${titleCase(dominantTags[0])} window`
      : lifeEventTitles.length
        ? `${lifeEventTitles[0]} window`
        : currentWindowEntries[0]?.title ?? "Story window";
    const summaryParts = [
      dominantTags.length
        ? `Journal writing in this stretch kept returning to ${joinPhrases(dominantTags.map((tag) => titleCase(tag)))}.`
        : `${currentWindowEntries.length} journal entr${currentWindowEntries.length === 1 ? "y" : "ies"} sit inside this window.`,
      averageMoodScore != null ? `Average mood tag was ${averageMoodScore}/100.` : null,
      moodMomentLabel ? `The most visible mood shift was ${moodMomentLabel}.` : null,
      lifeEventTitles.length ? `${lifeEventTitles[0]} stayed in view across the same dates.` : null,
    ].filter((part): part is string => Boolean(part));

    return {
      id: `journal-story-window-${index + 1}`,
      title,
      dateRangeLabel: getDateRangeLabel(currentWindowEntries),
      ...getWindowBounds(currentWindowEntries),
      summary: summaryParts.join(" "),
      entryIds: currentWindowEntries.map((entry) => entry.id),
      entryCount: currentWindowEntries.length,
      averageMoodScore,
      moodMomentLabel,
      signalAnchors: buildSignalAnchors(currentWindowEntries),
    };
  }).filter((window) => window.entryCount > 0);
}

export function buildJournalStorytelling(entries: JournalEntryItem[]) {
  return {
    storyline: buildStoryline(entries),
    storyWindows: buildStoryWindows(entries),
  };
}