import { auth } from "@/auth";
import { PlannerWorkspace } from "@/features/planner/components/planner-workspace";
import type { PlannerSuggestedActivityDraft } from "@/features/planner/types";
import { demoUser } from "@/lib/data/mock-cadence";
import { activityCategoryValues, recurrencePatternValues } from "@/lib/validation/activity";
import { getInsightAnalysisSnapshot } from "@/server/insights/queries";
import { getPlannerData } from "@/server/planner/queries";

type PlannerPageProps = {
  searchParams?: Promise<{
    compose?: string | string[];
    title?: string | string[];
    historyAnchorTitle?: string | string[];
    category?: string | string[];
    notes?: string | string[];
    durationMinutes?: string | string[];
    recurring?: string | string[];
    recurrencePattern?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function getPlannerSuggestionFromSearchParams(
  value:
    | Awaited<PlannerPageProps["searchParams"]>
    | undefined
): PlannerSuggestedActivityDraft | null {
  const title = getSingleParam(value?.title)?.trim();
  const historyAnchorTitle = getSingleParam(value?.historyAnchorTitle)?.trim();
  const category = getSingleParam(value?.category);
  const notes = getSingleParam(value?.notes)?.trim();
  const durationMinutes = getSingleParam(value?.durationMinutes)?.trim();
  const recurring = getSingleParam(value?.recurring) === "true";
  const recurrencePattern = getSingleParam(value?.recurrencePattern);

  if (!title || !category || !notes) {
    return null;
  }

  if (!activityCategoryValues.includes(category as (typeof activityCategoryValues)[number])) {
    return null;
  }

  const normalizedCategory = activityCategoryValues.find((candidate) => candidate === category);

  if (!normalizedCategory) {
    return null;
  }

  const normalizedRecurrencePattern = recurring
    ? recurrencePatternValues.find((candidate) => candidate === recurrencePattern) ?? ""
    : "";

  const normalizedDuration = durationMinutes && /^\d+$/.test(durationMinutes)
    ? String(Math.max(1, Math.min(600, Number(durationMinutes))))
    : "";

  return {
    title: title.slice(0, 80),
    historyAnchorTitle: historyAnchorTitle ? historyAnchorTitle.slice(0, 80) : null,
    category: normalizedCategory,
    notes: notes.slice(0, 400),
    durationMinutes: normalizedDuration,
    recurring,
    recurrencePattern: normalizedRecurrencePattern,
  };
}

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  const session = await auth();
  const userId = session?.user?.id ?? demoUser.id;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const composeParam = getSingleParam(resolvedSearchParams?.compose);
  const suggestedActivityDraft = getPlannerSuggestionFromSearchParams(resolvedSearchParams);
  const [data, insightAnalysis] = await Promise.all([
    getPlannerData(userId),
    getInsightAnalysisSnapshot(userId),
  ]);

  return (
    <PlannerWorkspace
      data={data}
      suggestedActivityDraft={suggestedActivityDraft}
      openSuggestedDraftOnLoad={composeParam === "review" && Boolean(suggestedActivityDraft)}
      insightHighlights={(insightAnalysis.candidates.length ? insightAnalysis.candidates : insightAnalysis.exploratoryCandidates).slice(0, 2).map((candidate) => ({
        id: candidate.id,
        title: candidate.title,
        summary: candidate.summary,
        confidence: candidate.confidence,
        lagDays: candidate.lagDays,
        evidenceLabel: candidate.evidenceLabel,
        evidenceLevel: candidate.evidenceLevel,
        sampleSize: candidate.sampleSize,
        exposedDayCount: candidate.exposedDayCount,
        alignedDayCount: candidate.alignedDayCount,
        uncertaintySummary: candidate.uncertaintySummary,
      }))}
      insightState={{
        mode: insightAnalysis.candidates.length ? "PRIMARY" : insightAnalysis.exploratoryCandidates.length ? "EXPLORATORY" : "EMPTY",
        nullState: insightAnalysis.nullState,
      }}
    />
  );
}