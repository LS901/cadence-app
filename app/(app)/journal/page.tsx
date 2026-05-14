import { auth } from "@/auth";
import { JournalWorkspace } from "@/features/journal/components/journal-workspace";
import { isReadOnlyDemoSession } from "@/lib/auth/read-only-demo";
import { demoUser } from "@/lib/data/mock-cadence";
import { normalizeMockScenario } from "@/lib/data/mock-scenarios";
import { getJournalPageData } from "@/server/journal/queries";

type JournalPageProps = {
  searchParams?: Promise<{
    entry?: string | string[];
    source?: string | string[];
    scenario?: string | string[];
  }>;
};

function getSingleParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function JournalPage({ searchParams }: JournalPageProps) {
  const session = await auth();
  const readOnlyDemo = isReadOnlyDemoSession(session);
  const userId = session?.user?.id ?? demoUser.id;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const entryMode = getSingleParam(resolvedSearchParams?.entry) === "guided-demo" ? "guided-demo" : null;
  const entrySource = getSingleParam(resolvedSearchParams?.source) ?? null;
  const scenario = normalizeMockScenario(getSingleParam(resolvedSearchParams?.scenario) ?? null);
  const data = await getJournalPageData(userId, scenario);

  return <JournalWorkspace data={data} entryMode={entryMode} entrySource={entrySource} scenario={scenario} readOnlyDemo={readOnlyDemo} />;
}