export type HabitCategoryValue =
  | "MOVEMENT"
  | "SLEEP"
  | "NOURISHMENT"
  | "MINDFULNESS"
  | "SOCIAL"
  | "DIGITAL"
  | "WORK"
  | "OTHER";

export type HabitTypeValue = "POSITIVE" | "NEGATIVE";

export type HabitLogStatusValue = "COMPLETED" | "SKIPPED";

export type HabitDayStatus = HabitLogStatusValue | "PENDING";

export type HabitDayCell = {
  dayIso: string;
  shortLabel: string;
  label: string;
  status: HabitDayStatus;
  isToday: boolean;
};

export type HabitTrendWeek = {
  label: string;
  alignedDays: number;
  loggedDays: number;
  progress: number;
  targetHit: boolean;
};

export type HabitItem = {
  id: string;
  name: string;
  category: HabitCategoryValue;
  type: HabitTypeValue;
  notes: string | null;
  targetPerWeek: number;
  targetProgress: number;
  alignedDays: number;
  streak: number;
  todayStatus: HabitLogStatusValue | null;
  historyDays: HabitDayCell[];
  recentDays: HabitDayCell[];
  trendWeeks: HabitTrendWeek[];
};

export type HabitsSummary = {
  activeHabits: number;
  onTrackToday: number;
  weeklyConsistencyRate: number;
  bestStreak: number;
};

export type HabitsPageData = {
  dataSource: "mock" | "database";
  summary: HabitsSummary;
  positiveHabits: HabitItem[];
  negativeHabits: HabitItem[];
};