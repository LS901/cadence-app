import type { Metadata } from "next";
import { absoluteUrl, siteConfig } from "@/lib/site-config";

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
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="font-geist text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Privacy
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Cadence privacy notes for this concept demo
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          Cadence is a portfolio-facing concept product designed to mimic a real application. 
          While the codebase supports full data persistence, this live deployment operates 
          entirely statelessly to protect viewer privacy and ensure high uptime.
        </p>
      </div>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">What Cadence stores</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Because this is a public portfolio showcase running on a mock data architecture,
          Cadence currently stores <strong>absolutely no personal data</strong>.
        </p>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <li>The database integration has been completely removed to ensure zero-latency demo experiences.</li>
          <li>All visible mood reflections, journal entries, planner items, habits, and life events are pre-seeded mock data.</li>
          <li>Any edits or interactions you make are stored only in your local browser session and reset upon refresh.</li>
        </ul>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">What Cadence does not aim to be</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          Cadence is not a clinical service, crisis service, or medical product. Its
          analytics are reflective prompts built from the data you log, not diagnoses or
          professional advice.
        </p>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Contact and deletion requests</h2>
        <p className="mt-4 text-sm leading-7 text-muted-foreground">
          If you want data removed or have a privacy question, use the public contact path
          associated with this project.
        </p>
        {contactEmail ? (
          <p className="mt-3 text-sm leading-7 text-foreground">
            Project contact: <a className="underline underline-offset-4" href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </p>
        ) : (
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            No project contact email is configured in this deployment. Use the portfolio
            contact path where you found Cadence.
          </p>
        )}
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Operational notes</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <li>This public experience is intentionally lightweight and low-volume.</li>
          <li>Basic sign-in abuse protection is enabled on the credentials flow.</li>
          <li>The deployment keeps only the level of operational depth needed to support a credible public demo.</li>
        </ul>
      </section>
    </main>
  );
}