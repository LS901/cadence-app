import type { LifeEventItem } from "@/features/life-events/types";
import type { LifeEventTimelinePoint } from "@/lib/life-events";
import type { InsightAnalysisCandidate, InsightAnalysisNullState } from "@/server/insights/types";

export type MoodReflectionPeriod = {
  id: string;
  startMinute: number;
  endMinute: number;
  score: number;
  notes?: string | null;
  tags: string[];
};

export type MoodReflectionEntry = {
  id: string;
  dayIso: string;
  draftCapturedAtIso?: string | null;
  score: number;
  energy?: number | null;
  stress?: number | null;
  sleepHours?: number | null;
  sleepQuality?: number | null;
  workStress?: number | null;
  socialQuality?: number | null;
  moodStability?: number | null;
  notes?: string | null;
  tags: string[];
  periods: MoodReflectionPeriod[];
  reflectionCompletedAtIso?: string | null;
};

export type MoodPageData = {
  dataSource: "database" | "mock";
  todayEntry: MoodReflectionEntry | null;
  recentEntries: MoodReflectionEntry[];
  moodSeries: Array<{ day: string; score: number; energy: number }>;
  contextTimeline: LifeEventTimelinePoint[];
  currentEntryContext: LifeEventItem[];
  recentContext: LifeEventItem[];
  insightHighlights: InsightAnalysisCandidate[];
  insightHighlightMode: "PRIMARY" | "EXPLORATORY" | "EMPTY";
  insightNullState: InsightAnalysisNullState | null;
};