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
          Usage notes for the Cadence concept demo.
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          These notes stay intentionally lightweight, but they set clear expectations for using Cadence as a portfolio-facing concept product and working software demo.
        </p>
      </div>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Use of the app</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Cadence is provided as a portfolio-facing concept product and demo. Do not rely on it for clinical, emergency, or safety-critical use. The product is intended for reflective personal tracking, not diagnosis or treatment.
        </p>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Demo access</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          This deployment is a shared, read-only demo. Personal account creation, password recovery, and private data storage are not part of this portfolio build.
        </p>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Project changes</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Because this project is actively evolving, features, flows, and availability may change without long notice while the concept and implementation continue to improve.
        </p>
      </section>
    </main>
  );
}