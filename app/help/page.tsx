import Link from "next/link";
import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/public-content";

export const metadata: Metadata = createPublicMetadata({
  title: "Help",
  description:
    "Get help understanding guided demo access inside the Cadence concept product.",
  path: "/help",
});

export default function HelpPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="font-geist text-[11px] uppercase tracking-[0.32em] text-muted-foreground">Help</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Help for the guided demo.
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          Cadence is presented as a guided, read-only demo. The shared walkthrough is the only supported access path in this portfolio build.
        </p>
      </div>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Start with the demo</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <li>Use <Link className="underline underline-offset-4" href="/sign-in">the guided demo entry</Link> if you want to see the strongest product path first.</li>
          <li>The shared workspace is seeded so you can move through weekly review, planner, journal, and insights without extra setup.</li>
          <li>The workspace is read-only, so all reviewers see the same seeded story without overwriting one another.</li>
        </ul>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">What is disabled</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Account creation, password recovery, and personal workspace storage are intentionally disabled in this portfolio version. The goal here is to present a polished concept walkthrough, not a live multi-user product.
        </p>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Need more help?</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          If something is unclear, use the <Link className="underline underline-offset-4" href="/contact">contact page</Link> or the privacy page for account and data-handling questions.
        </p>
      </section>
    </main>
  );
}