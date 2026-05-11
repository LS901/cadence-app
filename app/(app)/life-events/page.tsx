import { auth } from "@/auth";
import { LifeEventsWorkspace } from "@/features/life-events/components/life-events-workspace";
import { demoUser } from "@/lib/data/mock-cadence";
import { getLifeEventsPageData } from "@/server/life-events/queries";

export default async function LifeEventsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? demoUser.id;
  const data = await getLifeEventsPageData(userId);

  return <LifeEventsWorkspace data={data} />;
}