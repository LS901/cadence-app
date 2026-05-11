type PlannerSuggestionCategory =
  | "EXERCISE"
  | "SLEEP"
  | "SOCIAL"
  | "FOCUS"
  | "MINDFULNESS"
  | "CREATIVE"
  | "ERRANDS"
  | "OTHER";

export type DashboardWeeklyReview = {
  title: string;
  summary: string;
  momentumLabel: string;
  momentumDetail: string;
  signalLabel: string;
  signalDetail: string;
  contextLabel: string;
  contextDetail: string;
  nextStep: string;
  plannerSuggestion: {
    title: string;
    historyAnchorTitle: string | null;
    category: PlannerSuggestionCategory;
    notes: string;
    durationMinutes: number;
    recurring: boolean;
    recurrencePattern: "" | "WEEKLY";
  };
};

export type DashboardWeeklyReviewArchiveItem = {
  weekLabel: string;
  title: string;
  summary: string;
  nextStep: string;
};

type WeeklyReviewInput = {
  recentMoodCount: number;
  weeklyAverage: number | null;
  previousAverage: number | null;
  topInsight: {
    title: string;
    summary: string;
    evidenceLabel: string;
  } | null;
  strongestContext: {
    title: string;
    severityLabel: string;
    sentimentLabel: string;
  } | null;
  weakestHabit: {
    name: string;
    progress: number;
    type: "POSITIVE" | "NEGATIVE";
  } | null;
  completedActivities: number;
  totalActivities: number;
  journalCount: number;
};

function getMomentumSummary(delta: number | null) {
  if (delta == null) {
    return {
      title: "The baseline is still forming",
      detail: "This is the first usable week of mood data, so the trend is directional rather than comparative.",
    };
  }

  if (delta >= 5) {
    return {
      title: "The week moved upward",
      detail: `Average mood rose by ${delta} points versus the prior week.`,
    };
  }

  if (delta <= -5) {
    return {
      title: "The week carried more strain",
      detail: `Average mood fell by ${Math.abs(delta)} points versus the prior week.`,
    };
  }

  return {
    title: "The week stayed broadly steady",
    detail: `Average mood moved only ${Math.abs(delta)} points versus the prior week.`,
  };
}

function inferPlannerSuggestionCategory(label: string | null | undefined): PlannerSuggestionCategory {
  const normalizedLabel = label?.toLowerCase() ?? "";

  if (normalizedLabel.includes("sleep") || normalizedLabel.includes("rest")) {
    return "SLEEP";
  }

  if (normalizedLabel.includes("walk") || normalizedLabel.includes("exercise") || normalizedLabel.includes("movement")) {
    return "EXERCISE";
  }

  if (normalizedLabel.includes("social") || normalizedLabel.includes("friend") || normalizedLabel.includes("connect")) {
    return "SOCIAL";
  }

  if (normalizedLabel.includes("journal") || normalizedLabel.includes("reflect") || normalizedLabel.includes("mindful")) {
    return "MINDFULNESS";
  }

  if (normalizedLabel.includes("focus") || normalizedLabel.includes("work")) {
    return "FOCUS";
  }

  return "OTHER";
}

function buildPlannerSuggestion(
  input: WeeklyReviewInput,
  nextStep: string
): DashboardWeeklyReview["plannerSuggestion"] {
  const shouldSuggestRecurringExperiment = Boolean(
    input.weakestHabit && input.weakestHabit.type === "POSITIVE" && input.weakestHabit.progress < 70
  );
  const sourceLabel = input.weakestHabit?.name ?? input.topInsight?.title ?? "Weekly experiment";
  const title = input.weakestHabit
    ? input.weakestHabit.type === "POSITIVE"
      ? `Protect ${input.weakestHabit.name}`
      : `Reduce ${input.weakestHabit.name}`
    : input.topInsight
      ? `Test ${input.topInsight.title}`
      : "Weekly experiment";
  const notes = [
    nextStep,
    input.topInsight ? `Signal to test: ${input.topInsight.summary}` : null,
    input.strongestContext
      ? `Context to watch: ${input.strongestContext.title} (${input.strongestContext.sentimentLabel.toLowerCase()}, ${input.strongestContext.severityLabel.toLowerCase()}).`
      : null,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    title,
    historyAnchorTitle: input.weakestHabit?.name ?? null,
    category: inferPlannerSuggestionCategory(sourceLabel),
    notes,
    durationMinutes: input.weakestHabit ? 45 : 30,
    recurring: shouldSuggestRecurringExperiment,
    recurrencePattern: shouldSuggestRecurringExperiment ? "WEEKLY" : "",
  };
}

