import type { DashboardWeeklyReview } from "@/features/dashboard/lib/weekly-review";
import type {
  PlannerActivityHistory,
  PlannerSuggestedActivityDraft,
} from "@/features/planner/types";

export function getSuggestedDraftFromWeeklyReview(
  weeklyReview: DashboardWeeklyReview | null | undefined
): PlannerSuggestedActivityDraft | null {
  const suggestion = weeklyReview?.plannerSuggestion;

  if (!suggestion) {
    return null;
  }

  return {
    title: suggestion.title,
    historyAnchorTitle: suggestion.historyAnchorTitle,
    category: suggestion.category,
    notes: suggestion.notes,
    hypothesis: suggestion.hypothesis,
    observationPrompt: suggestion.observationPrompt,
    reviewWindowDays: String(suggestion.reviewWindowDays),
    uncertaintyNote: suggestion.uncertaintyNote,
    durationMinutes: String(suggestion.durationMinutes),
    recurring: suggestion.recurring,
    recurrencePattern: suggestion.recurrencePattern,
  };
}

function normalizeTitle(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

export function getSuggestedDraftHistoryMatch(
  suggestedDraft: PlannerSuggestedActivityDraft | null | undefined,
  activityHistory: PlannerActivityHistory[]
) {
  if (!suggestedDraft) {
    return null;
  }

  const anchorTitle = normalizeTitle(
    suggestedDraft.historyAnchorTitle ?? suggestedDraft.title
  );

  if (!anchorTitle) {
    return null;
  }

  return (
    activityHistory.find(
      (item) => normalizeTitle(item.title) === anchorTitle
    ) ?? null
  );
}

export function getSuggestedDraftScheduledAt(
  suggestedDraft: PlannerSuggestedActivityDraft | null | undefined,
  activityHistory: PlannerActivityHistory[],
  now = new Date()
) {
  const historyMatch = getSuggestedDraftHistoryMatch(
    suggestedDraft,
    activityHistory
  );

  if (!historyMatch?.lastCompletedAtIso) {
    return null;
  }

  const lastCompletedAt = new Date(historyMatch.lastCompletedAtIso);

  if (Number.isNaN(lastCompletedAt.getTime())) {
    return null;
  }

  const nextScheduledAt = new Date(now);
  nextScheduledAt.setSeconds(0, 0);
  nextScheduledAt.setHours(
    lastCompletedAt.getHours(),
    lastCompletedAt.getMinutes(),
    0,
    0
  );

  let dayOffset = (lastCompletedAt.getDay() - now.getDay() + 7) % 7;

  if (dayOffset === 0 && nextScheduledAt <= now) {
    dayOffset = 7;
  }

  nextScheduledAt.setDate(now.getDate() + dayOffset);

  return nextScheduledAt;
}