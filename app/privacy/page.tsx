import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy | Cadence",
  description:
    "Privacy information for the public portfolio deployment of Cadence.",
};

export default function PrivacyPage() {
  const contactEmail = process.env.NEXT_PUBLIC_CONTACT_EMAIL?.trim() || null;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-8 px-4 py-16 sm:px-6 lg:px-8">
      <div className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
          Privacy
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
          Cadence privacy notes for this public demo
        </h1>
        <p className="max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
          Cadence is a portfolio-facing wellbeing product demo. It handles reflective
          personal data, so even this lightweight deployment should make the data model
          and contact path clear.
        </p>
      </div>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">What Cadence stores</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <li>Account details used for sign-in, such as your email address.</li>
          <li>Mood reflections, journal entries, planner items, habits, and life context you enter.</li>
          <li>Derived summaries and insight records generated from your own activity inside the app.</li>
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
          associated with this portfolio deployment.
        </p>
        {contactEmail ? (
          <p className="mt-3 text-sm leading-7 text-foreground">
            Contact email: <a className="underline underline-offset-4" href={`mailto:${contactEmail}`}>{contactEmail}</a>
          </p>
        ) : (
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            No dedicated contact email is configured in this deployment yet. Use the
            portfolio or business contact method where you found Cadence.
          </p>
        )}
      </section>

      <section className="rounded-[28px] border border-border/40 bg-card/70 p-6">
        <h2 className="text-xl font-semibold text-foreground">Operational notes</h2>
        <ul className="mt-4 space-y-3 text-sm leading-7 text-muted-foreground">
          <li>This public deployment is intended to stay lightweight and low-volume.</li>
          <li>Basic sign-in abuse protection is enabled on the credentials flow.</li>
          <li>Production monitoring, backups, and stricter governance should increase if real usage grows.</li>
        </ul>
      </section>
    </main>
  );
}