export function buildWeeklyReview(input: WeeklyReviewInput): DashboardWeeklyReview {
  if (!input.recentMoodCount || input.weeklyAverage == null) {
    const nextStep =
      "Keep the loop lightweight: log a dashboard check-in today, then finish at least one end-of-day reflection before the week closes.";

    return {
      title: "No weekly synthesis yet",
      summary:
        "Start with a few quick check-ins and one or two complete-day reflections so Cadence has enough signal to summarize the week without overreaching.",
      momentumLabel: "Mood trend",
      momentumDetail: "No seven-day baseline exists yet.",
      signalLabel: "Best signal so far",
      signalDetail: input.topInsight
        ? `${input.topInsight.title}. ${input.topInsight.summary}`
        : "No repeat pattern is stable enough to summarize yet.",
      contextLabel: "Context load",
      contextDetail: input.strongestContext
        ? `${input.strongestContext.title} is part of the backdrop, so interpret early patterns carefully.`
        : "No major life context has been logged into this weekly window yet.",
      nextStep,
      plannerSuggestion: buildPlannerSuggestion(input, nextStep),
    };
  }

  const delta = input.previousAverage == null ? null : input.weeklyAverage - input.previousAverage;
  const momentum = getMomentumSummary(delta);
  const activityCompletionRate = input.totalActivities
    ? Math.round((input.completedActivities / input.totalActivities) * 100)
    : null;

  let nextStep = "Keep using quick capture plus full reflections so next week's read is based on repeated patterns, not single days.";

  if (input.weakestHabit && input.weakestHabit.progress < 70) {
    nextStep = input.weakestHabit.type === "POSITIVE"
      ? `Protect ${input.weakestHabit.name.toLowerCase()} earlier in the week. It is the weakest repeatable support right now.`
      : `Reduce ${input.weakestHabit.name.toLowerCase()} when the week gets heavy. It is still acting like a drag on the baseline.`;
  } else if (input.topInsight) {
    nextStep = `Carry ${input.topInsight.title.toLowerCase()} into next week and see whether it repeats under similar context.`;
  } else if (activityCompletionRate != null && activityCompletionRate < 70) {
    nextStep = "Close more of the gap between planned and completed activities next week so the baseline is easier to interpret.";
  }

  return {
    title: momentum.title,
    summary:
      delta == null
        ? `Average mood landed at ${input.weeklyAverage}/100. This is the first week with enough signal to summarize, so treat it as a baseline rather than a verdict.`
        : `Average mood landed at ${input.weeklyAverage}/100, with ${input.journalCount} recent journal ${input.journalCount === 1 ? "entry" : "entries"} and ${input.recentMoodCount} mood check-ins feeding the weekly read.`,
    momentumLabel: "Momentum",
    momentumDetail: momentum.detail,
    signalLabel: "Strongest signal",
    signalDetail: input.topInsight
      ? `${input.topInsight.title}. ${input.topInsight.summary} ${input.topInsight.evidenceLabel}.`
      : activityCompletionRate == null
        ? "No activity or insight pattern is strong enough to summarize yet."
        : `${activityCompletionRate}% of planned activities were completed, which is currently the clearest behavioral rhythm in the week.`,
    contextLabel: "Context to hold in view",
    contextDetail: input.strongestContext
      ? `${input.strongestContext.title} sat in the background (${input.strongestContext.sentimentLabel.toLowerCase()}, ${input.strongestContext.severityLabel.toLowerCase()}).`
      : "No major life event dominated this week, so the review leans more heavily on repeated routines.",
    nextStep,
    plannerSuggestion: buildPlannerSuggestion(input, nextStep),
  };
}

export function buildWeeklyReviewArchiveItem(
  weekLabel: string,
  input: WeeklyReviewInput
): DashboardWeeklyReviewArchiveItem {
  const review = buildWeeklyReview(input);

  return {
    weekLabel,
    title: review.title,
    summary: review.summary,
    nextStep: review.nextStep,
  };
}