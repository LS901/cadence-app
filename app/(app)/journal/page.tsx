import { auth } from "@/auth";
import { JournalWorkspace } from "@/features/journal/components/journal-workspace";
import { demoUser } from "@/lib/data/mock-cadence";
import { getJournalPageData } from "@/server/journal/queries";

export default async function JournalPage() {
  const session = await auth();
  const userId = session?.user?.id ?? demoUser.id;
  const data = await getJournalPageData(userId);

  return <JournalWorkspace data={data} />;
}