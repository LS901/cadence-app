import { auth } from "@/auth";
import { PlannerWorkspace } from "@/features/planner/components/planner-workspace";
import { getSuggestedDraftFromWeeklyReview } from "@/features/planner/lib/suggested-draft";
import { isReadOnlyDemoSession } from "@/lib/auth/read-only-demo";
import { demoUser } from "@/lib/data/mock-cadence";
import { normalizeMockScenario } from "@/lib/data/mock-scenarios";
import { getDashboardData } from "@/server/dashboard/queries";
import { getInsightAnalysisSnapshot } from "@/server/insights/queries";
import { getPlannerData } from "@/server/planner/queries";

type PlannerPageProps = {
  searchParams?: Promise<{
    compose?: string | string[];
    entry?: string | string[];
    source?: string | string[];
    scenario?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PlannerPage({ searchParams }: PlannerPageProps) {
  const session = await auth();
  const readOnlyDemo = isReadOnlyDemoSession(session);
  const userId = session?.user?.id ?? demoUser.id;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const composeParam = getSingleParam(resolvedSearchParams?.compose);
  const entryMode = getSingleParam(resolvedSearchParams?.entry) === "guided-demo" ? "guided-demo" : null;
  const entrySource = getSingleParam(resolvedSearchParams?.source) ?? null;
  const scenario = normalizeMockScenario(getSingleParam(resolvedSearchParams?.scenario) ?? null);
  const shouldOpenReviewDraft = composeParam === "review";
  const [data, insightAnalysis, dashboardData] = await Promise.all([
    getPlannerData(userId, scenario),
    getInsightAnalysisSnapshot(userId, scenario),
    shouldOpenReviewDraft ? getDashboardData(userId, null, scenario) : Promise.resolve(null),
  ]);
  const suggestedActivityDraft = shouldOpenReviewDraft
    ? getSuggestedDraftFromWeeklyReview(dashboardData?.weeklyReview)
    : null;

  return (
    <PlannerWorkspace
      data={data}
      entryMode={entryMode}
      entrySource={entrySource}
      scenario={scenario}
      suggestedActivityDraft={suggestedActivityDraft}
      openSuggestedDraftOnLoad={!readOnlyDemo && shouldOpenReviewDraft && Boolean(suggestedActivityDraft)}
      readOnlyDemo={readOnlyDemo}
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