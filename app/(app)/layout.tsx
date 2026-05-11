import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({ children }: { children: ReactNode }) {
  const session = await auth();

  if (!session?.user) {
    redirect("/sign-in");
  }

  return (
    <AppShell
      userName={session.user.name ?? "Cadence User"}
      userEmail={session.user.email ?? "demo@cadence.app"}
    >
      {children}
    </AppShell>
  );
}