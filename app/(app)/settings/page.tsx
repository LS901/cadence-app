import { auth } from "@/auth";
import { SettingsWorkspace } from "@/features/settings/components/settings-workspace";
import { isReadOnlyDemoSession } from "@/lib/auth/read-only-demo";
import { demoUser } from "@/lib/data/mock-cadence";
import { getSettingsPageData } from "@/server/settings/queries";

export default async function SettingsPage() {
  const session = await auth();
  const readOnlyDemo = isReadOnlyDemoSession(session);
  const userId = session?.user?.id ?? demoUser.id;
  const data = await getSettingsPageData(userId);

  return <SettingsWorkspace data={data} readOnlyDemo={readOnlyDemo} />;
}