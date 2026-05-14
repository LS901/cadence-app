import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { createPublicMetadata, publicFeaturePages, trustLinks } from "@/lib/public-content";

export const metadata: Metadata = createPublicMetadata({
  title: "Features",
  description:
    "Explore the core concept surfaces behind Cadence, a portfolio-first behavioural analytics product demo.",
  path: "/features",
});

export default function FeaturesHubPage() {
  return (
    <main className="min-h-screen bg-background px-4 py-16 text-foreground sm:px-6 lg:px-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-14">
        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-4">
            <p className="font-geist text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
              Concept surfaces
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight sm:text-5xl">
              The core surfaces inside the Cadence concept product.
            </h1>
            <p className="max-w-3xl text-base leading-8 text-muted-foreground sm:text-lg">
              These pages explain how Cadence approaches mood tracking, routines, journaling, and trust-aware insight framing as part of a polished product-design exploration.
            </p>
          </div>
          <div className="rounded-[28px] border border-border/40 bg-card/60 p-6 text-sm leading-7 text-muted-foreground">
            Read this section as a tour of the product idea, not as launch marketing collateral.
          </div>
        </section>

        <section className="grid gap-6 md:grid-cols-2">
          {publicFeaturePages.map((feature) => (
            <article key={feature.slug} className="glass-card rounded-[28px] border border-border/40 bg-card/60 p-7">
              <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{feature.primaryKeyword}</p>
              <h2 className="mt-4 text-2xl font-semibold tracking-tight">{feature.name}</h2>
              <p className="mt-3 text-sm leading-7 text-muted-foreground">{feature.summary}</p>
              <ul className="mt-5 space-y-3 text-sm leading-7 text-muted-foreground">
                {feature.outcomes.map((outcome) => (
                  <li key={outcome}>{outcome}</li>
                ))}
              </ul>
              <Link
                href={`/features/${feature.slug}`}
                className={buttonVariants({
                  variant: "outline",
                  className: "mt-6 rounded-full border-border/40 bg-transparent",
                })}
              >
                Read feature page <ArrowRight className="ml-2 size-4" />
              </Link>
            </article>
          ))}
        </section>

        <section className="rounded-[32px] border border-border/40 bg-muted/35 p-8">
          <h2 className="text-2xl font-semibold tracking-tight">Trust and support pages</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted-foreground">
            Even as a concept product, Cadence benefits from public trust, contact, and support routes that make the demo feel complete.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {trustLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={buttonVariants({
                  variant: "outline",
                  className: "rounded-full border-border/40 bg-background/70",
                })}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}