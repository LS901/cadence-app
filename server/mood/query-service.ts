import { Prisma } from "@prisma/client";
import { endOfDay, format, isSameDay, startOfDay } from "date-fns";
import { buildMockDashboardData, mockLifeEventItems, mockMoodEntries } from "@/lib/data/mock-cadence";
import { buildLifeEventTimeline, lifeEventOverlapsDay } from "@/lib/life-events";
import type { MoodPageData, MoodReflectionEntry } from "@/features/mood/types";
import type { LifeEventsContextData } from "@/features/life-events/types";
import { buildInsightAnalysisSnapshot } from "@/server/insights/analysis";
import type { InsightAnalysisSnapshot } from "@/server/insights/types";

export type FocusWindow = {
  start: Date;
  end: Date;
};

export type MoodEntryRecord = {
  id: string;
  day: Date;
  updatedAt?: Date | null;
  score: number;
  energy?: number | null;
  stress?: number | null;
  sleepHours?: Prisma.Decimal | number | null;
  sleepQuality?: number | null;
  workStress?: number | null;
  socialQuality?: number | null;
  moodStability?: number | null;
  notes?: string | null;
  tags: string[];
  reflectionCompletedAt?: Date | null;
  periods: Array<{
    id: string;
    startMinute: number;
    endMinute: number;
    score: number;
    notes?: string | null;
    tags: string[];
  }>;
};

type MoodQueryDependencies = {
  hasDatabase: boolean;
  buildMockMoodPageData: (focusWindow?: FocusWindow | null) => MoodPageData;
  findMoodEntries: (userId: string) => Promise<MoodEntryRecord[]>;
  getInsightSnapshot: (userId: string) => Promise<InsightAnalysisSnapshot>;
  getLifeEventsContextData: (userId: string) => Promise<LifeEventsContextData>;
  now?: () => Date;
};

function normalizeFocusWindow(window?: FocusWindow | null) {
  if (!window) {
    return null;
  }

  const start = startOfDay(window.start);
  const end = endOfDay(window.end);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
    return null;
  }

  return { start, end };
}

function isWithinFocusWindow(date: Date, window: FocusWindow | null) {
  if (!window) {
    return true;
  }

  return date >= window.start && date <= window.end;
}

function overlapsFocusWindow(event: MoodPageData["recentContext"][number], window: FocusWindow | null) {
  if (!window) {
    return true;
  }

  const startAt = new Date(event.startAtIso);
  const resolvedEnd = event.endAtIso ? new Date(event.endAtIso) : event.isOngoing ? window.end : startAt;

  return startAt <= window.end && resolvedEnd >= window.start;
}

function filterContextForDay(events: MoodPageData["recentContext"], dayIso: string | null | undefined) {
  if (!dayIso) {
    return [];
  }

  const day = new Date(dayIso);

  return events.filter((event) =>
    lifeEventOverlapsDay(
      {
        startAt: new Date(event.startAtIso),
        endAt: event.endAtIso ? new Date(event.endAtIso) : null,
        isOngoing: event.isOngoing,
      },
      day
    )
  );
}

function mapMoodEntry(entry: MoodEntryRecord): MoodReflectionEntry {
  return {
    id: entry.id,
    dayIso: entry.day.toISOString(),
    draftCapturedAtIso: entry.updatedAt?.toISOString() ?? null,
    score: entry.score,
    energy: entry.energy,
    stress: entry.stress,
    sleepHours:
      entry.sleepHours == null
        ? null
        : typeof entry.sleepHours === "number"
          ? entry.sleepHours
          : Number(entry.sleepHours),
    sleepQuality: entry.sleepQuality,
    workStress: entry.workStress,
    socialQuality: entry.socialQuality,
    moodStability: entry.moodStability,
    notes: entry.notes,
    tags: entry.tags,
    reflectionCompletedAtIso: entry.reflectionCompletedAt?.toISOString() ?? null,
    periods: entry.periods.map((period) => ({
      id: period.id,
      startMinute: period.startMinute,
      endMinute: period.endMinute,
      score: period.score,
      notes: period.notes,
      tags: period.tags,
    })),
  };
}

function isRecoverablePrismaError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  );
}

