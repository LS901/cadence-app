export type AnalyticsMoodPeriod = {
  id: string;
  moodEntryId: string;
  userId: string;
  day: Date;
  startMinute: number;
  endMinute: number;
  score: number;
  notes?: string | null;
  tags: string[];
};

export type AnalyticsMoodEntry = {
  id: string;
  userId: string;
  day: Date;
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
  periods: AnalyticsMoodPeriod[];
};

export type AnalyticsActivity = {
  id: string;
  userId: string;
  category: string;
  status: string;
  scheduledAt: Date;
};

export type AnalyticsHabit = {
  id: string;
  userId: string;
  type: "POSITIVE" | "NEGATIVE";
  category: string;
};

export type AnalyticsHabitLog = {
  id: string;
  userId: string;
  habitId: string;
  day: Date;
  status: string;
};

export type AnalyticsJournalEntry = {
  id: string;
  userId: string;
  day: Date;
  title?: string | null;
  content: string;
  moodScore?: number | null;
};

export type AnalyticsLifeEvent = {
  id: string;
  userId: string;
  title: string;
  category: string;
  severityScore: number;
  sentiment?: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED" | null;
  startAt: Date;
  endAt?: Date | null;
  isOngoing: boolean;
  tags: string[];
};

export type AnalyticsLifeEventDayExposure = {
  id: string;
  userId: string;
  lifeEventId: string;
  day: Date;
  overlapMinutes: number;
  overlapRatio: number;
  severityScore: number;
  sentiment?: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED" | null;
  weightedImpact: number;
  category: string;
  tags: string[];
};

export type DailyBehaviorFeatureRow = {
  day: Date;
  moodScore: number;
  morningMood: number | null;
  afternoonMood: number | null;
  eveningMood: number | null;
  moodStability: number | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  workStress: number | null;
  socialQuality: number | null;
  completedActivities: number;
  skippedActivities: number;
  exerciseCompleted: number;
  socialCompleted: number;
  sleepActivitiesCompleted: number;
  positiveHabitsCompleted: number;
  negativeHabitsCompleted: number;
  journalEntryCount: number;
  journalSentimentScore: number | null;
  moodPeriodsCount: number;
  activeLifeEventCount: number;
  overlappingLifeEventCount: number;
  negativeLifeEventLoad: number;
  positiveLifeEventLoad: number;
  neutralLifeEventLoad: number;
  totalLifeEventLoad: number;
  confoundedDay: boolean;
  lifeEventCategories: string[];
  lifeEventTags: string[];
  tags: string[];
  previousDayMoodScore: number | null;
  previousDaySleepHours: number | null;
};

export type InsightAnalysisCandidate = {
  id: string;
  title: string;
  summary: string;
  evidenceLevel: "LIMITED" | "EMERGING" | "SUPPORTED";
  evidenceLabel: string;
  evidenceSummary: string;
  adjustmentSummary: string;
  metric:
    | "ACTIVITY_TO_MOOD"
    | "HABIT_TO_MOOD"
    | "SLEEP_TO_MOOD"
    | "SOCIAL_TO_MOOD"
    | "MOOD_STABILITY"
    | "PREVIOUS_DAY_TO_MOOD"
    | "JOURNAL_TO_MOOD"
    | "LIFE_EVENT_TO_MOOD";
  direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  strength: number;
  rawStrength: number;
  adjustedStrength: number;
  confidence: number;
  rawConfidence: number;
  adjustedConfidence: number;
  lagDays: number;
  sampleSize: number;
  exposedDayCount: number;
  alignedDayCount: number;
  confoundedExposedDayCount: number;
  uncertaintySummary: string;
  payload: Record<string, unknown>;
};

export type InsightAnalysisNullState = {
  title: string;
  description: string;
  recommendation: string;
};

export type InsightAnalysisSummary = {
  trackedDays: number;
  minimumReliableDays: number;
  supportedSignals: number;
  emergingSignals: number;
  exploratorySignals: number;
  visibleLagDays: number[];
};

export type InsightAnalysisSnapshot = {
  generatedAt: Date;
  rows: DailyBehaviorFeatureRow[];
  candidates: InsightAnalysisCandidate[];
  exploratoryCandidates: InsightAnalysisCandidate[];
  readiness: "NOT_ENOUGH_DATA" | "EXPLORATORY_ONLY" | "ACTIONABLE";
  nullState: InsightAnalysisNullState | null;
  summary: InsightAnalysisSummary;
};