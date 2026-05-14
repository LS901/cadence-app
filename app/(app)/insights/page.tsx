import { auth } from "@/auth";
import { InsightsWorkspace } from "@/features/insights/components/insights-workspace";
import { demoUser } from "@/lib/data/mock-cadence";
import { normalizeMockScenario } from "@/lib/data/mock-scenarios";
import { getInsightsPageData } from "@/server/insights/queries";

type InsightsPageProps = {
  searchParams?: Promise<{
    entry?: string | string[];
    source?: string | string[];
    scenario?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function InsightsPage({ searchParams }: InsightsPageProps) {
  const session = await auth();
  const userId = session?.user?.id ?? demoUser.id;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const entryMode = getSingleParam(resolvedSearchParams?.entry) === "guided-demo" ? "guided-demo" : null;
  const entrySource = getSingleParam(resolvedSearchParams?.source) ?? null;
  const scenario = normalizeMockScenario(getSingleParam(resolvedSearchParams?.scenario) ?? null);
  const data = await getInsightsPageData(userId, scenario);

  return <InsightsWorkspace data={data} entryMode={entryMode} entrySource={entrySource} scenario={scenario} />;
}