export function buildMockMoodPageData(focusWindow?: FocusWindow | null): MoodPageData {
  const normalizedFocusWindow = normalizeFocusWindow(focusWindow);
  const dashboardData = buildMockDashboardData(normalizedFocusWindow);
  const analysis = buildInsightAnalysisSnapshot({
    activities: [],
    habits: [],
    habitLogs: [],
    journalEntries: [],
    moodEntries: mockMoodEntries,
    lifeEvents: [],
  });
  const mappedEntries = mockMoodEntries.map((entry) => mapMoodEntry(entry));
  const scopedEntries = normalizedFocusWindow
    ? mappedEntries.filter((entry) => isWithinFocusWindow(new Date(entry.dayIso), normalizedFocusWindow))
    : mappedEntries;
  const todayEntry = mappedEntries.find((entry) => isSameDay(new Date(entry.dayIso), new Date())) ?? null;
  const recentEntries = scopedEntries
    .filter((entry) => entry.periods.length || entry.reflectionCompletedAtIso)
    .slice(-5)
    .reverse();
  const currentEntry = recentEntries[0] ?? null;
  const recentContext = normalizedFocusWindow
    ? mockLifeEventItems.filter((event) => overlapsFocusWindow(event, normalizedFocusWindow))
    : dashboardData.recentContext;
  const insightHighlights = analysis.candidates.length
    ? analysis.candidates.slice(0, 2)
    : analysis.exploratoryCandidates.slice(0, 2);

  return {
    dataSource: "mock",
    todayEntry,
    recentEntries,
    moodSeries: normalizedFocusWindow
      ? scopedEntries.map((entry) => ({
          day: format(new Date(entry.dayIso), "EEE"),
          score: entry.score,
          energy: entry.energy ?? entry.score,
        }))
      : dashboardData.moodSeries,
    contextTimeline: dashboardData.contextTimeline,
    currentEntryContext: filterContextForDay(recentContext, currentEntry?.dayIso),
    recentContext,
    insightHighlights,
    insightHighlightMode: analysis.candidates.length ? "PRIMARY" : analysis.exploratoryCandidates.length ? "EXPLORATORY" : "EMPTY",
    insightNullState: analysis.nullState,
  };
}

export function buildMoodPageDataFromSource(
  entries: MoodEntryRecord[],
  insightSnapshot: InsightAnalysisSnapshot,
  contextData: LifeEventsContextData,
  focusWindow?: FocusWindow | null,
  now = new Date()
): MoodPageData {
  const normalizedFocusWindow = normalizeFocusWindow(focusWindow);
  const mappedEntries = entries.map((entry) => mapMoodEntry(entry));
  const scopedEntries = normalizedFocusWindow
    ? mappedEntries.filter((entry) => isWithinFocusWindow(new Date(entry.dayIso), normalizedFocusWindow))
    : mappedEntries;
  const todayEntry = mappedEntries.find((entry) => isSameDay(new Date(entry.dayIso), now)) ?? null;
  const recentEntries = scopedEntries
    .filter((entry) => entry.periods.length || entry.reflectionCompletedAtIso)
    .slice(-5)
    .reverse();
  const currentEntry = recentEntries[0] ?? null;
  const moodSeriesSource = normalizedFocusWindow ? scopedEntries : mappedEntries.slice(-14);
  const scopedContextEvents = normalizedFocusWindow
    ? contextData.lifeEvents.filter((event) => overlapsFocusWindow(event, normalizedFocusWindow))
    : contextData.lifeEvents;
  const moodSeries = moodSeriesSource.map((entry) => ({
    day: format(new Date(entry.dayIso), "EEE"),
    score: entry.score,
    energy: entry.energy ?? entry.score,
  }));
  const insightHighlights = insightSnapshot.candidates.length
    ? insightSnapshot.candidates.slice(0, 2)
    : insightSnapshot.exploratoryCandidates.slice(0, 2);

  return {
    dataSource: "database",
    todayEntry,
    recentEntries,
    moodSeries,
    contextTimeline: buildLifeEventTimeline(
      moodSeriesSource.map((entry) => ({
        day: format(new Date(entry.dayIso), "EEE"),
        date: new Date(entry.dayIso),
      })),
      scopedContextEvents.map((event) => ({
        title: event.title,
        severityScore: event.severityScore,
        sentiment: event.sentiment,
        startAt: new Date(event.startAtIso),
        endAt: event.endAtIso ? new Date(event.endAtIso) : null,
        isOngoing: event.isOngoing,
      }))
    ),
    currentEntryContext: filterContextForDay(scopedContextEvents, currentEntry?.dayIso),
    recentContext: scopedContextEvents.slice(0, 4),
    insightHighlights,
    insightHighlightMode: insightSnapshot.candidates.length ? "PRIMARY" : insightSnapshot.exploratoryCandidates.length ? "EXPLORATORY" : "EMPTY",
    insightNullState: insightSnapshot.nullState,
  };
}

export async function getMoodPageDataWithDependencies(
  userId: string,
  focusWindow: FocusWindow | null | undefined,
  dependencies: MoodQueryDependencies
): Promise<MoodPageData> {
  const normalizedFocusWindow = normalizeFocusWindow(focusWindow);

  if (!dependencies.hasDatabase) {
    return dependencies.buildMockMoodPageData(normalizedFocusWindow);
  }

  try {
    const entries = await dependencies.findMoodEntries(userId);

    if (!entries.length) {
      return {
        dataSource: "database",
        todayEntry: null,
        recentEntries: [],
        moodSeries: [],
        contextTimeline: [],
        currentEntryContext: [],
        recentContext: [],
        insightHighlights: [],
        insightHighlightMode: "EMPTY",
        insightNullState: null,
      };
    }

    const [insightSnapshot, contextData] = await Promise.all([
      dependencies.getInsightSnapshot(userId),
      dependencies.getLifeEventsContextData(userId),
    ]);

    return buildMoodPageDataFromSource(
      entries,
      insightSnapshot,
      contextData,
      normalizedFocusWindow,
      dependencies.now?.() ?? new Date()
    );
  } catch (error) {
    if (isRecoverablePrismaError(error)) {
      return dependencies.buildMockMoodPageData(normalizedFocusWindow);
    }

    throw error;
  }
}