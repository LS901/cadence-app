export const SLOT_MINUTES = 30;
export const TOTAL_DAY_MINUTES = 24 * 60;

export type MoodPeriodInput = {
  startMinute: number;
  endMinute: number;
  score: number;
  notes?: string | null;
  tags: string[];
};

export function clampMoodScore(score: number) {
  return Math.max(1, Math.min(100, Math.round(score)));
}

export function clampMinute(minute: number) {
  return Math.max(0, Math.min(TOTAL_DAY_MINUTES, Math.round(minute)));
}

export function sortMoodPeriods<T extends MoodPeriodInput>(periods: T[]) {
  return [...periods].sort((left, right) => {
    if (left.startMinute !== right.startMinute) {
      return left.startMinute - right.startMinute;
    }

    return left.endMinute - right.endMinute;
  });
}

export function findOverlappingMoodPeriodIndex(periods: MoodPeriodInput[]) {
  const sortedPeriods = sortMoodPeriods(periods);

  for (let index = 1; index < sortedPeriods.length; index += 1) {
    if (sortedPeriods[index]!.startMinute < sortedPeriods[index - 1]!.endMinute) {
      return index;
    }
  }

  return -1;
}

export function hasOverlappingMoodPeriods(periods: MoodPeriodInput[]) {
  return findOverlappingMoodPeriodIndex(periods) >= 0;
}

export function dedupeTags(tags: string[]) {
  return tags
    .map((tag) => tag.trim().toLowerCase())
    .filter(Boolean)
    .filter((tag, index, items) => items.indexOf(tag) === index);
}

export function parseTagInput(rawValue: string) {
  return dedupeTags(rawValue.split(","));
}

export function minuteToTimeInput(minute: number) {
  const safeMinute = clampMinute(minute);
  const hours = Math.floor(safeMinute / 60);
  const minutes = safeMinute % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

export function timeInputToMinute(value: string) {
  const [rawHours, rawMinutes] = value.split(":");
  const hours = Number(rawHours ?? 0);
  const minutes = Number(rawMinutes ?? 0);

  return clampMinute(hours * 60 + minutes);
}

export function formatMinuteLabel(minute: number) {
  const safeMinute = clampMinute(minute);
  const hours = Math.floor(safeMinute / 60);
  const minutes = safeMinute % 60;
  const normalizedHour = hours % 12 || 12;
  const meridiem = hours >= 12 ? "pm" : "am";

  return `${normalizedHour}${minutes ? `:${String(minutes).padStart(2, "0")}` : ""}${meridiem}`;
}

export function getMoodColorToken(score: number) {
  if (score >= 80) {
    return "var(--mood-5)";
  }

  if (score >= 70) {
    return "var(--mood-4)";
  }

  if (score >= 60) {
    return "var(--mood-3)";
  }

  if (score >= 45) {
    return "var(--mood-2)";
  }

  return "var(--mood-1)";
}

export function deriveMoodSummary(periods: MoodPeriodInput[]) {
  if (!periods.length) {
    return {
      score: null,
      moodStability: null,
      energy: null,
      stress: null,
      tags: [] as string[],
    };
  }

  const normalizedPeriods = sortMoodPeriods(periods).map((period) => ({
    ...period,
    score: clampMoodScore(period.score),
    startMinute: clampMinute(period.startMinute),
    endMinute: clampMinute(period.endMinute),
  }));
  const weightedMoodTotal = normalizedPeriods.reduce(
    (sum, period) => sum + period.score * Math.max(period.endMinute - period.startMinute, 1),
    0
  );
  const totalMinutes = normalizedPeriods.reduce(
    (sum, period) => sum + Math.max(period.endMinute - period.startMinute, 1),
    0
  );
  const scores = normalizedPeriods.map((period) => period.score);
  const spread = Math.max(...scores) - Math.min(...scores);
  const average = totalMinutes ? Math.round(weightedMoodTotal / totalMinutes) : null;
  const moodStability = Math.max(1, Math.min(100, 100 - spread * 2));
  const energy = average == null ? null : Math.max(1, Math.min(100, Math.round(average + 6)));
  const stress = average == null ? null : Math.max(1, Math.min(100, Math.round(100 - average + 8)));

  return {
    score: average,
    moodStability,
    energy,
    stress,
    tags: dedupeTags(normalizedPeriods.flatMap((period) => period.tags)),
  };
}