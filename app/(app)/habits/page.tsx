import { auth } from "@/auth";
import { isReadOnlyDemoSession } from "@/lib/auth/read-only-demo";
import { demoUser } from "@/lib/data/mock-cadence";
import { HabitsWorkspace } from "@/features/habits/components/habits-workspace";
import { getHabitsPageData } from "@/server/habits/queries";

export default async function HabitsPage() {
  const session = await auth();
  const readOnlyDemo = isReadOnlyDemoSession(session);
  const userId = session?.user?.id ?? demoUser.id;
  const data = await getHabitsPageData(userId);

  return <HabitsWorkspace data={data} readOnlyDemo={readOnlyDemo} />;
}