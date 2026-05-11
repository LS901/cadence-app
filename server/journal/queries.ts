import { Prisma } from "@prisma/client";
import { addDays, format, startOfDay, subDays } from "date-fns";
import type { LifeEventItem } from "@/features/life-events/types";
import type {
  JournalEntryActivityContext,
  JournalEntryContext,
  JournalEntryItem,
  JournalPageData,
  JournalSummary,
  JournalWeekVolume,
} from "@/features/journal/types";
import { buildWeeklyReview } from "@/features/dashboard/lib/weekly-review";
import { buildJournalInsightOverlays } from "@/features/journal/lib/insight-overlay";
import { buildJournalPromptLibrary } from "@/features/journal/lib/prompt-library";
import { buildJournalStorytelling } from "@/features/journal/lib/storytelling";
import { buildJournalThemeArchive } from "@/features/journal/lib/theme-archive";
import {
  demoUser,
  mockActivities,
  mockJournalEntries,
  mockLifeEventItems,
  mockMoodEntries,
} from "@/lib/data/mock-cadence";
import { db, hasDatabaseUrl } from "@/lib/db";
import { lifeEventOverlapsDay } from "@/lib/life-events";
import { dedupeTags, formatMinuteLabel } from "@/lib/mood";
import { getLifeEventItems } from "@/server/life-events/queries";

const RECENT_ENTRY_LIMIT = 12;
const WEEK_WINDOW = 4;
const DAYS_PER_WEEK = 7;

type JournalEntryRecord = {
  id: string;
  day: Date;
  title: string | null;
  content: string;
  moodScore: number | null;
};

type MoodPeriodRecord = {
  id: string;
  startMinute: number;
  endMinute: number;
  score: number;
  notes: string | null;
  tags: string[];
};

type MoodEntryRecord = {
  day: Date;
  score: number;
  moodStability: number | null;
  tags: string[];
  periods: MoodPeriodRecord[];
};

type ActivityRecord = {
  id: string;
  title: string;
  category: string;
  status: "SCHEDULED" | "COMPLETED" | "SKIPPED";
  scheduledAt: Date;
  completionMoodScore: number | null;
};

function getDayKey(day: Date) {
  return startOfDay(day).toISOString().slice(0, 10);
}

function getExcerpt(content: string) {
  return content.length > 180 ? `${content.slice(0, 177).trimEnd()}...` : content;
}

