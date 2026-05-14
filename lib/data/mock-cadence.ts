import {
  addDays,
  differenceInCalendarDays,
  endOfDay,
  endOfWeek,
  format,
  isSameDay,
  startOfWeek,
  startOfDay,
  subDays,
  subWeeks,
} from "date-fns";
import {
  buildLifeEventTimeline,
  formatLifeEventWindow,
  getLifeEventCategoryLabel,
  getLifeEventSentimentLabel,
  getLifeEventSeverityLabel,
  type LifeEventTimelinePoint,
} from "@/lib/life-events";
import {
  buildWeeklyReview,
  type DashboardWeeklyReview,
  buildWeeklyReviewArchiveItem,
  type DashboardWeeklyReviewArchiveItem,
} from "@/features/dashboard/lib/weekly-review";
import type { LifeEventItem } from "@/features/life-events/types";
import { defaultMockScenario, type MockScenarioKey } from "@/lib/data/mock-scenarios";

export const demoUser = {
  id: "demo-user",
  name: "Demo Cadence",
  email: "demo@cadence.app",
  password: "cadence-demo",
};

export type MockActivity = {
  id: string;
  userId: string;
  title: string;
  category: "EXERCISE" | "SLEEP" | "SOCIAL" | "FOCUS" | "MINDFULNESS" | "CREATIVE" | "ERRANDS" | "OTHER";
  notes?: string;
  recurring: boolean;
  recurrencePattern?: "DAILY" | "WEEKLY" | "CUSTOM";
  recurrenceCustom?: string;
  scheduledAt: Date;
  status: "SCHEDULED" | "COMPLETED" | "SKIPPED";
  completionMoodScore?: number;
};

export type MockHabit = {
  id: string;
  userId: string;
  name: string;
  category: "MOVEMENT" | "SLEEP" | "NOURISHMENT" | "MINDFULNESS" | "SOCIAL" | "DIGITAL" | "WORK" | "OTHER";
  type: "POSITIVE" | "NEGATIVE";
  targetPerWeek: number;
  notes?: string;
};

export type MockHabitLog = {
  id: string;
  userId: string;
  habitId: string;
  day: Date;
  status: "COMPLETED" | "SKIPPED";
};

export type MockMoodEntry = {
  id: string;
  userId: string;
  day: Date;
  score: number;
  energy: number;
  stress: number;
  sleepHours: number;
  sleepQuality: number;
  workStress: number;
  socialQuality: number;
  notes?: string;
  tags: string[];
  moodStability: number;
  reflectionCompletedAt: Date;
  periods: MockMoodPeriod[];
};

export type MockMoodPeriod = {
  id: string;
  moodEntryId: string;
  userId: string;
  day: Date;
  startMinute: number;
  endMinute: number;
  score: number;
  notes?: string;
  tags: string[];
};

export type MockJournalEntry = {
  id: string;
  userId: string;
  day: Date;
  title: string;
  content: string;
  moodScore?: number;
};

export type MockLifeEvent = {
  id: string;
  userId: string;
  title: string;
  category:
    | "ILLNESS"
    | "GRIEF_LOSS"
    | "FAMILY_STRESS"
    | "RELATIONSHIP_STRESS"
    | "FINANCIAL_STRESS"
    | "BURNOUT"
    | "TRAVEL"
    | "HORMONAL_HEALTH"
    | "MAJOR_POSITIVE"
    | "TRANSITION"
    | "CUSTOM"
    | "OTHER";
  customCategoryLabel?: string;
  description?: string;
  severityScore: number;
  sentiment?: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED";
  startAt: Date;
  endAt?: Date;
  isOngoing: boolean;
  tags: string[];
};

export type MockInsight = {
  id: string;
  userId: string;
  title: string;
  summary: string;
  metric:
    | "ACTIVITY_TO_MOOD"
    | "HABIT_TO_MOOD"
    | "SLEEP_TO_MOOD"
    | "SOCIAL_TO_MOOD"
    | "MOOD_STABILITY"
    | "PREVIOUS_DAY_TO_MOOD"
    | "JOURNAL_TO_MOOD"
    | "LIFE_EVENT_TO_MOOD";
  strength: number;
  confidence: number;
  direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  lagDays: number;
  evidenceLabel: string;
  evidenceLevel: "LIMITED" | "EMERGING" | "SUPPORTED";
  sampleSize: number;
  exposedDayCount: number;
  alignedDayCount: number;
  uncertaintySummary: string;
};

export type DashboardData = {
  overview: Array<{ label: string; value: string; detail: string }>;
  moodSeries: Array<{ day: string; score: number; energy: number }>;
  todayQuickCapture: {
    dayIso: string;
    score: number | null;
    notes: string | null;
    reflectionCompleted: boolean;
    hasPeriods: boolean;
  };
  contextTimeline: LifeEventTimelinePoint[];
  recentContext: LifeEventItem[];
  insights: MockInsight[];
  insightHighlightMode: "PRIMARY" | "EXPLORATORY" | "EMPTY";
  insightNullState: null | { title: string; description: string; recommendation: string };
  weeklyReview: DashboardWeeklyReview;
  weeklyReviewArchive: DashboardWeeklyReviewArchiveItem[];
  recentFeed: Array<{ id: string; title: string; description: string; meta: string }>;
  plannerPreview: Array<{ id: string; title: string; when: string; status: string; category: string }>;
  habitsSnapshot: Array<{ id: string; name: string; progress: number; type: "POSITIVE" | "NEGATIVE" }>;
};

type MockScenarioData = {
  moodEntries: MockMoodEntry[];
  moodPeriods: MockMoodPeriod[];
  habits: MockHabit[];
  habitLogs: MockHabitLog[];
  activities: MockActivity[];
  journalEntries: MockJournalEntry[];
  lifeEvents: MockLifeEvent[];
  lifeEventItems: LifeEventItem[];
  insights: MockInsight[];
};

type DateWindow = {
  start: Date;
  end: Date;
};

