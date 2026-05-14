import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CadenceMark } from "@/components/layout/cadence-mark";
import { SignInForm } from "@/features/auth/components/sign-in-form";

export const metadata: Metadata = {
  title: "Open demo",
  description: "Open the guided Cadence demo workspace.",
};

export default async function SignInPage() {
  const session = await auth();

  if (session?.user) {
    redirect("/dashboard");
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_0.9fr]">
      <div className="relative hidden overflow-hidden border-r border-white/6 bg-[radial-gradient(circle_at_top,rgba(154,182,171,0.24),transparent_35%),linear-gradient(180deg,rgba(9,15,15,0.94),rgba(7,10,11,1))] lg:block">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.025)_1px,transparent_1px)] bg-[size:72px_72px] opacity-40" />
        <div className="relative flex h-full flex-col justify-between px-10 py-12 text-white xl:px-14">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-12 items-center justify-center rounded-[22px] border border-white/10 bg-white/6 backdrop-blur-xl">
                <CadenceMark className="h-10 w-9" />
              </div>
              <p className="font-geist text-[11px] uppercase tracking-[0.32em] text-white/55">
                Cadence
              </p>
            </div>
            <h1 className="mt-6 max-w-lg font-heading text-5xl leading-tight text-white xl:text-6xl">
              Start with the strongest product path.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/68">
              The guided demo drops you into the shared workspace so you can read the weekly review first, then follow the planner handoff that makes the concept feel authored.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              "Step 1: land in the shared dashboard and read the weekly review before doing anything else.",
              "Step 2: open the planner handoff and see how the review becomes a concrete experiment.",
              "Step 3: circle back through mood and journal context once the narrative is clear.",
            ].map((item) => (
              <div key={item} className="rounded-[28px] border border-white/10 bg-white/6 px-5 py-4 text-sm leading-7 text-white/72 backdrop-blur-xl">
                {item}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex min-h-screen items-center justify-center bg-background px-4 py-16 sm:px-6 lg:px-10">
        <SignInForm />
      </div>
    </div>
  );
}