import type { Metadata } from "next";
import Link from "next/link";
import { absoluteUrl, siteConfig } from "@/lib/site-config";
import { projectOwner } from "@/lib/public-content";

export const metadata: Metadata = {
  title: "Privacy",
  description:
    "Privacy notes for the Cadence concept demo, including what the app stores and how to reach the project owner.",
  alternates: {
    canonical: "/privacy",
  },
  openGraph: {
    title: `Privacy | ${siteConfig.name}`,
    description:
      "Privacy notes for the Cadence concept demo, including what the app stores and how to reach the project owner.",
    url: "/privacy",
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: "Cadence calm analytics and reflective tracking preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `Privacy | ${siteConfig.name}`,
    description:
      "Privacy notes for the Cadence concept demo, including what the app stores and how to reach the project owner.",
    images: [absoluteUrl("/twitter-image")],
  },
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="font-geist text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Privacy
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Privacy notes for the public Cadence demo
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          Cadence is intentionally deployed as a shared, read-only portfolio experience. These notes explain what this live version does, what it does not do, and how the project is being presented publicly.
        </p>
      </div>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">What this live deployment stores</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          This public build is backed by seeded mock content and is designed to avoid collecting visitor wellbeing data. It currently stores <strong>no personal reflection data from reviewers</strong>.
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <li>All visible planner items, mood entries, habits, journal notes, and life events are seeded mock data.</li>
          <li>The shared demo login exists only to enter the authored walkthrough and does not create a private viewer account.</li>
          <li>Any temporary client-side state resets when the session reloads or you leave the app.</li>
        </ul>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">What Cadence is and is not</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Cadence is a portfolio project and concept product exploring reflective analytics. It is not a clinical service, a crisis tool, or a substitute for professional advice.
        </p>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Questions, contact, and source context</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          If you have a privacy question about the public demo or want to talk through the architecture and design decisions, contact the project owner directly.
        </p>
        <p className="mt-3 text-sm leading-7 text-foreground">
          Email: <a className="underline underline-offset-4" href={`mailto:${projectOwner.contactEmail}`}>{projectOwner.contactEmail}</a>
        </p>
        <p className="mt-2 text-sm leading-7 text-foreground">
          Portfolio: <a className="underline underline-offset-4" href={projectOwner.portfolioUrl} target="_blank" rel="noreferrer">{projectOwner.portfolioLabel}</a>
        </p>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Operational notes</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <li>This deployment is intentionally lightweight and demo-first.</li>
          <li>Basic sign-in abuse protection remains enabled on the shared credentials route.</li>
          <li>If you want the broader product framing first, start with the <Link className="underline underline-offset-4" href="/about">about page</Link> and then open the guided demo.</li>
        </ul>
      </section>
    </main>
  );
}