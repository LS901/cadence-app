import type { LifeEventItem } from "@/features/life-events/types";

export type JournalPromptTemplate = {
  id: string;
  label: string;
  description: string;
  prompt: string;
  whyNow: string;
};

export type JournalEntryMoodHighlight = {
  id: string;
  timeLabel: string;
  score: number;
  tags: string[];
  notes: string | null;
};

export type JournalEntryActivityContext = {
  id: string;
  title: string;
  categoryLabel: string;
  status: "SCHEDULED" | "COMPLETED" | "SKIPPED";
  timeLabel: string;
  completionMoodScore: number | null;
};

export type JournalEntryContext = {
  derivedTags: string[];
  moodScore: number | null;
  moodStability: number | null;
  dominantTags: string[];
  periodHighlights: JournalEntryMoodHighlight[];
  activities: JournalEntryActivityContext[];
  lifeEvents: LifeEventItem[];
  correlationSummary: string | null;
};

export type JournalEntryItem = {
  id: string;
  dayIso: string;
  title: string | null;
  content: string;
  moodScore: number | null;
  excerpt: string;
  wordCount: number;
  context: JournalEntryContext;
};

export type JournalWeekVolume = {
  label: string;
  entryCount: number;
  averageMoodScore: number | null;
};

export type JournalSummary = {
  totalEntries: number;
  entriesThisWeek: number;
  writingStreak: number;
  averageMoodScore: number | null;
};

export type JournalStoryline = {
  title: string;
  summary: string;
  signalAnchors: string[];
};

export type JournalStoryWindow = {
  id: string;
  title: string;
  dateRangeLabel: string;
  windowStartIso: string;
  windowEndIso: string;
  summary: string;
  entryIds: string[];
  entryCount: number;
  averageMoodScore: number | null;
  moodMomentLabel: string | null;
  signalAnchors: string[];
};

export type JournalThemeArchiveItem = {
  tag: string;
  label: string;
  entryCount: number;
  averageMoodScore: number | null;
  latestEntryDayLabel: string;
  dateRangeLabel: string;
  moodTrajectorySummary: string;
  contextSummary: string;
  relatedWindowIds: string[];
  relatedWindowLabels: string[];
  sampleEntryIds: string[];
};

export type JournalInsightOverlay = {
  storyWindowId: string;
  title: string;
  summary: string;
  weeklyReview: {
    title: string;
    summary: string;
    averageMoodScore: number | null;
    comparison: string;
  };
  moodArchive: {
    weekLabel: string | null;
    title: string;
    summary: string;
    averageMoodScore: number | null;
    comparison: string;
  };
};

export type JournalPageData = {
  dataSource: "mock" | "database";
  summary: JournalSummary;
  latestEntry: JournalEntryItem | null;
  recentEntries: JournalEntryItem[];
  weeklyVolume: JournalWeekVolume[];
  storyline: JournalStoryline | null;
  storyWindows: JournalStoryWindow[];
  themeArchive: JournalThemeArchiveItem[];
  insightOverlays: JournalInsightOverlay[];
  availableLifeEvents: LifeEventItem[];
  promptLibrary: JournalPromptTemplate[];
};