const today = startOfDay(new Date());

const moodScores = [62, 64, 67, 71, 69, 76, 79, 74, 77, 81, 75, 72, 78, 83];
const energyScores = [58, 60, 64, 68, 66, 72, 76, 70, 72, 79, 73, 68, 74, 80];
const sleepHours = [6.3, 6.8, 7.1, 7.4, 7.0, 7.8, 8.0, 7.2, 7.4, 8.1, 7.6, 7.0, 7.5, 8.2];
const sleepQualityScores = [2, 3, 3, 4, 3, 4, 5, 3, 4, 5, 4, 3, 4, 5];
const workStressScores = [4, 4, 3, 3, 4, 2, 2, 3, 3, 2, 3, 4, 3, 2];
const socialQualityScores = [2, 3, 3, 4, 2, 4, 5, 3, 4, 5, 3, 2, 4, 5];

const moodPeriodTemplates = [
  [
    { startMinute: 9 * 60, endMinute: 11 * 60, delta: 4, tags: ["focus", "routine"], notes: "Settled in quickly after a steady morning start." },
    { startMinute: 13 * 60, endMinute: 16 * 60, delta: -9, tags: ["work", "energy"], notes: "The afternoon was heavier and more brittle." },
    { startMinute: 19 * 60, endMinute: 22 * 60, delta: 8, tags: ["social", "recovery"], notes: "Mood recovered once the day opened back up." },
  ],
  [
    { startMinute: 8 * 60 + 30, endMinute: 10 * 60 + 30, delta: 2, tags: ["sleep", "calm"], notes: "The morning felt soft but clear." },
    { startMinute: 12 * 60 + 30, endMinute: 15 * 60, delta: -6, tags: ["stress", "meetings"], notes: "Too much context switching pulled the score down." },
    { startMinute: 18 * 60 + 30, endMinute: 21 * 60 + 30, delta: 5, tags: ["home", "reset"], notes: "Evening routines helped the day close cleanly." },
  ],
  [
    { startMinute: 9 * 60, endMinute: 12 * 60, delta: 6, tags: ["exercise", "focus"], notes: "Movement carried the morning." },
    { startMinute: 14 * 60, endMinute: 17 * 60, delta: -4, tags: ["work", "friction"], notes: "There was some drag after lunch, but it stayed manageable." },
    { startMinute: 19 * 60, endMinute: 21 * 60 + 30, delta: 3, tags: ["reflection", "journal"], notes: "A slower evening kept mood stable." },
  ],
  [
    { startMinute: 7 * 60 + 30, endMinute: 10 * 60, delta: -1, tags: ["sleep", "low-energy"], notes: "The morning never fully clicked into place." },
    { startMinute: 12 * 60, endMinute: 15 * 60 + 30, delta: -11, tags: ["stress", "overload"], notes: "This was the emotional trough of the day." },
    { startMinute: 18 * 60, endMinute: 22 * 60, delta: 7, tags: ["friends", "repair"], notes: "Connection helped the evening rebound." },
  ],
];

type MoodSeriesSeed = {
  moodScores: number[];
  energyScores: number[];
  sleepHours: number[];
  sleepQualityScores: number[];
  workStressScores: number[];
  socialQualityScores: number[];
  noteForIndex: (index: number) => string;
};

function clampScore(score: number) {
  return Math.min(100, Math.max(1, score));
}

function getMoodStability(scores: number[]) {
  if (!scores.length) {
    return 50;
  }

  const spread = Math.max(...scores) - Math.min(...scores);

  return Math.max(1, Math.min(100, 100 - spread * 2));
}

function overlapsWindow(startAt: Date, endAt: Date | null | undefined, windowStart: Date, windowEnd: Date) {
  const resolvedEnd = endAt ?? startAt;

  return startAt <= windowEnd && resolvedEnd >= windowStart;
}

function getAverageMood(entries: Array<{ score: number }>) {
  return entries.length
    ? Math.round(entries.reduce((total, entry) => total + entry.score, 0) / entries.length)
    : null;
}

