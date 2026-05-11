import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { CadenceMark } from "@/components/layout/cadence-mark";
import { SignInForm } from "@/features/auth/components/sign-in-form";

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
              <div className="flex size-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6 backdrop-blur-xl">
                <CadenceMark className="size-7" />
              </div>
              <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-white/55">
                Cadence
              </p>
            </div>
            <h1 className="mt-6 max-w-lg font-heading text-5xl leading-tight text-white xl:text-6xl">
              Understand the shape of your weeks.
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-white/68">
              Cadence combines mood tracking, habit consistency, activity planning, and reflective journaling into one calm analytical surface.
            </p>
          </div>

          <div className="grid gap-4">
            {[
              "See how exercise, sleep, and social energy correlate with mood.",
              "Track positive and negative habits with daily logs and streak context.",
              "Review recent journal notes alongside planner completion patterns.",
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