function getWordCount(content: string) {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function getCategoryLabel(category: string) {
  const normalized = category.toLowerCase().replaceAll("_", " ");

  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

function getContentSignals(entry: JournalEntryRecord) {
  const content = `${entry.title ?? ""} ${entry.content}`.toLowerCase();
  const keywordGroups = [
    { needle: ["energy", "tired", "rested", "fatigue"], tag: "energy" },
    { needle: ["focus", "work", "friction", "flow"], tag: "focus" },
    { needle: ["friend", "social", "conversation", "people"], tag: "social" },
    { needle: ["exercise", "walk", "run", "strength", "movement"], tag: "movement" },
    { needle: ["sleep", "morning", "evening", "routine"], tag: "routine" },
    { needle: ["stress", "overload", "heavy", "fog"], tag: "stress" },
  ];

  return keywordGroups
    .filter((group) => group.needle.some((keyword) => content.includes(keyword)))
    .map((group) => group.tag);
}

function getPeriodHighlights(moodEntry: MoodEntryRecord | null) {
  if (!moodEntry?.periods.length) {
    return [];
  }

  const sortedPeriods = [...moodEntry.periods].sort((left, right) => left.score - right.score);
  const lowestPeriod = sortedPeriods[0];
  const highestPeriod = sortedPeriods.at(-1);

  return [lowestPeriod, highestPeriod]
    .filter((period, index, periods): period is MoodPeriodRecord => {
      if (!period) {
        return false;
      }

      return periods.findIndex((candidate) => candidate?.id === period.id) === index;
    })
    .map((period) => ({
      id: period.id,
      timeLabel: `${formatMinuteLabel(period.startMinute)} to ${formatMinuteLabel(period.endMinute)}`,
      score: period.score,
      tags: period.tags,
      notes: period.notes,
    }));
}

function getCorrelationSummary(
  entry: JournalEntryRecord,
  moodEntry: MoodEntryRecord | null,
  activities: ActivityRecord[],
  lifeEvents: LifeEventItem[]
) {
  const dominantLifeEvent = [...lifeEvents].sort((left, right) => right.severityScore - left.severityScore)[0];

  if (dominantLifeEvent) {
    return `${dominantLifeEvent.title} adds meaningful same-day context, so this entry sits inside that wider life backdrop instead of being read as behavior-only noise.`;
  }

  const completedActivity = activities.find(
    (activity) => activity.status === "COMPLETED" && activity.completionMoodScore != null
  );

  if (completedActivity && completedActivity.completionMoodScore != null && completedActivity.completionMoodScore >= 75) {
    return `${completedActivity.title} landed on a stronger day, with a ${completedActivity.completionMoodScore}/100 completion mood.`;
  }

  if (moodEntry && entry.moodScore != null && Math.abs(moodEntry.score - entry.moodScore) <= 6) {
    return `Your journal mood tag tracks closely with the full-day reflection at ${moodEntry.score}/100.`;
  }

  const lowestPeriod = getPeriodHighlights(moodEntry).find((period) => period.score < 60);
  if (lowestPeriod) {
    return `The hardest stretch showed up around ${lowestPeriod.timeLabel}, which helps anchor the narrative in the day's mood timeline.`;
  }

  return activities.length
    ? `${activities.length} scheduled activity${activities.length === 1 ? "" : "ies"} give this entry more context than mood alone.`
    : null;
}

function buildEntryContext(
  entry: JournalEntryRecord,
  moodEntry: MoodEntryRecord | null,
  activities: ActivityRecord[],
  lifeEvents: LifeEventItem[]
): JournalEntryContext {
  const derivedTags = dedupeTags([
    ...getContentSignals(entry),
    ...(moodEntry?.tags ?? []),
    ...activities.map((activity) => activity.category.toLowerCase().replaceAll("_", " ")),
    ...lifeEvents.flatMap((lifeEvent) => lifeEvent.tags),
  ]).slice(0, 6);

  const mappedActivities: JournalEntryActivityContext[] = activities
    .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime())
    .slice(0, 3)
    .map((activity) => ({
      id: activity.id,
      title: activity.title,
      categoryLabel: getCategoryLabel(activity.category),
      status: activity.status,
      timeLabel: format(activity.scheduledAt, "h:mm a"),
      completionMoodScore: activity.completionMoodScore,
    }));

  return {
    derivedTags,
    moodScore: moodEntry?.score ?? null,
    moodStability: moodEntry?.moodStability ?? null,
    dominantTags: moodEntry?.tags.slice(0, 4) ?? [],
    periodHighlights: getPeriodHighlights(moodEntry),
    activities: mappedActivities,
    lifeEvents: lifeEvents.slice(0, 3),
    correlationSummary: getCorrelationSummary(entry, moodEntry, activities, lifeEvents),
  };
}

function mapJournalEntry(
  entry: JournalEntryRecord,
  moodEntry: MoodEntryRecord | null,
  activities: ActivityRecord[],
  lifeEvents: LifeEventItem[]
): JournalEntryItem {
  return {
    id: entry.id,
    dayIso: entry.day.toISOString(),
    title: entry.title,
    content: entry.content,
    moodScore: entry.moodScore,
    excerpt: getExcerpt(entry.content),
    wordCount: getWordCount(entry.content),
    context: buildEntryContext(entry, moodEntry, activities, lifeEvents),
  };
}

function getLifeEventsForDay(day: Date, lifeEvents: LifeEventItem[]) {
  return lifeEvents.filter((lifeEvent) =>
    lifeEventOverlapsDay(
      {
        startAt: new Date(lifeEvent.startAtIso),
        endAt: lifeEvent.endAtIso ? new Date(lifeEvent.endAtIso) : null,
        isOngoing: lifeEvent.isOngoing,
      },
      day
    )
  );
}

function averageMoodScore(entries: JournalEntryRecord[]) {
  const scores = entries.map((entry) => entry.moodScore).filter((score): score is number => score != null);

  if (!scores.length) {
    return null;
  }

  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function getWritingStreak(entries: JournalEntryRecord[]) {
  const today = startOfDay(new Date());
  const dayKeys = new Set(entries.map((entry) => getDayKey(entry.day)));
  let streak = 0;

  while (dayKeys.has(getDayKey(subDays(today, streak)))) {
    streak += 1;
  }

  return streak;
}

function buildWeeklyVolume(entries: JournalEntryRecord[]) {
  const today = startOfDay(new Date());

  return Array.from({ length: WEEK_WINDOW }, (_, index) => {
    const windowEnd = subDays(today, (WEEK_WINDOW - index - 1) * DAYS_PER_WEEK);
    const windowStart = subDays(windowEnd, DAYS_PER_WEEK - 1);
    const windowEntries = entries.filter(
      (entry) => entry.day >= windowStart && entry.day <= windowEnd
    );

    return {
      label: format(windowStart, "MMM d"),
      entryCount: windowEntries.length,
      averageMoodScore: averageMoodScore(windowEntries),
    } satisfies JournalWeekVolume;
  });
}

function buildSummary(entries: JournalEntryRecord[]): JournalSummary {
  const thisWeekCutoff = subDays(startOfDay(new Date()), DAYS_PER_WEEK - 1);
  const entriesThisWeek = entries.filter((entry) => entry.day >= thisWeekCutoff).length;

  return {
    totalEntries: entries.length,
    entriesThisWeek,
    writingStreak: getWritingStreak(entries),
    averageMoodScore: averageMoodScore(entries.slice(0, RECENT_ENTRY_LIMIT)),
  };
}

function averageMoodRecordScore(entries: Array<{ score: number }>) {
  return entries.length
    ? Math.round(entries.reduce((sum, entry) => sum + entry.score, 0) / entries.length)
    : null;
}

function overlapsWindow(lifeEvent: LifeEventItem, windowStart: Date, windowEnd: Date) {
  const startAt = new Date(lifeEvent.startAtIso);
  const resolvedEnd = lifeEvent.endAtIso
    ? new Date(lifeEvent.endAtIso)
    : lifeEvent.isOngoing
      ? windowEnd
      : startAt;

  return startAt < windowEnd && resolvedEnd >= windowStart;
}

function formatWindowLabel(windowStart: Date, windowEnd: Date) {
  if (windowStart.toDateString() === windowEnd.toDateString()) {
    return format(windowStart, "MMM d");
  }

  return `${format(windowStart, "MMM d")} - ${format(windowEnd, "MMM d")}`;
}

function buildWeeklyReviewSnapshot(
  moodEntries: MoodEntryRecord[],
  activities: ActivityRecord[],
  lifeEvents: LifeEventItem[],
  journalEntries: JournalEntryRecord[]
) {
  const sortedMoodEntries = [...moodEntries].sort((left, right) => left.day.getTime() - right.day.getTime());
  const recentMood = sortedMoodEntries.slice(-DAYS_PER_WEEK);
  const previousMood = sortedMoodEntries.slice(-DAYS_PER_WEEK * 2, -DAYS_PER_WEEK);
  const weeklyAverage = averageMoodRecordScore(recentMood);
  const previousAverage = averageMoodRecordScore(previousMood);
  const reviewWindowStart = subDays(startOfDay(new Date()), DAYS_PER_WEEK - 1);
  const reviewWindowEnd = addDays(startOfDay(new Date()), 1);
  const recentActivities = activities.filter(
    (activity) => activity.scheduledAt >= reviewWindowStart && activity.scheduledAt < reviewWindowEnd
  );
  const recentContext = lifeEvents
    .filter((lifeEvent) => overlapsWindow(lifeEvent, reviewWindowStart, reviewWindowEnd))
    .sort((left, right) => right.severityScore - left.severityScore);
  const review = buildWeeklyReview({
    recentMoodCount: recentMood.length,
    weeklyAverage,
    previousAverage: previousMood.length ? previousAverage : null,
    topInsight: null,
    strongestContext: recentContext[0]
      ? {
          title: recentContext[0].title,
          severityLabel: recentContext[0].severityLabel,
          sentimentLabel: recentContext[0].sentimentLabel,
        }
      : null,
    weakestHabit: null,
    completedActivities: recentActivities.filter((activity) => activity.status === "COMPLETED").length,
    totalActivities: recentActivities.length,
    journalCount: journalEntries.filter((entry) => entry.day >= reviewWindowStart).length,
  });

  return {
    title: review.title,
    summary: review.summary,
    averageMoodScore: weeklyAverage,
  };
}

function buildMoodArchiveSnapshots(
  moodEntries: MoodEntryRecord[],
  activities: ActivityRecord[],
  lifeEvents: LifeEventItem[],
  journalEntries: JournalEntryRecord[]
) {
  const sortedMoodEntries = [...moodEntries].sort((left, right) => left.day.getTime() - right.day.getTime());

  return Array.from({ length: 2 }, (_, index) => {
    const currentEndExclusive = sortedMoodEntries.length - DAYS_PER_WEEK * (index + 1);
    const currentStart = Math.max(0, currentEndExclusive - DAYS_PER_WEEK);
    const archiveMood = sortedMoodEntries.slice(currentStart, currentEndExclusive);
    const previousStart = Math.max(0, currentStart - DAYS_PER_WEEK);
    const previousMood = sortedMoodEntries.slice(previousStart, currentStart);

    if (!archiveMood.length) {
      return null;
    }

    const windowStart = startOfDay(archiveMood[0].day);
    const windowEnd = addDays(startOfDay(archiveMood.at(-1)?.day ?? archiveMood[0].day), 1);
    const archiveActivities = activities.filter(
      (activity) => activity.scheduledAt >= windowStart && activity.scheduledAt < windowEnd
    );
    const archiveJournalEntries = journalEntries.filter(
      (entry) => entry.day >= windowStart && entry.day < windowEnd
    );
    const archiveContext = lifeEvents
      .filter((lifeEvent) => overlapsWindow(lifeEvent, windowStart, windowEnd))
      .sort((left, right) => right.severityScore - left.severityScore);
    const review = buildWeeklyReview({
      recentMoodCount: archiveMood.length,
      weeklyAverage: averageMoodRecordScore(archiveMood),
      previousAverage: previousMood.length ? averageMoodRecordScore(previousMood) : null,
      topInsight: null,
      strongestContext: archiveContext[0]
        ? {
            title: archiveContext[0].title,
            severityLabel: archiveContext[0].severityLabel,
            sentimentLabel: archiveContext[0].sentimentLabel,
          }
        : null,
      weakestHabit: null,
      completedActivities: archiveActivities.filter((activity) => activity.status === "COMPLETED").length,
      totalActivities: archiveActivities.length,
      journalCount: archiveJournalEntries.length,
    });

    return {
      weekLabel: formatWindowLabel(windowStart, subDays(windowEnd, 1)),
      title: review.title,
      summary: review.summary,
      averageMoodScore: averageMoodRecordScore(archiveMood),
    };
  }).filter((snapshot): snapshot is { weekLabel: string; title: string; summary: string; averageMoodScore: number | null } => Boolean(snapshot));
}

export function buildJournalPageDataFromSourceData(
  source: "mock" | "database",
  entries: JournalEntryRecord[],
  moodEntries: MoodEntryRecord[],
  activities: ActivityRecord[],
  lifeEvents: LifeEventItem[]
): JournalPageData {
  const sortedEntries = [...entries].sort((left, right) => right.day.getTime() - left.day.getTime());
  const summary = buildSummary(sortedEntries);
  const moodEntriesByDay = new Map(moodEntries.map((entry) => [getDayKey(entry.day), entry]));
  const activitiesByDay = activities.reduce<Map<string, ActivityRecord[]>>((map, activity) => {
    const key = getDayKey(activity.scheduledAt);
    const existing = map.get(key) ?? [];

    map.set(key, [...existing, activity]);
    return map;
  }, new Map());
  const mappedEntries = sortedEntries.map((entry) =>
    mapJournalEntry(
      entry,
      moodEntriesByDay.get(getDayKey(entry.day)) ?? null,
      activitiesByDay.get(getDayKey(entry.day)) ?? [],
      getLifeEventsForDay(entry.day, lifeEvents)
    )
  );
  const recentEntries = mappedEntries.slice(0, RECENT_ENTRY_LIMIT);
  const storytelling = buildJournalStorytelling(recentEntries);
  const themeArchive = buildJournalThemeArchive(recentEntries, storytelling.storyWindows);
  const weeklyReviewSnapshot = buildWeeklyReviewSnapshot(moodEntries, activities, lifeEvents, sortedEntries);
  const moodArchiveSnapshots = buildMoodArchiveSnapshots(moodEntries, activities, lifeEvents, sortedEntries);

  return {
    dataSource: source,
    summary,
    latestEntry: mappedEntries[0] ?? null,
    recentEntries,
    weeklyVolume: buildWeeklyVolume(sortedEntries),
    storyline: storytelling.storyline,
    storyWindows: storytelling.storyWindows,
    themeArchive,
    insightOverlays: buildJournalInsightOverlays({
      storyWindows: storytelling.storyWindows,
      weeklyReview: weeklyReviewSnapshot,
      moodArchive: moodArchiveSnapshots,
    }),
    availableLifeEvents: lifeEvents,
    promptLibrary: buildJournalPromptLibrary({
      latestEntry: mappedEntries[0] ?? null,
      recentEntries,
      summary,
      availableLifeEvents: lifeEvents,
    }),
  };
}

export function buildMockJournalPageData() {
  const moodEntries = mockMoodEntries.map((entry) => ({
    day: entry.day,
    score: entry.score,
    moodStability: entry.moodStability,
    tags: entry.tags,
    periods: entry.periods.map((period) => ({
      id: period.id,
      startMinute: period.startMinute,
      endMinute: period.endMinute,
      score: period.score,
      notes: period.notes ?? null,
      tags: period.tags,
    })),
  }));
  const activities = mockActivities.map((activity) => ({
    id: activity.id,
    title: activity.title,
    category: activity.category,
    status: activity.status,
    scheduledAt: activity.scheduledAt,
    completionMoodScore: activity.completionMoodScore ?? null,
  }));

  return buildJournalPageDataFromSourceData(
    "mock",
    mockJournalEntries.map((entry) => ({
      id: entry.id,
      day: entry.day,
      title: entry.title ?? null,
      content: entry.content,
      moodScore: entry.moodScore ?? null,
    })),
    moodEntries,
    activities,
    mockLifeEventItems
  );
}

export type JournalQuerySourceData = {
  moodEntries: MoodEntryRecord[];
  activities: ActivityRecord[];
  lifeEvents: LifeEventItem[];
};

type JournalQueryDependencies = {
  hasDatabase: boolean;
  buildMockJournalPageData: () => JournalPageData;
  findJournalEntries: (userId: string) => Promise<JournalEntryRecord[]>;
  loadJournalSourceData: (
    userId: string,
    rangeStart: Date | null,
    rangeEnd: Date | null
  ) => Promise<JournalQuerySourceData>;
};

function buildEmptyJournalPageData(): JournalPageData {
  const summary = buildSummary([]);

  return {
    dataSource: "database",
    summary,
    latestEntry: null,
    recentEntries: [],
    weeklyVolume: buildWeeklyVolume([]),
    storyline: null,
    storyWindows: [],
    themeArchive: [],
    insightOverlays: [],
    availableLifeEvents: [],
    promptLibrary: buildJournalPromptLibrary({
      latestEntry: null,
      recentEntries: [],
      summary,
      availableLifeEvents: [],
    }),
  };
}

export async function getJournalPageDataWithDependencies(
  userId: string,
  dependencies: JournalQueryDependencies
): Promise<JournalPageData> {
  if (!dependencies.hasDatabase) {
    return dependencies.buildMockJournalPageData();
  }

  try {
    const entries = await dependencies.findJournalEntries(userId);

    if (!entries.length) {
      return buildEmptyJournalPageData();
    }

    const dayKeys = [...new Set(entries.map((entry) => getDayKey(entry.day)))];
    const rangeStart = dayKeys.reduce<Date | null>((current, dayKey) => {
      const day = new Date(`${dayKey}T00:00:00`);

      return !current || day < current ? day : current;
    }, null);
    const rangeEnd = dayKeys.reduce<Date | null>((current, dayKey) => {
      const day = addDays(new Date(`${dayKey}T00:00:00`), 1);

      return !current || day > current ? day : current;
    }, null);
    const sourceData = await dependencies.loadJournalSourceData(userId, rangeStart, rangeEnd);

    return buildJournalPageDataFromSourceData(
      "database",
      entries,
      sourceData.moodEntries,
      sourceData.activities,
      sourceData.lifeEvents
    );
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientInitializationError ||
      error instanceof Prisma.PrismaClientValidationError ||
      error instanceof Prisma.PrismaClientKnownRequestError ||
      error instanceof Prisma.PrismaClientUnknownRequestError
    ) {
      return dependencies.buildMockJournalPageData();
    }

    throw error;
  }
}

export async function getJournalPageData(userId = demoUser.id): Promise<JournalPageData> {
  return getJournalPageDataWithDependencies(userId, {
    hasDatabase: hasDatabaseUrl && Boolean(db?.journalEntry),
    buildMockJournalPageData,
    findJournalEntries: async (currentUserId) => {
      const entries = await db!.journalEntry.findMany({
        where: { userId: currentUserId },
        orderBy: [{ day: "desc" }, { createdAt: "desc" }],
        take: 40,
      });

      return entries.map((entry) => ({
        id: entry.id,
        day: entry.day,
        title: entry.title,
        content: entry.content,
        moodScore: entry.moodScore,
      }));
    },
    loadJournalSourceData: async (currentUserId, rangeStart, rangeEnd) => {
      const [moodEntries, activities, lifeEvents] = await Promise.all([
        db!.moodEntry.findMany({
          where: {
            userId: currentUserId,
          },
          orderBy: { day: "asc" },
          take: 35,
          include: {
            periods: {
              orderBy: {
                startMinute: "asc",
              },
            },
          },
        }),
        rangeStart && rangeEnd
          ? db!.activity.findMany({
              where: {
                userId: currentUserId,
                scheduledAt: {
                  gte: rangeStart < subDays(startOfDay(new Date()), 21) ? rangeStart : subDays(startOfDay(new Date()), 21),
                  lt: rangeEnd > addDays(startOfDay(new Date()), 1) ? rangeEnd : addDays(startOfDay(new Date()), 1),
                },
              },
              orderBy: {
                scheduledAt: "asc",
              },
            })
          : Promise.resolve([]),
        getLifeEventItems(currentUserId),
      ]);

      return {
        moodEntries: moodEntries.map((entry) => ({
          day: entry.day,
          score: entry.score,
          moodStability: entry.moodStability,
          tags: entry.tags,
          periods: entry.periods.map((period) => ({
            id: period.id,
            startMinute: period.startMinute,
            endMinute: period.endMinute,
            score: period.score,
            notes: period.notes,
            tags: period.tags,
          })),
        })),
        activities: activities.map((activity) => ({
          id: activity.id,
          title: activity.title,
          category: activity.category,
          status: activity.status,
          scheduledAt: activity.scheduledAt,
          completionMoodScore: activity.completionMoodScore,
        })),
        lifeEvents,
      };
    },
  });
}