function normalizeDateWindow(window?: DateWindow | null) {
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

function isWithinDateWindow(date: Date, window: DateWindow | null) {
  if (!window) {
    return true;
  }

  return date >= window.start && date <= window.end;
}

function getComparisonWindow(window: DateWindow | null) {
  if (!window) {
    return null;
  }

  const dayCount = differenceInCalendarDays(window.end, window.start) + 1;

  return {
    start: startOfDay(subDays(window.start, dayCount)),
    end: endOfDay(subDays(window.start, 1)),
  };
}

function mapMockLifeEventToItem(event: MockLifeEvent): LifeEventItem {
  return {
    id: event.id,
    title: event.title,
    category: event.category,
    categoryLabel:
      event.category === "CUSTOM" && event.customCategoryLabel
        ? event.customCategoryLabel
        : getLifeEventCategoryLabel(event.category),
    customCategoryLabel: event.customCategoryLabel ?? null,
    description: event.description ?? null,
    severityScore: event.severityScore,
    severityLabel: getLifeEventSeverityLabel(event.severityScore),
    sentiment: event.sentiment ?? null,
    sentimentLabel: getLifeEventSentimentLabel(event.sentiment ?? null),
    startAtIso: event.startAt.toISOString(),
    endAtIso: event.endAt?.toISOString() ?? null,
    isOngoing: event.isOngoing,
    source: "MANUAL",
    isRecurring: false,
    recurrencePattern: null,
    recurrenceInterval: null,
    recurrenceRule: null,
    recurrenceLabel: null,
    seriesTitle: null,
    tags: event.tags,
    windowLabel: formatLifeEventWindow({
      startAt: event.startAt,
      endAt: event.endAt ?? null,
      isOngoing: event.isOngoing,
    }),
  };
}

function buildMockMoodEntriesFromSeed(seed: MoodSeriesSeed): MockMoodEntry[] {
  return seed.moodScores.map((score, index) => {
    const day = subDays(today, seed.moodScores.length - index - 1);
    const template = moodPeriodTemplates[index % moodPeriodTemplates.length];
    const periods = template.map((period, periodIndex) => ({
      id: `mood-period-${index + 1}-${periodIndex + 1}`,
      moodEntryId: `mood-${index + 1}`,
      userId: demoUser.id,
      day,
      startMinute: period.startMinute,
      endMinute: period.endMinute,
      score: clampScore(score + period.delta),
      notes: period.notes,
      tags: period.tags,
    }));

    return {
      id: `mood-${index + 1}`,
      userId: demoUser.id,
      day,
      score,
      energy: seed.energyScores[index],
      stress: 100 - seed.energyScores[index] + 12,
      sleepHours: seed.sleepHours[index],
      sleepQuality: seed.sleepQualityScores[index],
      workStress: seed.workStressScores[index],
      socialQuality: seed.socialQualityScores[index],
      notes: seed.noteForIndex(index),
      tags: periods.flatMap((period) => period.tags).filter((tag, tagIndex, tags) => tags.indexOf(tag) === tagIndex),
      moodStability: getMoodStability(periods.map((period) => period.score)),
      reflectionCompletedAt: new Date(day.getTime() + 21 * 60 * 60 * 1000),
      periods,
    };
  });
}

const flagshipMoodSeries: MoodSeriesSeed = {
  moodScores,
  energyScores,
  sleepHours,
  sleepQualityScores,
  workStressScores,
  socialQualityScores,
  noteForIndex: (index) =>
    index % 3 === 0 ? "Steadier focus after a consistent morning routine." : "Logged as a complete-day reflection.",
};

const alternateMoodSeries: MoodSeriesSeed = {
  moodScores: [74, 72, 69, 64, 61, 63, 67, 71, 73, 69, 72, 76, 80, 82],
  energyScores: [70, 68, 63, 58, 55, 57, 61, 66, 68, 64, 67, 72, 76, 78],
  sleepHours: [7.6, 7.2, 6.9, 5.8, 5.9, 6.3, 6.8, 7.4, 7.6, 7.1, 7.3, 7.8, 8.1, 8.3],
  sleepQualityScores: [4, 4, 3, 2, 2, 3, 3, 4, 4, 3, 4, 4, 5, 5],
  workStressScores: [2, 3, 4, 5, 5, 4, 3, 3, 2, 4, 3, 2, 2, 1],
  socialQualityScores: [4, 4, 3, 2, 2, 3, 3, 4, 4, 2, 3, 4, 4, 5],
  noteForIndex: (index) =>
    index % 3 === 0
      ? "The nervous system felt louder than the calendar suggested."
      : "Logged as a complete-day reflection with a clearer eye on overstimulation and recovery.",
};

export const mockMoodEntries: MockMoodEntry[] = buildMockMoodEntriesFromSeed(flagshipMoodSeries);
const alternateMockMoodEntries: MockMoodEntry[] = buildMockMoodEntriesFromSeed(alternateMoodSeries);

export const mockMoodPeriods: MockMoodPeriod[] = mockMoodEntries.flatMap((entry) => entry.periods);

function buildMockHabitLogsForHabits(habits: MockHabit[]) {
  return Array.from({ length: 21 }, (_, index) => {
    const day = subDays(today, 20 - index);

    return habits.flatMap((habit, habitIndex) => {
      const completed = (index + habitIndex) % (habit.type === "POSITIVE" ? 4 : 5) !== 0;
      const status: MockHabitLog["status"] = completed ? "COMPLETED" : "SKIPPED";

      return {
        id: `habit-log-${habit.id}-${index}`,
        userId: demoUser.id,
        habitId: habit.id,
        day,
        status,
      } satisfies MockHabitLog;
    });
  }).flat();
}

export const mockHabits: MockHabit[] = [
  {
    id: "habit-1",
    userId: demoUser.id,
    name: "Morning walk",
    category: "MOVEMENT",
    type: "POSITIVE",
    targetPerWeek: 5,
    notes: "Low-friction movement before work.",
  },
  {
    id: "habit-2",
    userId: demoUser.id,
    name: "Evening phone cutoff",
    category: "DIGITAL",
    type: "NEGATIVE",
    targetPerWeek: 6,
    notes: "Reduce doomscrolling after 9 PM.",
  },
  {
    id: "habit-3",
    userId: demoUser.id,
    name: "Journaling",
    category: "MINDFULNESS",
    type: "POSITIVE",
    targetPerWeek: 4,
  },
];

const alternateMockHabits: MockHabit[] = [
  {
    id: "habit-alt-1",
    userId: demoUser.id,
    name: "Early laptop shutdown",
    category: "DIGITAL",
    type: "NEGATIVE",
    targetPerWeek: 5,
    notes: "Keep work from bleeding into the final hour of the day.",
  },
  {
    id: "habit-alt-2",
    userId: demoUser.id,
    name: "Phone-free reset walk",
    category: "MOVEMENT",
    type: "POSITIVE",
    targetPerWeek: 4,
    notes: "Use a low-input walk to discharge deadline energy.",
  },
  {
    id: "habit-alt-3",
    userId: demoUser.id,
    name: "Quiet first hour",
    category: "MINDFULNESS",
    type: "POSITIVE",
    targetPerWeek: 5,
    notes: "Protect a slower opening block before messages take over.",
  },
];

export const mockHabitLogs: MockHabitLog[] = buildMockHabitLogsForHabits(mockHabits);
const alternateMockHabitLogs: MockHabitLog[] = buildMockHabitLogsForHabits(alternateMockHabits);

export const mockActivities: MockActivity[] = [
  {
    id: "activity-1",
    userId: demoUser.id,
    title: "Strength session",
    category: "EXERCISE",
    recurring: true,
    recurrencePattern: "WEEKLY",
    scheduledAt: addDays(today, 0),
    status: "COMPLETED",
    completionMoodScore: 82,
    notes: "Higher energy after lunch.",
  },
  {
    id: "activity-2",
    userId: demoUser.id,
    title: "Dinner with friends",
    category: "SOCIAL",
    recurring: false,
    scheduledAt: addDays(today, 1),
    status: "SCHEDULED",
  },
  {
    id: "activity-3",
    userId: demoUser.id,
    title: "Long-form journaling",
    category: "MINDFULNESS",
    recurring: true,
    recurrencePattern: "WEEKLY",
    scheduledAt: addDays(today, 2),
    status: "SCHEDULED",
  },
  {
    id: "activity-4",
    userId: demoUser.id,
    title: "Morning walk",
    category: "EXERCISE",
    recurring: true,
    recurrencePattern: "DAILY",
    scheduledAt: subDays(today, 1),
    status: "COMPLETED",
    completionMoodScore: 79,
  },
  {
    id: "activity-5",
    userId: demoUser.id,
    title: "Sleep wind-down",
    category: "SLEEP",
    recurring: true,
    recurrencePattern: "DAILY",
    scheduledAt: subDays(today, 2),
    status: "COMPLETED",
    completionMoodScore: 74,
  },
  {
    id: "activity-6",
    userId: demoUser.id,
    title: "Coffee catch-up",
    category: "SOCIAL",
    recurring: false,
    scheduledAt: subDays(today, 3),
    status: "SKIPPED",
  },
];

const alternateMockActivities: MockActivity[] = [
  {
    id: "activity-alt-1",
    userId: demoUser.id,
    title: "Phone-free shutdown walk",
    category: "EXERCISE",
    recurring: true,
    recurrencePattern: "WEEKLY",
    scheduledAt: addDays(today, 0),
    status: "COMPLETED",
    completionMoodScore: 80,
    notes: "The evening settled faster once the laptop stayed closed.",
  },
  {
    id: "activity-alt-2",
    userId: demoUser.id,
    title: "Tea and reading wind-down",
    category: "SLEEP",
    recurring: true,
    recurrencePattern: "WEEKLY",
    scheduledAt: subDays(today, 1),
    status: "COMPLETED",
    completionMoodScore: 78,
    notes: "Lower input before bed made the next morning feel less reactive.",
  },
  {
    id: "activity-alt-3",
    userId: demoUser.id,
    title: "Midday stretch reset",
    category: "MINDFULNESS",
    recurring: false,
    scheduledAt: addDays(today, 1),
    status: "SCHEDULED",
  },
  {
    id: "activity-alt-4",
    userId: demoUser.id,
    title: "Keep laptop closed after dinner",
    category: "FOCUS",
    recurring: true,
    recurrencePattern: "DAILY",
    scheduledAt: subDays(today, 4),
    status: "COMPLETED",
    completionMoodScore: 72,
    notes: "Not glamorous, but it stopped the second workday from leaking into the night.",
  },
  {
    id: "activity-alt-5",
    userId: demoUser.id,
    title: "Dinner out without buffer",
    category: "SOCIAL",
    recurring: false,
    scheduledAt: subDays(today, 6),
    status: "SKIPPED",
  },
  {
    id: "activity-alt-6",
    userId: demoUser.id,
    title: "Boundary review journaling",
    category: "MINDFULNESS",
    recurring: false,
    scheduledAt: addDays(today, 2),
    status: "SCHEDULED",
  },
];

export const mockJournalEntries: MockJournalEntry[] = [
  {
    id: "journal-1",
    userId: demoUser.id,
    day: subDays(today, 10),
    title: "Warmth carried the weekend",
    content: "The family celebration weekend gave everything a softer baseline. I felt more patient, slept more deeply, and didn't have to force connection the way I sometimes do after a heavier work stretch.",
    moodScore: 79,
  },
  {
    id: "journal-2",
    userId: demoUser.id,
    day: subDays(today, 7),
    title: "Transit stole the edges of the day",
    content: "Travel day blurred the usual anchors. Meals were later, the morning walk disappeared, and by late afternoon I could feel the brittle kind of tired that makes every small task feel louder.",
    moodScore: 65,
  },
  {
    id: "journal-3",
    userId: demoUser.id,
    day: subDays(today, 6),
    title: "Focus took more effort than usual",
    content: "I got through the work block, but it was all drag instead of flow. The clearer pattern is that disrupted sleep and travel don't just lower energy, they make focus feel expensive for a day or two afterward.",
    moodScore: 67,
  },
  {
    id: "journal-4",
    userId: demoUser.id,
    day: subDays(today, 3),
    title: "Social dip",
    content: "Skipping coffee with friends left the evening flatter than expected. It wasn't dramatic, but the day never fully reopened after work and the apartment felt quieter in the worst way.",
    moodScore: 68,
  },
  {
    id: "journal-5",
    userId: demoUser.id,
    day: subDays(today, 2),
    title: "Routine started to return",
    content: "The morning walk gave the day a better spine. I still felt some residue from the cold and the earlier travel disruption, but movement made it easier to believe the week could stabilize again.",
    moodScore: 74,
  },
  {
    id: "journal-6",
    userId: demoUser.id,
    day: subDays(today, 0),
    title: "Clearer after movement",
    content: "The strength session cut through the usual afternoon fog. I noticed less resistance starting focused work after lunch, and it felt like the first day this week where energy, focus, and mood all pointed in the same direction.",
    moodScore: 82,
  },
  {
    id: "journal-7",
    userId: demoUser.id,
    day: subDays(today, 1),
    title: "Energy held up well",
    content: "Protecting the morning routine gave the rest of the day a calmer shape. Even with the cold still in the background, the day felt less fragile because the basics happened in the right order.",
    moodScore: 77,
  },
];

const alternateMockJournalEntries: MockJournalEntry[] = [
  {
    id: "journal-alt-1",
    userId: demoUser.id,
    day: subDays(today, 10),
    title: "The sprint widened everything",
    content: "The compressed review sprint made even ordinary messages feel sharp. Sleep shortened, I kept reopening the laptop after dinner, and the whole week started to sound louder than it actually was.",
    moodScore: 66,
  },
  {
    id: "journal-alt-2",
    userId: demoUser.id,
    day: subDays(today, 7),
    title: "No margin after the social stretch",
    content: "The crowded stretch wasn't bad on paper, but I never got a real buffer afterward. By the time the weekend ended, the problem wasn't only tiredness. It was how little quiet there had been anywhere in the week.",
    moodScore: 64,
  },
  {
    id: "journal-alt-3",
    userId: demoUser.id,
    day: subDays(today, 5),
    title: "Boundary pattern",
    content: "The clearer pattern is boundary pressure, not motivation. When work keeps leaking past dinner, the next day starts already depleted and focus feels fragile before anything difficult even happens.",
    moodScore: 63,
  },
  {
    id: "journal-alt-4",
    userId: demoUser.id,
    day: subDays(today, 3),
    title: "Quieter input changed the texture",
    content: "A quieter evening and an early shutdown walk made the next morning feel less defended. There was still work to do, but the internal tone was steadier and less ready to flare.",
    moodScore: 76,
  },
  {
    id: "journal-alt-5",
    userId: demoUser.id,
    day: subDays(today, 1),
    title: "Sleep finally moved the floor",
    content: "Two earlier nights in a row changed more than I expected. Mood wasn't dramatically euphoric, but the baseline came up and I stopped burning effort on self-regulation before the day even started.",
    moodScore: 80,
  },
  {
    id: "journal-alt-6",
    userId: demoUser.id,
    day: subDays(today, 0),
    title: "Room to think again",
    content: "Today felt like proof that the quieter resets matter. The biggest difference wasn't productivity. It was having enough margin to think in full sentences again instead of only reacting.",
    moodScore: 82,
  },
];

export const mockLifeEvents: MockLifeEvent[] = [
  {
    id: "life-event-1",
    userId: demoUser.id,
    title: "Cold symptoms and low energy",
    category: "ILLNESS",
    description: "A low-grade cold lingered across multiple days, muting energy and making any mood drop less interpretable as a pure habit or exercise signal.",
    severityScore: 4,
    sentiment: "NEGATIVE",
    startAt: new Date(subDays(today, 2).getTime() + 8 * 60 * 60 * 1000),
    endAt: new Date(today.getTime() + 17 * 60 * 60 * 1000),
    isOngoing: false,
    tags: ["illness", "recovery"],
  },
  {
    id: "life-event-2",
    userId: demoUser.id,
    title: "Travel disruption",
    category: "TRAVEL",
    description: "The travel window broke sleep timing, meals, and the morning routine, which helps explain why focus and energy stayed noisy for a couple of days afterward.",
    severityScore: 3,
    sentiment: "MIXED",
    startAt: new Date(subDays(today, 8).getTime() + 6 * 60 * 60 * 1000),
    endAt: new Date(subDays(today, 7).getTime() + 22 * 60 * 60 * 1000),
    isOngoing: false,
    tags: ["travel", "disruption"],
  },
  {
    id: "life-event-3",
    userId: demoUser.id,
    title: "Family celebration weekend",
    category: "MAJOR_POSITIVE",
    description: "A warmer, more connected weekend than usual likely lifted the emotional baseline before the more disrupted stretch that followed.",
    severityScore: 3,
    sentiment: "POSITIVE",
    startAt: new Date(subDays(today, 11).getTime() + 17 * 60 * 60 * 1000),
    endAt: new Date(subDays(today, 10).getTime() + 23 * 60 * 60 * 1000),
    isOngoing: false,
    tags: ["family", "celebration"],
  },
  {
    id: "life-event-4",
    userId: demoUser.id,
    title: "Compressed review sprint",
    category: "BURNOUT",
    description: "A short burst of deadline-heavy work raised the background stress floor, making the post-travel dip feel sharper than the raw score alone suggests.",
    severityScore: 3,
    sentiment: "NEGATIVE",
    startAt: new Date(subDays(today, 6).getTime() + 9 * 60 * 60 * 1000),
    endAt: new Date(subDays(today, 5).getTime() + 19 * 60 * 60 * 1000),
    isOngoing: false,
    tags: ["workload", "stress"],
  },
];

const alternateMockLifeEvents: MockLifeEvent[] = [
  {
    id: "life-event-alt-1",
    userId: demoUser.id,
    title: "Compressed review sprint",
    category: "BURNOUT",
    description: "A short deadline-heavy stretch raised the background stress floor, so the dip in mood reads more like overload than a clean lifestyle signal.",
    severityScore: 4,
    sentiment: "NEGATIVE",
    startAt: new Date(subDays(today, 10).getTime() + 9 * 60 * 60 * 1000),
    endAt: new Date(subDays(today, 8).getTime() + 20 * 60 * 60 * 1000),
    isOngoing: false,
    tags: ["workload", "stress"],
  },
  {
    id: "life-event-alt-2",
    userId: demoUser.id,
    title: "Crowded weekend commitments",
    category: "TRANSITION",
    description: "Several social obligations landed back to back, which made the week feel fuller than it looked on the calendar and left very little recovery margin.",
    severityScore: 3,
    sentiment: "MIXED",
    startAt: new Date(subDays(today, 7).getTime() + 11 * 60 * 60 * 1000),
    endAt: new Date(subDays(today, 5).getTime() + 22 * 60 * 60 * 1000),
    isOngoing: false,
    tags: ["social", "overload"],
  },
  {
    id: "life-event-alt-3",
    userId: demoUser.id,
    title: "Quieter evenings reset",
    category: "MAJOR_POSITIVE",
    description: "A few deliberately lower-input evenings seemed to restore the baseline faster than trying to push through the overload directly.",
    severityScore: 3,
    sentiment: "POSITIVE",
    startAt: new Date(subDays(today, 3).getTime() + 18 * 60 * 60 * 1000),
    endAt: new Date(today.getTime() + 21 * 60 * 60 * 1000),
    isOngoing: false,
    tags: ["recovery", "sleep"],
  },
];

export const mockLifeEventItems = [...mockLifeEvents]
  .sort((left, right) => right.startAt.getTime() - left.startAt.getTime())
  .map(mapMockLifeEventToItem);

const alternateMockLifeEventItems = [...alternateMockLifeEvents]
  .sort((left, right) => right.startAt.getTime() - left.startAt.getTime())
  .map(mapMockLifeEventToItem);

export const mockInsights: MockInsight[] = [
  {
    id: "insight-1",
    userId: demoUser.id,
    title: "Exercise improves baseline mood",
    summary: "Movement days, especially the morning walk and strength session, consistently interrupt the post-travel and illness fog rather than just nudging the score upward.",
    metric: "ACTIVITY_TO_MOOD",
    strength: 0.68,
    confidence: 0.82,
    direction: "POSITIVE",
    lagDays: 0,
    evidenceLabel: "Supported pattern",
    evidenceLevel: "SUPPORTED",
    sampleSize: 14,
    exposedDayCount: 8,
    alignedDayCount: 6,
    uncertaintySummary: "This looks relatively stable for now, but it should still be interpreted alongside context-heavy days.",
  },
  {
    id: "insight-2",
    userId: demoUser.id,
    title: "Sleep stabilizes the week",
    summary: "Nights above 7.5 hours tend to precede steadier mood blocks once the travel disruption clears, making sleep look more like a stabilizer than a silver bullet.",
    metric: "SLEEP_TO_MOOD",
    strength: 0.61,
    confidence: 0.78,
    direction: "POSITIVE",
    lagDays: 1,
    evidenceLabel: "Emerging pattern",
    evidenceLevel: "EMERGING",
    sampleSize: 10,
    exposedDayCount: 10,
    alignedDayCount: 6,
    uncertaintySummary: "This is directionally promising, but it still needs more repeated aligned days before it should drive decisions.",
  },
  {
    id: "insight-3",
    userId: demoUser.id,
    title: "Social plans matter",
    summary: "Warm social contact appears to restore next-day tone more reliably than solitary recovery, especially after flatter or more isolated evenings.",
    metric: "SOCIAL_TO_MOOD",
    strength: 0.46,
    confidence: 0.7,
    direction: "POSITIVE",
    lagDays: 1,
    evidenceLabel: "Emerging pattern",
    evidenceLevel: "EMERGING",
    sampleSize: 9,
    exposedDayCount: 5,
    alignedDayCount: 3,
    uncertaintySummary: "A smaller number of aligned social days means this pattern is worth watching, but not trusting yet.",
  },
];

const alternateMockInsights: MockInsight[] = [
  {
    id: "insight-alt-1",
    userId: demoUser.id,
    title: "Sleep restores baseline after overload",
    summary: "Two earlier nights in a row appear to do more for the baseline than forcing more output through the tired stretch.",
    metric: "SLEEP_TO_MOOD",
    strength: 0.71,
    confidence: 0.83,
    direction: "POSITIVE",
    lagDays: 1,
    evidenceLabel: "Supported pattern",
    evidenceLevel: "SUPPORTED",
    sampleSize: 14,
    exposedDayCount: 7,
    alignedDayCount: 6,
    uncertaintySummary: "This looks relatively durable in the current story arc, but it still overlaps with intentional quieter evenings and should not be treated as a single-cause answer.",
  },
  {
    id: "insight-alt-2",
    userId: demoUser.id,
    title: "Late-night spillover drags the next day",
    summary: "When work leaks past dinner, the next day starts more brittle and focus takes longer to stabilize.",
    metric: "HABIT_TO_MOOD",
    strength: 0.58,
    confidence: 0.77,
    direction: "NEGATIVE",
    lagDays: 1,
    evidenceLabel: "Emerging pattern",
    evidenceLevel: "EMERGING",
    sampleSize: 10,
    exposedDayCount: 6,
    alignedDayCount: 4,
    uncertaintySummary: "The direction is coherent, but the sample is still small enough that context and timing matter heavily.",
  },
  {
    id: "insight-alt-3",
    userId: demoUser.id,
    title: "Quieter evenings soften reactivity",
    summary: "Lower-input evenings seem to raise next-day steadiness more reliably than adding another optimizing task to the schedule.",
    metric: "JOURNAL_TO_MOOD",
    strength: 0.49,
    confidence: 0.72,
    direction: "POSITIVE",
    lagDays: 1,
    evidenceLabel: "Emerging pattern",
    evidenceLevel: "EMERGING",
    sampleSize: 9,
    exposedDayCount: 5,
    alignedDayCount: 3,
    uncertaintySummary: "Worth watching, but still early enough that it should stay exploratory rather than definitive.",
  },
];

export function getMockScenarioData(scenario: MockScenarioKey = defaultMockScenario): MockScenarioData {
  if (scenario === "alternate") {
    return {
      moodEntries: alternateMockMoodEntries,
      moodPeriods: alternateMockMoodEntries.flatMap((entry) => entry.periods),
      habits: alternateMockHabits,
      habitLogs: alternateMockHabitLogs,
      activities: alternateMockActivities,
      journalEntries: alternateMockJournalEntries,
      lifeEvents: alternateMockLifeEvents,
      lifeEventItems: alternateMockLifeEventItems,
      insights: alternateMockInsights,
    };
  }

  return {
    moodEntries: mockMoodEntries,
    moodPeriods: mockMoodPeriods,
    habits: mockHabits,
    habitLogs: mockHabitLogs,
    activities: mockActivities,
    journalEntries: mockJournalEntries,
    lifeEvents: mockLifeEvents,
    lifeEventItems: mockLifeEventItems,
    insights: mockInsights,
  };
}

export function buildMockDashboardData(
  focusWindow?: DateWindow | null,
  scenario: MockScenarioKey = defaultMockScenario
): DashboardData {
  const scenarioData = getMockScenarioData(scenario);
  const normalizedFocusWindow = normalizeDateWindow(focusWindow);
  const comparisonWindow = getComparisonWindow(normalizedFocusWindow);
  const recentMood = normalizedFocusWindow
    ? scenarioData.moodEntries.filter((entry) => isWithinDateWindow(entry.day, normalizedFocusWindow))
    : scenarioData.moodEntries.slice(-7);
  const previousMood = comparisonWindow
    ? scenarioData.moodEntries.filter((entry) => isWithinDateWindow(entry.day, comparisonWindow))
    : scenarioData.moodEntries.slice(-14, -7);
  const weeklyAverage = Math.round(
    recentMood.reduce((total, entry) => total + entry.score, 0) / Math.max(recentMood.length, 1)
  );
  const previousAverage = Math.round(
    previousMood.reduce((total, entry) => total + entry.score, 0) / Math.max(previousMood.length, 1)
  );
  const weeklyHabitLogs = normalizedFocusWindow
    ? scenarioData.habitLogs.filter((log) => isWithinDateWindow(log.day, normalizedFocusWindow))
    : scenarioData.habitLogs.filter((log) => log.day >= subDays(today, 6));
  const completedHabits = weeklyHabitLogs.filter((log) => log.status === "COMPLETED").length;
  const habitCompletion = Math.round((completedHabits / Math.max(weeklyHabitLogs.length, 1)) * 100);

  const recentActivities = normalizedFocusWindow
    ? scenarioData.activities.filter((activity) => isWithinDateWindow(activity.scheduledAt, normalizedFocusWindow))
    : scenarioData.activities.filter((activity) => activity.scheduledAt >= subDays(today, 6));
  const completedActivities = recentActivities.filter((activity) => activity.status === "COMPLETED").length;
  const activityCompletion = Math.round((completedActivities / Math.max(recentActivities.length, 1)) * 100);
  const scopedJournalEntries = normalizedFocusWindow
    ? scenarioData.journalEntries.filter((entry) => isWithinDateWindow(entry.day, normalizedFocusWindow))
    : scenarioData.journalEntries;
  const weeklyJournalCount = normalizedFocusWindow
    ? scopedJournalEntries.length
    : scenarioData.journalEntries.filter((entry) => entry.day >= subDays(today, 6)).length;

  const journalingStreak = 1 + scenarioData.journalEntries.slice(1).filter((entry) => entry.day >= subDays(today, 9)).length;
  const scopedLifeEvents = normalizedFocusWindow
    ? scenarioData.lifeEventItems.filter((event) =>
        overlapsWindow(
          new Date(event.startAtIso),
          event.endAtIso ? new Date(event.endAtIso) : null,
          normalizedFocusWindow.start,
          normalizedFocusWindow.end
        )
      )
    : scenarioData.lifeEventItems;
  const recentContext = scopedLifeEvents.slice(0, 3);
  const habitsSnapshot = scenarioData.habits.map((habit) => {
    const lastWeek = weeklyHabitLogs.filter((log) => log.habitId === habit.id);
    const completed = lastWeek.filter((log) => log.status === "COMPLETED").length;

    return {
      id: habit.id,
      name: habit.name,
      progress: Math.round((completed / Math.max(lastWeek.length, 1)) * 100),
      type: habit.type,
    };
  });
  const weakestHabit = habitsSnapshot.reduce<(typeof habitsSnapshot)[number] | null>((currentWeakest, habit) => {
    if (!currentWeakest || habit.progress < currentWeakest.progress) {
      return habit;
    }

    return currentWeakest;
  }, null);
  const contextTimeline = buildLifeEventTimeline(
    recentMood.map((entry) => ({ day: format(entry.day, "EEE"), date: entry.day })),
    (normalizedFocusWindow
      ? scenarioData.lifeEvents.filter((event) => overlapsWindow(event.startAt, event.endAt ?? null, normalizedFocusWindow.start, normalizedFocusWindow.end))
      : scenarioData.lifeEvents
    ).map((event) => ({
      title: event.title,
      severityScore: event.severityScore,
      sentiment: event.sentiment ?? null,
      startAt: event.startAt,
      endAt: event.endAt ?? null,
      isOngoing: event.isOngoing,
    }))
  );
  const weeklyReview = buildWeeklyReview({
    recentMoodCount: recentMood.length,
    weeklyAverage,
    previousAverage,
    topInsight: scenarioData.insights[0]
      ? {
          title: scenarioData.insights[0].title,
          summary: scenarioData.insights[0].summary,
          evidenceLabel: scenarioData.insights[0].evidenceLabel,
        }
      : null,
    strongestContext: recentContext[0]
      ? {
          title: recentContext[0].title,
          severityLabel: recentContext[0].severityLabel,
          sentimentLabel: recentContext[0].sentimentLabel,
        }
      : null,
    weakestHabit: weakestHabit
      ? {
          name: weakestHabit.name,
          progress: weakestHabit.progress,
          type: weakestHabit.type,
        }
      : null,
    completedActivities,
    totalActivities: recentActivities.length,
    journalCount: weeklyJournalCount,
    recentExperiment: null,
  });
  const currentWeekStart = startOfWeek(today, { weekStartsOn: 1 });
  const weeklyReviewArchive = Array.from({ length: 3 }, (_, index) => {
    const weekStart = subWeeks(currentWeekStart, index + 1);
    const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
    const previousWeekStart = subWeeks(weekStart, 1);
    const previousWeekEnd = endOfWeek(previousWeekStart, { weekStartsOn: 1 });
    const weekMood = scenarioData.moodEntries.filter((entry) => entry.day >= weekStart && entry.day <= weekEnd);
    const previousWeekMood = scenarioData.moodEntries.filter((entry) => entry.day >= previousWeekStart && entry.day <= previousWeekEnd);
    const weekActivities = scenarioData.activities.filter((activity) => activity.scheduledAt >= weekStart && activity.scheduledAt <= weekEnd);
    const weekJournalEntries = scenarioData.journalEntries.filter((entry) => entry.day >= weekStart && entry.day <= weekEnd);
    const weekLifeEvents = scenarioData.lifeEventItems
      .filter((event) => overlapsWindow(new Date(event.startAtIso), event.endAtIso ? new Date(event.endAtIso) : null, weekStart, weekEnd))
      .sort((left, right) => right.severityScore - left.severityScore);
    const weekHabitLogs = scenarioData.habitLogs.filter((log) => log.day >= weekStart && log.day <= weekEnd);
    const weekWeakestHabit = scenarioData.habits
      .map((habit) => {
        const logsForHabit = weekHabitLogs.filter((log) => log.habitId === habit.id);

        if (!logsForHabit.length) {
          return null;
        }

        const completedForHabit = logsForHabit.filter((log) => log.status === "COMPLETED").length;

        return {
          name: habit.name,
          progress: Math.round((completedForHabit / logsForHabit.length) * 100),
          type: habit.type,
        };
      })
      .filter((habit): habit is { name: string; progress: number; type: "POSITIVE" | "NEGATIVE" } => Boolean(habit))
      .reduce<{ name: string; progress: number; type: "POSITIVE" | "NEGATIVE" } | null>((currentWeakest, habit) => {
        if (!currentWeakest || habit.progress < currentWeakest.progress) {
          return habit;
        }

        return currentWeakest;
      }, null);

    if (!weekMood.length && !weekActivities.length && !weekJournalEntries.length && !weekLifeEvents.length) {
      return null;
    }

    return buildWeeklyReviewArchiveItem(`${format(weekStart, "MMM d")} - ${format(weekEnd, "MMM d")}`, {
      recentMoodCount: weekMood.length,
      weeklyAverage: getAverageMood(weekMood),
      previousAverage: getAverageMood(previousWeekMood),
      topInsight: null,
      strongestContext: weekLifeEvents[0]
        ? {
            title: weekLifeEvents[0].title,
            severityLabel: weekLifeEvents[0].severityLabel,
            sentimentLabel: weekLifeEvents[0].sentimentLabel,
          }
        : null,
      weakestHabit: weekWeakestHabit,
      completedActivities: weekActivities.filter((activity) => activity.status === "COMPLETED").length,
      totalActivities: weekActivities.length,
      journalCount: weekJournalEntries.length,
      recentExperiment: null,
    });
  }).filter((item): item is DashboardWeeklyReviewArchiveItem => Boolean(item));

  return {
    overview: [
      {
        label: "Weekly mood average",
        value: `${weeklyAverage} / 100`,
        detail: `${weeklyAverage - previousAverage >= 0 ? "+" : ""}${weeklyAverage - previousAverage} vs last week`,
      },
      {
        label: "Habit completion",
        value: `${habitCompletion}%`,
        detail: `${completedHabits} of ${weeklyHabitLogs.length} habit logs completed`,
      },
      {
        label: "Activity completion",
        value: `${activityCompletion}%`,
        detail: `${completedActivities} of ${recentActivities.length} planned activities done`,
      },
      {
        label: "Reflection streak",
        value: normalizedFocusWindow ? `${scopedJournalEntries.length} entries` : `${journalingStreak} days`,
        detail: normalizedFocusWindow
          ? `Journal entries inside ${format(normalizedFocusWindow.start, "MMM d")} - ${format(normalizedFocusWindow.end, "MMM d")}`
          : "Daily journaling streak is holding steady",
      },
    ],
    moodSeries: recentMood.map((entry) => ({
      day: format(entry.day, "EEE"),
      score: entry.score,
      energy: entry.energy,
    })),
    todayQuickCapture: {
      dayIso: recentMood.at(-1)?.day.toISOString() ?? today.toISOString(),
      score: recentMood.at(-1)?.score ?? null,
      notes: recentMood.at(-1)?.notes ?? null,
      reflectionCompleted: true,
      hasPeriods: true,
    },
    contextTimeline,
    recentContext,
    insights: scenarioData.insights,
    insightHighlightMode: "PRIMARY",
    insightNullState: null,
    weeklyReview,
    weeklyReviewArchive,
    recentFeed: [
      ...scopedJournalEntries.slice(0, 2).map((entry) => ({
        id: entry.id,
        title: entry.title,
        description: entry.content,
        meta: `${format(entry.day, "EEE d MMM")} · Journal`,
      })),
      ...recentActivities
        .filter((activity) => activity.status !== "SCHEDULED")
        .slice(0, 2)
        .map((activity) => ({
          id: activity.id,
          title: activity.title,
          description:
            activity.status === "COMPLETED"
              ? `Completed with post-activity mood ${activity.completionMoodScore ?? 74}.`
              : "Skipped and logged for insight correlation.",
          meta: `${format(activity.scheduledAt, "EEE d MMM")} · ${activity.category.toLowerCase()}`,
        })),
    ],
    plannerPreview: scenarioData.activities
      .filter((activity) => normalizedFocusWindow ? isWithinDateWindow(activity.scheduledAt, normalizedFocusWindow) : activity.scheduledAt >= subDays(today, 1))
      .slice(0, 4)
      .map((activity) => ({
        id: activity.id,
        title: activity.title,
        when: format(activity.scheduledAt, "EEE h:mm a"),
        status: activity.status.toLowerCase(),
        category: activity.category.toLowerCase(),
      })),
    habitsSnapshot,
  };
}

export function getMockPlannerItems() {
  return mockActivities
    .filter((activity) => activity.scheduledAt >= subDays(today, 1))
    .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime())
    .map((activity) => ({
      ...activity,
      isToday: isSameDay(activity.scheduledAt, today),
      formattedDay: format(activity.scheduledAt, "EEEE, MMM d"),
      formattedTime: format(activity.scheduledAt, "h:mm a"),
    }));
}

export function getLatestMockMoodEntry() {
  return mockMoodEntries.at(-1) ?? null;
}