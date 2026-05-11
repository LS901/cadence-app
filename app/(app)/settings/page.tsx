import { auth } from "@/auth";
import { SettingsWorkspace } from "@/features/settings/components/settings-workspace";
import { demoUser } from "@/lib/data/mock-cadence";
import { getSettingsPageData } from "@/server/settings/queries";

export default async function SettingsPage() {
  const session = await auth();
  const userId = session?.user?.id ?? demoUser.id;
  const data = await getSettingsPageData(userId);

  return <SettingsWorkspace data={data} />;
}