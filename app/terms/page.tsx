import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/public-content";

export const metadata: Metadata = createPublicMetadata({
  title: "Terms",
  description:
    "Usage notes for the current Cadence concept demo.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="font-geist text-[11px] uppercase tracking-[0.32em] text-muted-foreground">Terms</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Usage notes for the public Cadence demo
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          These are lightweight terms for a portfolio-facing concept product. They exist to set expectations for reviewers, not to simulate a full SaaS legal stack.
        </p>
      </div>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Use of the demo</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Cadence is provided as a guided software demo and portfolio project. Do not rely on it for clinical, emergency, or safety-critical use.
        </p>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Shared access model</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          This deployment is a shared, read-only walkthrough. Private account creation, recovery flows, and personal workspace storage are intentionally retired in this build.
        </p>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Project changes</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Cadence is still evolving as a portfolio flagship, so pages, interaction details, and seeded stories may change as the concept improves.
        </p>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Intellectual property</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          The product design, copy, code, and mock content are presented for review as part of Lewis Saunders&apos; portfolio work. Please do not reproduce or republish the project as your own.
        </p>
      </section>
    </main>
  );
}