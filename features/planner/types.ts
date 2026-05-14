import type { LifeEventItem } from "@/features/life-events/types";
import type { ActivityCategory, ActivityExperimentOutcome, ActivityStatus } from "@prisma/client";
import type { InsightAnalysisNullState } from "@/server/insights/types";

export type PlannerRecurrencePattern = "DAILY" | "WEEKLY" | "CUSTOM";

export type PlannerActivityItem = {
  id: string;
  templateId?: string | null;
  title: string;
  category: ActivityCategory;
  status: ActivityStatus;
  notes?: string | null;
  recurring: boolean;
  recurrencePattern?: PlannerRecurrencePattern | null;
  recurrenceCustom?: string | null;
  scheduledAtIso: string;
  scheduledTimeLabel: string;
  isFuture: boolean;
  durationMinutes?: number | null;
  experimentHypothesis?: string | null;
  experimentObservationPrompt?: string | null;
  experimentReviewWindowDays?: number | null;
  experimentUncertaintyNote?: string | null;
  experimentOutcome?: ActivityExperimentOutcome | null;
  experimentOutcomeNote?: string | null;
  experimentReviewedAtIso?: string | null;
  completionMoodScore?: number | null;
};

export type PlannerActivityHistory = {
  templateId: string;
  title: string;
  category: ActivityCategory;
  notes?: string | null;
  defaultDurationMinutes?: number | null;
  completionCount: number;
  totalCount: number;
  averageMoodScore?: number | null;
  lastCompletedAtIso?: string | null;
};

export type PlannerDayContext = {
  activeCount: number;
  dominantTitle: string | null;
  dominantSentiment: string | null;
  categories: string[];
};

export type PlannerDay = {
  dateKey: string;
  shortLabel: string;
  fullLabel: string;
  dayNumber: string;
  isToday: boolean;
  context: PlannerDayContext;
  items: PlannerActivityItem[];
};

export type PlannerSummary = {
  total: number;
  scheduled: number;
  completed: number;
  skipped: number;
  recurring: number;
  completionRate: number;
};

export type PlannerData = {
  dataSource: "database" | "mock";
  weekLabel: string;
  days: PlannerDay[];
  summary: PlannerSummary;
  activityHistory: PlannerActivityHistory[];
  lifeEvents: LifeEventItem[];
};

export type PlannerSuggestedActivityDraft = {
  title: string;
  historyAnchorTitle?: string | null;
  category: ActivityCategory;
  notes: string;
  hypothesis: string;
  observationPrompt: string;
  reviewWindowDays: string;
  uncertaintyNote: string;
  durationMinutes: string;
  recurring: boolean;
  recurrencePattern: "" | PlannerRecurrencePattern;
};

export type PlannerInsightHighlight = {
  id: string;
  title: string;
  summary: string;
  confidence: number;
  lagDays: number;
  evidenceLabel: string;
  evidenceLevel: "LIMITED" | "EMERGING" | "SUPPORTED";
  sampleSize: number;
  exposedDayCount: number;
  alignedDayCount: number;
  uncertaintySummary: string;
};

export type PlannerInsightHighlightMode = "PRIMARY" | "EXPLORATORY" | "EMPTY";

export type PlannerInsightState = {
  mode: PlannerInsightHighlightMode;
  nullState: InsightAnalysisNullState | null;
};