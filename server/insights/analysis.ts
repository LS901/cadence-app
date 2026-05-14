import type {
  AnalyticsActivity,
  AnalyticsHabit,
  AnalyticsHabitLog,
  AnalyticsJournalEntry,
  AnalyticsLifeEvent,
  AnalyticsLifeEventDayExposure,
  AnalyticsMoodEntry,
  AnalyticsMoodPeriod,
  DailyBehaviorFeatureRow,
  InsightAnalysisCandidate,
  InsightAnalysisSnapshot,
} from "@/server/insights/types";

type AnalysisInput = {
  activities: AnalyticsActivity[];
  habits: AnalyticsHabit[];
  habitLogs: AnalyticsHabitLog[];
  journalEntries: AnalyticsJournalEntry[];
  moodEntries: AnalyticsMoodEntry[];
  lifeEvents?: AnalyticsLifeEvent[];
  lifeEventDayExposures?: AnalyticsLifeEventDayExposure[];
};

const MORNING_END = 12 * 60;
const AFTERNOON_END = 18 * 60;
const MIN_ROWS_FOR_ANALYSIS = 6;
const MIN_ROWS_FOR_RELIABLE_SIGNAL = 8;
const MAX_PRIMARY_CANDIDATES = 4;
const MAX_EXPLORATORY_CANDIDATES = 3;

function dayKey(day: Date) {
  return day.toISOString().slice(0, 10);
}

function average(values: Array<number | null | undefined>) {
  const validValues = values.filter((value): value is number => typeof value === "number");

  if (!validValues.length) {
    return null;
  }

  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
}

function pearsonCorrelation(left: number[], right: number[]) {
  if (left.length !== right.length || left.length < 3) {
    return 0;
  }

  const leftMean = average(left) ?? 0;
  const rightMean = average(right) ?? 0;
  let numerator = 0;
  let leftVariance = 0;
  let rightVariance = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftDelta = left[index] - leftMean;
    const rightDelta = right[index] - rightMean;

    numerator += leftDelta * rightDelta;
    leftVariance += leftDelta * leftDelta;
    rightVariance += rightDelta * rightDelta;
  }

  if (!leftVariance || !rightVariance) {
    return 0;
  }

  return numerator / Math.sqrt(leftVariance * rightVariance);
}

function scoreJournalSentiment(entry: AnalyticsJournalEntry) {
  const content = `${entry.title ?? ""} ${entry.content}`.toLowerCase();
  const positiveTerms = ["clear", "calm", "steady", "good", "better", "energized", "connected", "rested"];
  const negativeTerms = ["tired", "flat", "anxious", "foggy", "scattered", "heavy", "low", "drained"];

  const positiveHits = positiveTerms.filter((term) => content.includes(term)).length;
  const negativeHits = negativeTerms.filter((term) => content.includes(term)).length;

  return Math.max(1, Math.min(100, 50 + positiveHits * 10 - negativeHits * 10));
}

function averagePeriodScore(periods: AnalyticsMoodPeriod[], startMinute: number, endMinute: number) {
  return average(
    periods
      .filter((period) => period.startMinute < endMinute && period.endMinute > startMinute)
      .map((period) => period.score)
  );
}

function uniqueStrings(values: string[]) {
  return values.filter((value, index, items) => items.indexOf(value) === index);
}

