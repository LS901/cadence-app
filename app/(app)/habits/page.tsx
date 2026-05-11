import { auth } from "@/auth";
import { demoUser } from "@/lib/data/mock-cadence";
import { HabitsWorkspace } from "@/features/habits/components/habits-workspace";
import { getHabitsPageData } from "@/server/habits/queries";

export default async function HabitsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? demoUser.id;
  const data = await getHabitsPageData(userId);

  return <HabitsWorkspace data={data} />;
}