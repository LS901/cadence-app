import type { Metadata } from "next";
import { createPublicMetadata, projectOwner } from "@/lib/public-content";

export const metadata: Metadata = createPublicMetadata({
  title: "About",
  description:
    "Learn what Cadence is for, how the product is positioned, and why it is being built around calmer reflective analytics.",
  path: "/about",
});

export default function AboutPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="font-geist text-[11px] uppercase tracking-[0.32em] text-muted-foreground">About</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Cadence is being shaped as a calmer system for private reflection.
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          The product sits between mood tracking, journaling, planning, and habit consistency. The goal is not to create another productivity dashboard, but to help people understand their own weekly patterns with more honesty and less friction.
        </p>
      </div>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">What makes Cadence different</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <li>It treats reflection as first-class product value, not as decorative copy around a tracker.</li>
          <li>It keeps mood, habits, planning, and journal context close enough to interpret together.</li>
          <li>It aims for calmer weekly insight rather than overstated personal analytics claims.</li>
        </ul>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Current stage</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Cadence is being presented as a concept product and portfolio flagship. These public routes exist to explain the product thesis, design decisions, and trust model. The demo itself is completely guided, read-only, and requires no account setup or tracking configuration to explore.
        </p>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Project owner & contact</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          This concept product is designed and built by Lewis Saunders. You can review the associated case study, explore other work, or get in touch below.
        </p>
        <p className="mt-3 text-sm leading-7 text-foreground">
          Portfolio: <a className="underline underline-offset-4" href={projectOwner.portfolioUrl} target="_blank" rel="noreferrer">{projectOwner.portfolioLabel}</a>
        </p>
        <p className="mt-2 text-sm leading-7 text-foreground">
          Email: <a className="underline underline-offset-4" href={`mailto:${projectOwner.contactEmail}`}>{projectOwner.contactEmail}</a>
        </p>
      </section>
    </main>
  );
}