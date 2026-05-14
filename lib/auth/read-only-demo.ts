import { demoUser } from "@/lib/data/mock-cadence";

export type SessionLike =
  | {
      user?: {
        id?: string | null;
        email?: string | null;
      } | null;
    }
  | null
  | undefined;

export const demoWorkspaceReadOnlyMessage = "The shared demo workspace is read-only.";

export function isReadOnlyDemoSession(session: SessionLike) {
  const userId = session?.user?.id ?? null;
  const userEmail = session?.user?.email?.trim().toLowerCase() ?? null;

  return userId === demoUser.id || userEmail === demoUser.email;
}

export async function assertWritableDemoSession(
  getSession: () => Promise<SessionLike>
) {
  const session = await getSession();

  if (isReadOnlyDemoSession(session)) {
    throw new Error(demoWorkspaceReadOnlyMessage);
  }
}