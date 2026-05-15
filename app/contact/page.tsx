import type { Metadata } from "next";
import { createPublicMetadata, projectOwner } from "@/lib/public-content";

export const metadata: Metadata = createPublicMetadata({
  title: "Contact",
  description:
    "Contact the Cadence project owner about the concept, implementation, or privacy notes.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="font-geist text-[11px] uppercase tracking-[0.32em] text-muted-foreground">Contact</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Contact Lewis Saunders about Cadence
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          Use this page for portfolio conversations, product/design feedback, or questions about how the public demo is architected and deployed.
        </p>
      </div>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Preferred contact path</h2>
        <p className="mt-4 text-sm leading-7 text-foreground">
          Email <a className="underline underline-offset-4" href={`mailto:${projectOwner.contactEmail}`}>{projectOwner.contactEmail}</a>
        </p>
        <p className="mt-2 text-sm leading-7 text-foreground">
          Portfolio <a className="underline underline-offset-4" href={projectOwner.portfolioUrl} target="_blank" rel="noreferrer">{projectOwner.portfolioLabel}</a>
        </p>
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Good reasons to get in touch</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <li>Questions about the product concept, interaction design, or frontend architecture.</li>
          <li>Interest in the project as a portfolio case study or freelance capability signal.</li>
          <li>Privacy, deployment, or trust-model questions about the public demo.</li>
        </ul>
      </section>
    </main>
  );
}