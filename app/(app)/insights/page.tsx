import { auth } from "@/auth";
import { InsightsWorkspace } from "@/features/insights/components/insights-workspace";
import { demoUser } from "@/lib/data/mock-cadence";
import { getInsightsPageData } from "@/server/insights/queries";

export default async function InsightsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? demoUser.id;
  const data = await getInsightsPageData(userId);

  return <InsightsWorkspace data={data} />;
}