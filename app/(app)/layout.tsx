import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { isReadOnlyDemoSession } from "@/lib/auth/read-only-demo";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  const isReadOnlyDemo = isReadOnlyDemoSession(session);

  return (
    <AppShell
      userName={session.user.name ?? "Cadence User"}
      userEmail={session.user.email ?? "demo@cadence.app"}
    >
      <>
        {isReadOnlyDemo ? (
          <div className="mb-6 rounded-[24px] border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm leading-6 text-amber-950 dark:text-amber-100">
            You are viewing the shared demo workspace in read-only mode. Changes to mood, planner, habits, journal, context, and settings are intentionally disabled.
          </div>
        ) : null}
        {children}
      </>
    </AppShell>
  );
}