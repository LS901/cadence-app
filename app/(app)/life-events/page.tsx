import { auth } from "@/auth";
import { LifeEventsWorkspace } from "@/features/life-events/components/life-events-workspace";
import { isReadOnlyDemoSession } from "@/lib/auth/read-only-demo";
import { demoUser } from "@/lib/data/mock-cadence";
import { getLifeEventsPageData } from "@/server/life-events/queries";

export default async function LifeEventsPage() {
  const session = await auth();
  const readOnlyDemo = isReadOnlyDemoSession(session);
  const userId = session?.user?.id ?? demoUser.id;
  const data = await getLifeEventsPageData(userId);

  return <LifeEventsWorkspace data={data} readOnlyDemo={readOnlyDemo} />;
}