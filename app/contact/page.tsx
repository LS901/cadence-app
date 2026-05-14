import type { Metadata } from "next";
import { createPublicMetadata } from "@/lib/public-content";

export const metadata: Metadata = createPublicMetadata({
  title: "Contact",
  description:
    "Contact the Cadence project owner about the concept, implementation, or privacy notes.",
  path: "/contact",
});

export default function ContactPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="font-geist text-[11px] uppercase tracking-[0.32em] text-muted-foreground">Contact</p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Ask about the Cadence concept, implementation, or privacy model.
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          Use this route for privacy questions, portfolio conversations, or feedback on how the concept is designed and built.
        </p>
      </div>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Preferred contact path</h2>
        {contactEmail ? (
          <p className="mt-4 text-sm leading-7 text-foreground">
            Email <a className="underline underline-offset-4" href={`mailto:${contactEmail}`}>{contactEmail}</a> for portfolio, concept, or privacy questions.
          </p>
        ) : (
          <p className="mt-4 text-sm leading-7 text-muted-foreground">
            No direct project contact email is configured in this deployment. Use the portfolio contact method associated with this project.
          </p>
        )}
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Good reasons to get in touch</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <li>Questions about the product concept or design direction.</li>
          <li>Feedback on the current demo flow or interaction design.</li>
          <li>Privacy and data-handling questions for the project.</li>
        </ul>
      </section>
    </main>
  );
}