function getLifeEventTitlesForDay(lifeEvents: AnalyticsLifeEvent[], day: Date) {
  const dayStart = new Date(day);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  return uniqueStrings(
    lifeEvents
      .filter((event) => {
        const eventEnd = event.endAt ?? dayEnd;
        return event.startAt < dayEnd && eventEnd > dayStart;
      })
      .map((event) => event.title)
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getLifeEventDayContext(lifeEvents: AnalyticsLifeEvent[], day: Date) {
  const dayStart = new Date(day);
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  const activeEvents = lifeEvents
    .map((event) => {
      const eventEnd = event.endAt ?? dayEnd;
      const overlapStart = Math.max(event.startAt.getTime(), dayStart.getTime());
      const overlapEnd = Math.min(eventEnd.getTime(), dayEnd.getTime());
      const overlapMinutes = Math.max(0, Math.round((overlapEnd - overlapStart) / 60_000));

      if (!overlapMinutes) {
        return null;
      }

      const overlapRatio = clamp(overlapMinutes / (24 * 60), 0, 1);
      const severityScore = clamp(event.severityScore, 1, 5);
      const weightedImpact = Number(((severityScore / 5) * overlapRatio).toFixed(3));

      return {
        event,
        weightedImpact,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item != null);

  const negativeLifeEventLoad = Number(
    activeEvents
      .filter((item) => item.event.sentiment === "NEGATIVE")
      .reduce((sum, item) => sum + item.weightedImpact, 0)
      .toFixed(3)
  );
  const positiveLifeEventLoad = Number(
    activeEvents
      .filter((item) => item.event.sentiment === "POSITIVE")
      .reduce((sum, item) => sum + item.weightedImpact, 0)
      .toFixed(3)
  );
  const neutralLifeEventLoad = Number(
    activeEvents
      .filter(
        (item) =>
          item.event.sentiment == null ||
          item.event.sentiment === "NEUTRAL" ||
          item.event.sentiment === "MIXED"
      )
      .reduce((sum, item) => sum + item.weightedImpact, 0)
      .toFixed(3)
  );
  const totalLifeEventLoad = Number(
    Math.min(1.5, activeEvents.reduce((sum, item) => sum + item.weightedImpact, 0)).toFixed(3)
  );

  return {
    activeLifeEventCount: activeEvents.length,
    overlappingLifeEventCount: activeEvents.length > 1 ? activeEvents.length : 0,
    negativeLifeEventLoad,
    positiveLifeEventLoad,
    neutralLifeEventLoad,
    totalLifeEventLoad,
    confoundedDay: totalLifeEventLoad >= 0.45 || negativeLifeEventLoad >= 0.35 || activeEvents.length > 1,
    lifeEventCategories: uniqueStrings(activeEvents.map((item) => item.event.category)),
    lifeEventTags: uniqueStrings(activeEvents.flatMap((item) => item.event.tags)),
  };
}

function getLifeEventDayContextFromExposures(exposures: AnalyticsLifeEventDayExposure[]) {
  const negativeLifeEventLoad = Number(
    exposures
      .filter((exposure) => exposure.sentiment === "NEGATIVE")
      .reduce((sum, exposure) => sum + exposure.weightedImpact, 0)
      .toFixed(3)
  );
  const positiveLifeEventLoad = Number(
    exposures
      .filter((exposure) => exposure.sentiment === "POSITIVE")
      .reduce((sum, exposure) => sum + exposure.weightedImpact, 0)
      .toFixed(3)
  );
  const neutralLifeEventLoad = Number(
    exposures
      .filter(
        (exposure) =>
          exposure.sentiment == null ||
          exposure.sentiment === "NEUTRAL" ||
          exposure.sentiment === "MIXED"
      )
      .reduce((sum, exposure) => sum + exposure.weightedImpact, 0)
      .toFixed(3)
  );
  const totalLifeEventLoad = Number(
    Math.min(1.5, exposures.reduce((sum, exposure) => sum + exposure.weightedImpact, 0)).toFixed(3)
  );

  return {
    activeLifeEventCount: exposures.length,
    overlappingLifeEventCount: exposures.length > 1 ? exposures.length : 0,
    negativeLifeEventLoad,
    positiveLifeEventLoad,
    neutralLifeEventLoad,
    totalLifeEventLoad,
    confoundedDay: totalLifeEventLoad >= 0.45 || negativeLifeEventLoad >= 0.35 || exposures.length > 1,
    lifeEventCategories: uniqueStrings(exposures.map((exposure) => exposure.category)),
    lifeEventTags: uniqueStrings(exposures.flatMap((exposure) => exposure.tags)),
  };
}

function getDirection(value: number): InsightAnalysisCandidate["direction"] {
  if (value > 0.08) {
    return "POSITIVE";
  }

  if (value < -0.08) {
    return "NEGATIVE";
  }

  return "NEUTRAL";
}

function getEvidenceLevel(sampleSize: number, confidence: number): InsightAnalysisCandidate["evidenceLevel"] {
  if (sampleSize >= 12 && confidence >= 0.76) {
    return "SUPPORTED";
  }

  if (sampleSize >= MIN_ROWS_FOR_RELIABLE_SIGNAL && confidence >= 0.62) {
    return "EMERGING";
  }

  return "LIMITED";
}

function getEvidenceLabel(level: InsightAnalysisCandidate["evidenceLevel"]) {
  if (level === "SUPPORTED") {
    return "Supported pattern";
  }

  if (level === "EMERGING") {
    return "Emerging pattern";
  }

  return "Exploratory signal";
}

function getEvidenceSummary(options: {
  evidenceLevel: InsightAnalysisCandidate["evidenceLevel"];
  sampleSize: number;
  lagDays: number;
  confoundedDayShare: number;
}) {
  const windowPhrase =
    options.lagDays === 0
      ? "same-day reflections"
      : `${options.lagDays}-day delayed reflections`;

  if (options.evidenceLevel === "SUPPORTED") {
    return `${getEvidenceLabel(options.evidenceLevel)} across ${options.sampleSize} tracked days of ${windowPhrase}. This remains correlational and should still be read alongside context.`;
  }

  if (options.evidenceLevel === "EMERGING") {
    return `${getEvidenceLabel(options.evidenceLevel)} across ${options.sampleSize} tracked days of ${windowPhrase}. Treat this as directional rather than settled, especially if your routine is still changing.`;
  }

  if (options.confoundedDayShare >= 0.25) {
    return `${getEvidenceLabel(options.evidenceLevel)} across ${options.sampleSize} tracked days of ${windowPhrase}. Logged context is shaping a meaningful share of those days, so this is best used as a reflection prompt, not a conclusion.`;
  }

  return `${getEvidenceLabel(options.evidenceLevel)} across ${options.sampleSize} tracked days of ${windowPhrase}. Use it as a prompt to keep observing before changing anything.`;
}

function getAdjustedCorrelation(rows: DailyBehaviorFeatureRow[], exposure: number[], outcome: number[]) {
  const unconfoundedPairs = rows
    .map((row, index) => ({
      confoundedDay: row.confoundedDay,
      exposure: exposure[index],
      outcome: outcome[index],
    }))
    .filter((pair) => !pair.confoundedDay);

  if (unconfoundedPairs.length < 3) {
    return null;
  }

  return pearsonCorrelation(
    unconfoundedPairs.map((pair) => pair.exposure),
    unconfoundedPairs.map((pair) => pair.outcome)
  );
}

function getAdjustmentSummary(options: {
  confoundedDayShare: number;
  rawStrength: number;
  adjustedStrength: number;
  rawConfidence: number;
  adjustedConfidence: number;
}) {
  if (options.confoundedDayShare <= 0) {
    return `Raw and context-adjusted readings are currently aligned at ${Math.round(options.adjustedConfidence * 100)}% confidence.`;
  }

  const rawStrengthLabel = options.rawStrength.toFixed(2);
  const adjustedStrengthLabel = options.adjustedStrength.toFixed(2);
  const rawConfidenceLabel = Math.round(options.rawConfidence * 100);
  const adjustedConfidenceLabel = Math.round(options.adjustedConfidence * 100);
  const confoundedShareLabel = Math.round(options.confoundedDayShare * 100);

  if (options.adjustedStrength + 0.04 < options.rawStrength) {
    return `Raw strength ${rawStrengthLabel} softens to ${adjustedStrengthLabel} once ${confoundedShareLabel}% context-heavy exposed days are discounted. Confidence shifts from ${rawConfidenceLabel}% to ${adjustedConfidenceLabel}%.`;
  }

  if (options.adjustedStrength > options.rawStrength + 0.04) {
    return `The pattern becomes clearer away from context-heavy days: raw strength ${rawStrengthLabel}, adjusted strength ${adjustedStrengthLabel}. Confidence shifts from ${rawConfidenceLabel}% to ${adjustedConfidenceLabel}%.`;
  }

  return `The relationship holds after context adjustment, but confidence still softens from ${rawConfidenceLabel}% to ${adjustedConfidenceLabel}% because ${confoundedShareLabel}% of exposed days carried meaningful external context.`;
}

function getAlignedDayCount(options: {
  direction: InsightAnalysisCandidate["direction"];
  exposure: number[];
  outcome: number[];
}) {
  const exposedIndexes = options.exposure
    .map((value, index) => ({ value, index }))
    .filter((entry) => entry.value > 0)
    .map((entry) => entry.index);

  if (!exposedIndexes.length || options.direction === "NEUTRAL") {
    return 0;
  }

  const outcomeMean = average(options.outcome) ?? 0;

  return exposedIndexes.filter((index) => {
    const outcome = options.outcome[index] ?? outcomeMean;

    return options.direction === "POSITIVE" ? outcome >= outcomeMean : outcome <= outcomeMean;
  }).length;
}

function buildCandidateStoryAnchors(options: {
  rows: DailyBehaviorFeatureRow[];
  exposure: number[];
  outcome: number[];
  direction: InsightAnalysisCandidate["direction"];
}) {
  if (options.direction === "NEUTRAL") {
    return [];
  }

  const outcomeMean = average(options.outcome) ?? 0;

  return options.rows
    .map((row, index) => ({
      row,
      exposure: options.exposure[index] ?? 0,
      outcome: options.outcome[index] ?? outcomeMean,
    }))
    .filter((entry) => entry.exposure > 0)
    .filter((entry) => entry.row.journalTitles.length > 0 || entry.row.lifeEventTitles.length > 0)
    .map((entry) => {
      const aligned =
        options.direction === "POSITIVE"
          ? entry.outcome >= outcomeMean
          : entry.outcome <= outcomeMean;

      return {
        ...entry,
        aligned,
        rank:
          (aligned ? 4 : 0) +
          (entry.row.journalTitles.length ? 2 : 0) +
          (entry.row.lifeEventTitles.length ? 2 : 0) +
          (entry.row.confoundedDay ? 1 : 0),
      };
    })
    .sort((left, right) => {
      return (
        right.rank - left.rank ||
        right.exposure - left.exposure ||
        right.row.day.getTime() - left.row.day.getTime()
      );
    })
    .slice(0, 2)
    .map((entry) => ({
      dayIso: entry.row.day.toISOString(),
      moodScore: entry.row.moodScore,
      journalTitles: entry.row.journalTitles.slice(0, 2),
      lifeEventTitles: entry.row.lifeEventTitles.slice(0, 2),
      confoundedDay: entry.row.confoundedDay,
    }));
}

function getMetricSpecificCausalityNote(
  metric: InsightAnalysisCandidate["metric"],
  lagDays: number
) {
  if (metric === "SLEEP_TO_MOOD") {
    return lagDays > 0
      ? "Sleep duration alone is not a causal explanation here because quality, timing, and accumulated debt may be doing the real work."
      : "Sleep duration alone is not a causal explanation here because quality and timing may matter more than hours by themselves.";
  }

  if (metric === "SOCIAL_TO_MOOD") {
    return lagDays > 0
      ? "This cannot tell whether next-day recovery came from connection itself, lighter demands, or the kind of plans you had."
      : "This cannot tell whether the lift came from connection itself, reduced strain, or the specific kind of social contact involved.";
  }

  if (metric === "LIFE_EVENT_TO_MOOD") {
    return "Life context is part of the causal background here, but the current model still cannot separate direct effects from overlapping routine changes.";
  }

  return "This remains correlational and should be interpreted alongside recent context rather than as proof of cause.";
}

function getUncertaintySummary(options: {
  metric: InsightAnalysisCandidate["metric"];
  lagDays: number;
  evidenceLevel: InsightAnalysisCandidate["evidenceLevel"];
  sampleSize: number;
  exposedDayCount: number;
  alignedDayCount: number;
  confoundedExposedDayCount: number;
  confoundedDayShare: number;
}) {
  const causalityNote = getMetricSpecificCausalityNote(options.metric, options.lagDays);

  if (options.sampleSize < MIN_ROWS_FOR_RELIABLE_SIGNAL) {
    return `Only ${options.sampleSize} aligned days are currently available, so this should be treated as early signal rather than stable evidence. ${causalityNote}`;
  }

  if (options.exposedDayCount > 0 && options.confoundedDayShare >= 0.35) {
    return `${options.confoundedExposedDayCount} of ${options.exposedDayCount} exposed days were context-heavy, which materially limits how confidently this relationship should be read. ${causalityNote}`;
  }

  if (options.exposedDayCount > 0 && options.alignedDayCount <= Math.ceil(options.exposedDayCount * 0.55)) {
    return `Only ${options.alignedDayCount} of ${options.exposedDayCount} exposed days move in the expected direction, so this pattern may still be fragile. ${causalityNote}`;
  }

  if (options.evidenceLevel === "EMERGING") {
    return `This is directionally promising, but it still needs more repeated aligned days before it should influence planning decisions. ${causalityNote}`;
  }

  return `The signal is relatively stable for now, but it still has clear interpretive limits. ${causalityNote}`;
}

function buildLaggedSeries(
  rows: DailyBehaviorFeatureRow[],
  lagDays: number,
  exposureSelector: (row: DailyBehaviorFeatureRow) => number,
  outcomeSelector: (row: DailyBehaviorFeatureRow) => number
) {
  const exposureRows = lagDays > 0 ? rows.slice(0, -lagDays) : rows;
  const outcomeRows = lagDays > 0 ? rows.slice(lagDays) : rows;

  return {
    rows: exposureRows,
    exposure: exposureRows.map(exposureSelector),
    outcome: outcomeRows.map(outcomeSelector),
  };
}

function buildLaggedCandidate(
  rows: DailyBehaviorFeatureRow[],
  options: Omit<Parameters<typeof buildCandidate>[0], "rows" | "exposure" | "outcome"> & {
    exposureSelector: (row: DailyBehaviorFeatureRow) => number;
    outcomeSelector: (row: DailyBehaviorFeatureRow) => number;
  }
) {
  const laggedSeries = buildLaggedSeries(rows, options.lagDays, options.exposureSelector, options.outcomeSelector);

  return buildCandidate({
    ...options,
    rows: laggedSeries.rows,
    exposure: laggedSeries.exposure,
    outcome: laggedSeries.outcome,
  });
}

function getInsightNullState(options: {
  trackedDays: number;
  primaryCandidates: InsightAnalysisCandidate[];
  exploratoryCandidates: InsightAnalysisCandidate[];
}) {
  if (options.trackedDays < MIN_ROWS_FOR_ANALYSIS) {
    return {
      readiness: "NOT_ENOUGH_DATA" as const,
      nullState: {
        title: "Not enough tracked days yet",
        description: `Cadence needs at least ${MIN_ROWS_FOR_ANALYSIS} reasonably complete days before it can compare behavior against mood with any credibility.`,
        recommendation: "Keep logging mood, context, and a few key behaviors for another few days before reading the insight layer too literally.",
      },
    };
  }

  if (!options.primaryCandidates.length && options.exploratoryCandidates.length) {
    return {
      readiness: "EXPLORATORY_ONLY" as const,
      nullState: {
        title: "Signals exist, but they are still exploratory",
        description: `Cadence can see directional relationships, but none have cleared the stricter reliability bar of ${MIN_ROWS_FOR_RELIABLE_SIGNAL}+ aligned days with enough confidence.`,
        recommendation: "Treat the patterns below as reflection prompts and keep collecting stable data before changing routines because of them.",
      },
    };
  }

  if (!options.primaryCandidates.length) {
    return {
      readiness: "EXPLORATORY_ONLY" as const,
      nullState: {
        title: "No stable pattern is ready to surface",
        description: "The current data does not support a reliable relationship strongly enough to promote into the main insight feed.",
        recommendation: "Keep logging consistently and revisit after a fuller week with context and mood entered on the same days.",
      },
    };
  }

  return {
    readiness: "ACTIONABLE" as const,
    nullState: null,
  };
}

function buildCandidate(options: {
  metric: InsightAnalysisCandidate["metric"];
  lagDays: number;
  rows: DailyBehaviorFeatureRow[];
  exposure: number[];
  outcome: number[];
  title: string;
  positiveSummary: string;
  negativeSummary: string;
  neutralSummary: string;
  exposureLabel: string;
  outcomeLabel: string;
}) {
  const rawCorrelation = pearsonCorrelation(options.exposure, options.outcome);
  const sampleSize = Math.min(options.exposure.length, options.outcome.length);
  const direction = getDirection(rawCorrelation);
  const exposedRowIndexes = options.exposure
    .map((value, index) => ({ value, index }))
    .filter((entry) => entry.value > 0)
    .map((entry) => entry.index);
  const confoundedDayShare = exposedRowIndexes.length
    ? exposedRowIndexes.filter((index) => options.rows[index]?.confoundedDay).length / exposedRowIndexes.length
    : 0;
  const adjustedCorrelation = getAdjustedCorrelation(options.rows, options.exposure, options.outcome) ?? rawCorrelation;
  const rawStrength = Number(Math.abs(rawCorrelation).toFixed(2));
  const adjustedStrength = Number(Math.abs(adjustedCorrelation).toFixed(2));
  const rawConfidence = Number(
    Math.min(0.94, 0.38 + rawStrength * 0.42 + Math.min(sampleSize, 14) / 40).toFixed(2)
  );
  const adjustedConfidence = Number((rawConfidence * (1 - confoundedDayShare * 0.22)).toFixed(2));
  const confidence = adjustedConfidence;
  const strength = adjustedStrength;
  const evidenceLevel = getEvidenceLevel(sampleSize, confidence);
  const exposedDayCount = exposedRowIndexes.length;
  const confoundedExposedDayCount = exposedRowIndexes.filter((index) => options.rows[index]?.confoundedDay).length;
  const alignedDayCount = getAlignedDayCount({
    direction,
    exposure: options.exposure,
    outcome: options.outcome,
  });
  const storyAnchors = buildCandidateStoryAnchors({
    rows: options.rows,
    exposure: options.exposure,
    outcome: options.outcome,
    direction,
  });

  return {
    id: `${options.metric.toLowerCase()}-${options.lagDays}`,
    title: options.title,
    summary:
      direction === "POSITIVE"
        ? options.positiveSummary
        : direction === "NEGATIVE"
          ? options.negativeSummary
          : options.neutralSummary,
    evidenceLevel,
    evidenceLabel: getEvidenceLabel(evidenceLevel),
    evidenceSummary: getEvidenceSummary({
      evidenceLevel,
      sampleSize,
      lagDays: options.lagDays,
      confoundedDayShare,
    }),
    adjustmentSummary: getAdjustmentSummary({
      confoundedDayShare,
      rawStrength,
      adjustedStrength,
      rawConfidence,
      adjustedConfidence,
    }),
    metric: options.metric,
    direction,
    strength,
    rawStrength,
    adjustedStrength,
    confidence,
    rawConfidence,
    adjustedConfidence,
    lagDays: options.lagDays,
    sampleSize,
    exposedDayCount,
    alignedDayCount,
    confoundedExposedDayCount,
    uncertaintySummary: getUncertaintySummary({
      metric: options.metric,
      lagDays: options.lagDays,
      evidenceLevel,
      sampleSize,
      exposedDayCount,
      alignedDayCount,
      confoundedExposedDayCount,
      confoundedDayShare,
    }),
    payload: {
      exposureLabel: options.exposureLabel,
      outcomeLabel: options.outcomeLabel,
      rawCorrelation: Number(rawCorrelation.toFixed(3)),
      adjustedCorrelation: Number(adjustedCorrelation.toFixed(3)),
      sampleSize,
      sameDay: options.lagDays === 0,
      trackedDays: options.rows.length,
      confoundedDayShare: Number(confoundedDayShare.toFixed(3)),
      exposedDayCount,
      alignedDayCount,
      confoundedExposedDayCount,
      rawConfidence,
      adjustedConfidence,
      confounderAdjusted: confoundedDayShare > 0,
      storyAnchors,
    },
  } satisfies InsightAnalysisCandidate;
}

export function buildBehaviorFeatureRows(input: AnalysisInput): DailyBehaviorFeatureRow[] {
  const habitTypeById = new Map(input.habits.map((habit) => [habit.id, habit.type]));
  const lifeEvents = input.lifeEvents ?? [];
  const lifeEventTitleById = new Map(lifeEvents.map((event) => [event.id, event.title]));
  const lifeEventDayExposureGroups = new Map<string, AnalyticsLifeEventDayExposure[]>();
  const activityGroups = new Map<string, AnalyticsActivity[]>();
  const habitLogGroups = new Map<string, AnalyticsHabitLog[]>();
  const journalGroups = new Map<string, AnalyticsJournalEntry[]>();

  for (const activity of input.activities) {
    const key = dayKey(activity.scheduledAt);
    activityGroups.set(key, [...(activityGroups.get(key) ?? []), activity]);
  }

  for (const log of input.habitLogs) {
    const key = dayKey(log.day);
    habitLogGroups.set(key, [...(habitLogGroups.get(key) ?? []), log]);
  }

  for (const entry of input.journalEntries) {
    const key = dayKey(entry.day);
    journalGroups.set(key, [...(journalGroups.get(key) ?? []), entry]);
  }

  for (const exposure of input.lifeEventDayExposures ?? []) {
    const key = dayKey(exposure.day);
    lifeEventDayExposureGroups.set(key, [...(lifeEventDayExposureGroups.get(key) ?? []), exposure]);
  }

  const sortedEntries = [...input.moodEntries].sort((left, right) => left.day.getTime() - right.day.getTime());

  return sortedEntries.map((entry, index) => {
    const key = dayKey(entry.day);
    const activities = activityGroups.get(key) ?? [];
    const habitLogs = habitLogGroups.get(key) ?? [];
    const journalEntries = journalGroups.get(key) ?? [];
    const previousEntry = sortedEntries[index - 1];
    const dayExposures = lifeEventDayExposureGroups.get(key) ?? [];
    const lifeEventContext = dayExposures.length
      ? getLifeEventDayContextFromExposures(dayExposures)
      : getLifeEventDayContext(lifeEvents, entry.day);
    const journalTitles = uniqueStrings(
      journalEntries
        .map((journalEntry) => journalEntry.title?.trim())
        .filter((title): title is string => Boolean(title))
    );
    const lifeEventTitles = dayExposures.length
      ? uniqueStrings(
          dayExposures
            .map((exposure) => lifeEventTitleById.get(exposure.lifeEventId))
            .filter((title): title is string => Boolean(title))
        )
      : getLifeEventTitlesForDay(lifeEvents, entry.day);

    return {
      day: entry.day,
      moodScore: entry.score,
      morningMood: averagePeriodScore(entry.periods, 0, MORNING_END),
      afternoonMood: averagePeriodScore(entry.periods, MORNING_END, AFTERNOON_END),
      eveningMood: averagePeriodScore(entry.periods, AFTERNOON_END, 24 * 60),
      moodStability: entry.moodStability ?? null,
      sleepHours: entry.sleepHours ?? null,
      sleepQuality: entry.sleepQuality ?? null,
      workStress: entry.workStress ?? null,
      socialQuality: entry.socialQuality ?? null,
      completedActivities: activities.filter((activity) => activity.status === "COMPLETED").length,
      skippedActivities: activities.filter((activity) => activity.status === "SKIPPED").length,
      exerciseCompleted: activities.filter(
        (activity) => activity.status === "COMPLETED" && activity.category === "EXERCISE"
      ).length,
      socialCompleted: activities.filter(
        (activity) => activity.status === "COMPLETED" && activity.category === "SOCIAL"
      ).length,
      sleepActivitiesCompleted: activities.filter(
        (activity) => activity.status === "COMPLETED" && activity.category === "SLEEP"
      ).length,
      positiveHabitsCompleted: habitLogs.filter(
        (log) => log.status === "COMPLETED" && habitTypeById.get(log.habitId) === "POSITIVE"
      ).length,
      negativeHabitsCompleted: habitLogs.filter(
        (log) => log.status === "COMPLETED" && habitTypeById.get(log.habitId) === "NEGATIVE"
      ).length,
      journalEntryCount: journalEntries.length,
      journalSentimentScore: average(journalEntries.map(scoreJournalSentiment)),
      journalTitles,
      moodPeriodsCount: entry.periods.length,
      activeLifeEventCount: lifeEventContext.activeLifeEventCount,
      overlappingLifeEventCount: lifeEventContext.overlappingLifeEventCount,
      negativeLifeEventLoad: lifeEventContext.negativeLifeEventLoad,
      positiveLifeEventLoad: lifeEventContext.positiveLifeEventLoad,
      neutralLifeEventLoad: lifeEventContext.neutralLifeEventLoad,
      totalLifeEventLoad: lifeEventContext.totalLifeEventLoad,
      confoundedDay: lifeEventContext.confoundedDay,
      lifeEventTitles,
      lifeEventCategories: lifeEventContext.lifeEventCategories,
      lifeEventTags: lifeEventContext.lifeEventTags,
      tags: entry.tags,
      previousDayMoodScore: previousEntry?.score ?? null,
      previousDaySleepHours: previousEntry?.sleepHours ?? null,
    };
  });
}

function getAllInsightCandidates(rows: DailyBehaviorFeatureRow[]) {
  if (rows.length < MIN_ROWS_FOR_ANALYSIS) {
    return [];
  }

  return [
    buildLaggedCandidate(rows, {
      metric: "ACTIVITY_TO_MOOD",
      lagDays: 0,
      title: "Exercise appears to shift mood later in the day",
      positiveSummary: "Exercise is associated with stronger evening mood on the same day.",
      negativeSummary: "Exercise days are not currently translating into stronger evening mood, which may point to scheduling or recovery factors.",
      neutralSummary: "Exercise is being tracked, but the same-day lift is still statistically soft.",
      exposureLabel: "completed exercise activities",
      outcomeLabel: "evening mood",
      exposureSelector: (row) => row.exerciseCompleted,
      outcomeSelector: (row) => row.eveningMood ?? row.moodScore,
    }),
    buildLaggedCandidate(rows, {
      metric: "ACTIVITY_TO_MOOD",
      lagDays: 1,
      title: "Exercise may still influence the next day",
      positiveSummary: "Exercise is associated with stronger mood the following day, which suggests recovery benefits may outlast the activity itself.",
      negativeSummary: "Exercise is not yet carrying into the next day, which may point to intensity, timing, or recovery friction.",
      neutralSummary: "Exercise may matter beyond the same day, but that delayed signal is still weak.",
      exposureLabel: "completed exercise activities",
      outcomeLabel: "next-day mood",
      exposureSelector: (row) => row.exerciseCompleted,
      outcomeSelector: (row) => row.moodScore,
    }),
    buildLaggedCandidate(rows, {
      metric: "SOCIAL_TO_MOOD",
      lagDays: 0,
      title: "Social activity looks tied to evening recovery",
      positiveSummary: "Social activities are associated with improved evening mood.",
      negativeSummary: "Social activity is currently correlated with lower evening mood, which may point to overstimulation or timing.",
      neutralSummary: "Social activity is logged, but the emotional lift is still inconclusive.",
      exposureLabel: "completed social activities",
      outcomeLabel: "evening mood",
      exposureSelector: (row) => row.socialCompleted,
      outcomeSelector: (row) => row.eveningMood ?? row.moodScore,
    }),
    buildLaggedCandidate(rows, {
      metric: "SOCIAL_TO_MOOD",
      lagDays: 1,
      title: "Social recovery may carry into the next day",
      positiveSummary: "Social connection appears associated with stronger mood the following day.",
      negativeSummary: "Social activity is not yet improving next-day mood, which may mean the current mix is draining rather than restorative.",
      neutralSummary: "Any next-day recovery effect from social activity is still statistically soft.",
      exposureLabel: "completed social activities",
      outcomeLabel: "next-day mood",
      exposureSelector: (row) => row.socialCompleted,
      outcomeSelector: (row) => row.moodScore,
    }),
    buildLaggedCandidate(rows, {
      metric: "SLEEP_TO_MOOD",
      lagDays: 1,
      title: "Sleep patterns carry into the next day",
      positiveSummary: "Higher sleep duration is associated with better mood the following day.",
      negativeSummary: "Longer sleep is not yet improving next-day mood, which may reflect sleep quality rather than duration.",
      neutralSummary: "Sleep is tracked cleanly, but its next-day effect is still muted.",
      exposureLabel: "sleep hours",
      outcomeLabel: "next-day mood",
      exposureSelector: (row) => row.sleepHours ?? 0,
      outcomeSelector: (row) => row.moodScore,
    }),
    buildLaggedCandidate(rows, {
      metric: "SLEEP_TO_MOOD",
      lagDays: 2,
      title: "Sleep debt may spill beyond one day",
      positiveSummary: "Sleep appears associated with mood even two days later, which can happen when recovery or debt compounds.",
      negativeSummary: "More sleep is not translating into better mood two days later, which suggests the issue may be broader than duration alone.",
      neutralSummary: "Sleep may have a longer tail, but the two-day signal is still exploratory.",
      exposureLabel: "sleep hours",
      outcomeLabel: "2-day delayed mood",
      exposureSelector: (row) => row.sleepHours ?? 0,
      outcomeSelector: (row) => row.moodScore,
    }),
    buildLaggedCandidate(rows, {
      metric: "MOOD_STABILITY",
      lagDays: 1,
      title: "Sleep looks linked to next-day stability",
      positiveSummary: "Longer sleep is associated with steadier mood blocks the next day.",
      negativeSummary: "Sleep duration is not currently protecting next-day mood stability.",
      neutralSummary: "Sleep is being logged, but the stability signal is still weak.",
      exposureLabel: "sleep hours",
      outcomeLabel: "next-day mood stability",
      exposureSelector: (row) => row.sleepHours ?? 0,
      outcomeSelector: (row) => row.moodStability ?? 0,
    }),
    buildLaggedCandidate(rows, {
      metric: "PREVIOUS_DAY_TO_MOOD",
      lagDays: 1,
      title: "Destabilizing habits can linger into the morning",
      positiveSummary: "Negative habits are not dragging down the next morning, which suggests resilience or low intensity.",
      negativeSummary: "Negative habits are associated with lower mood the following morning.",
      neutralSummary: "Previous-day negative habits are tracked, but the next-morning impact remains inconclusive.",
      exposureLabel: "negative habits completed",
      outcomeLabel: "next-morning mood",
      exposureSelector: (row) => row.negativeHabitsCompleted,
      outcomeSelector: (row) => row.morningMood ?? row.moodScore,
    }),
    buildLaggedCandidate(rows, {
      metric: "PREVIOUS_DAY_TO_MOOD",
      lagDays: 2,
      title: "Destabilizing habits may take longer to unwind",
      positiveSummary: "Negative habits are not showing a lasting two-day drag, which suggests the disruption may be short-lived.",
      negativeSummary: "Negative habits appear associated with lower mood even two days later.",
      neutralSummary: "Any longer-tail effect from negative habits is still exploratory.",
      exposureLabel: "negative habits completed",
      outcomeLabel: "2-day delayed mood",
      exposureSelector: (row) => row.negativeHabitsCompleted,
      outcomeSelector: (row) => row.morningMood ?? row.moodScore,
    }),
    buildLaggedCandidate(rows, {
      metric: "JOURNAL_TO_MOOD",
      lagDays: 0,
      title: "Journal tone mirrors the emotional curve",
      positiveSummary: "Journal sentiment is moving in the same direction as end-of-day mood.",
      negativeSummary: "Journal sentiment is trending opposite to evening mood, which can indicate useful contrast between narrative and felt state.",
      neutralSummary: "Journal sentiment is present, but it is not yet a stable mood predictor.",
      exposureLabel: "journal sentiment",
      outcomeLabel: "evening mood",
      exposureSelector: (row) => row.journalSentimentScore ?? 50,
      outcomeSelector: (row) => row.eveningMood ?? row.moodScore,
    }),
    buildLaggedCandidate(rows, {
      metric: "LIFE_EVENT_TO_MOOD",
      lagDays: 0,
      title: "Life context is shifting the emotional baseline",
      positiveSummary: "Supportive context appears to lift mood while heavier external strain pulls the baseline downward.",
      negativeSummary: "Context is clearly present, but the logged events are currently mixed enough that the directional effect is still noisy.",
      neutralSummary: "External context is being captured, but its effect on same-day mood is still statistically soft.",
      exposureLabel: "supportive versus adverse life context load",
      outcomeLabel: "same-day mood",
      exposureSelector: (row) => row.positiveLifeEventLoad - row.negativeLifeEventLoad,
      outcomeSelector: (row) => row.eveningMood ?? row.moodScore,
    }),
  ]
    .filter((candidate) => candidate.sampleSize >= MIN_ROWS_FOR_ANALYSIS)
    .sort((left, right) => right.confidence - left.confidence || right.strength - left.strength);
}

export function deriveInsightCandidates(rows: DailyBehaviorFeatureRow[]) {
  return getAllInsightCandidates(rows)
    .filter((candidate) => candidate.evidenceLevel !== "LIMITED")
    .slice(0, MAX_PRIMARY_CANDIDATES);
}

export function buildInsightAnalysisSnapshot(input: AnalysisInput): InsightAnalysisSnapshot {
  const rows = buildBehaviorFeatureRows(input);
  const allCandidates = getAllInsightCandidates(rows);
  const exploratoryCandidates = allCandidates
    .filter((candidate) => candidate.evidenceLevel === "LIMITED")
    .slice(0, MAX_EXPLORATORY_CANDIDATES);
  const primaryCandidates = allCandidates
    .filter((candidate) => candidate.evidenceLevel !== "LIMITED")
    .slice(0, MAX_PRIMARY_CANDIDATES);
  const nullState = getInsightNullState({
    trackedDays: rows.length,
    primaryCandidates,
    exploratoryCandidates,
  });

  return {
    generatedAt: new Date(),
    rows,
    candidates: primaryCandidates,
    exploratoryCandidates,
    readiness: nullState.readiness,
    nullState: nullState.nullState,
    summary: {
      trackedDays: rows.length,
      minimumReliableDays: MIN_ROWS_FOR_RELIABLE_SIGNAL,
      supportedSignals: primaryCandidates.filter((candidate) => candidate.evidenceLevel === "SUPPORTED").length,
      emergingSignals: primaryCandidates.filter((candidate) => candidate.evidenceLevel === "EMERGING").length,
      exploratorySignals: exploratoryCandidates.length,
      visibleLagDays: Array.from(new Set(allCandidates.map((candidate) => candidate.lagDays))).sort(
        (left, right) => left - right
      ),
    },
  };
}