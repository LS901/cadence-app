import type { Metadata } from "next";
import Link from "next/link";
import { CadenceMark } from "@/components/layout/cadence-mark";
import { ThemeToggleButton } from "@/components/layout/theme-toggle-button";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  createPublicMetadata,
  getOrganizationJsonLd,
  getWebsiteJsonLd,
  projectOwner,
  publicFeaturePages,
  trustLinks,
  useCases,
} from "@/lib/public-content";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = createPublicMetadata({
  title: "Conceptual behavioural analytics product",
  description:
    "Cadence is a concept product exploring how mood, routines, context, and reflection could live inside one calm behavioural analytics experience.",
  path: "/",
});

const organizationJsonLd = getOrganizationJsonLd();
const websiteJsonLd = getWebsiteJsonLd();
const guidedDemoHref = "/sign-in";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
      />
      <header className="container sticky top-0 z-50 mx-auto flex h-16 items-center justify-between bg-background/80 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-10 items-center justify-center rounded-2xl border border-border/50 bg-card/65 backdrop-blur-xl">
            <CadenceMark className="h-8 w-7" />
          </div>
          <span className="text-lg font-medium tracking-[0.18em] text-foreground/95">Cadence</span>
        </div>
        <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 gap-6 text-sm md:flex">
          <Link href="#concept" className="text-muted-foreground transition-colors hover:text-foreground">
            Concept
          </Link>
          <Link href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="#use-cases" className="text-muted-foreground transition-colors hover:text-foreground">
            Showcase
          </Link>
          <Link href="/contact" className="text-muted-foreground transition-colors hover:text-foreground">
            Contact
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <ThemeToggleButton className="border-border/40 bg-card/70 backdrop-blur-xl" />
          <Link href={guidedDemoHref} className="hidden text-sm font-medium md:block">
            Open demo
          </Link>
          <Link href={guidedDemoHref} className={buttonVariants({ className: "rounded-full px-6" })}>
            View the product
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 md:pt-32">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
          
          <div className="container mx-auto px-4 text-center md:px-6">
            <div className="mb-8 mx-auto inline-flex items-center rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-sm backdrop-blur-sm">
              <span className="mr-2 flex h-2 w-2 rounded-full bg-primary"></span>
              Portfolio flagship for reflective product design
            </div>
            
            <h1 className="mx-auto max-w-4xl text-balance text-5xl font-medium tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              A calmer interface for <span className="bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">behavioural insight.</span><br />
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground md:text-xl">
              Cadence is a conceptual behavioural analytics product exploring how mood, routines, planning, life context, and reflection could live inside one emotionally intelligent dashboard.
            </p>
            
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href={guidedDemoHref}
                className={buttonVariants({
                  size: "lg",
                  className: "h-12 w-full rounded-full px-8 text-base sm:w-auto",
                })}
              >
                Explore the guided demo <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="/features"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "glass-card h-12 w-full rounded-full px-8 text-base sm:w-auto",
                })}
              >
                Read the concept surfaces
              </Link>
            </div>

            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              Best first path: open the shared demo, start at the weekly review, then carry the handoff into Planner.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-sm text-muted-foreground">
              <span className="rounded-full border border-border/40 bg-background/70 px-4 py-2">Concept product</span>
              <span className="rounded-full border border-border/40 bg-background/70 px-4 py-2">Portfolio showcase</span>
              <span className="rounded-full border border-border/40 bg-background/70 px-4 py-2">Weekly review narrative</span>
            </div>
          </div>
        </section>

        <section id="concept" className="py-24 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-8 rounded-[32px] border border-border/40 bg-card/55 p-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
              <div>
                <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">Cadence is a product concept, not a launch funnel.</h2>
                <p className="mt-4 max-w-2xl text-sm leading-8 text-muted-foreground sm:text-base">
                  This project is intentionally framed as a frontend and product-engineering showcase. The goal is to demonstrate a believable, emotionally intelligent system built for pattern discovery within a read-only, statically-mocked interactive portfolio shell.
                </p>
              </div>
              <div className="grid gap-4">
                {[
                  "A flagship weekly review loop that turns data capture into narrative and next-step decisions.",
                  "A curated seeded story designed to make the interface feel authored rather than randomly populated.",
                  "A calm UI system built to explore trust, ambiguity, and context in behavioural analytics.",
                ].map((item) => (
                  <div key={item} className="rounded-[28px] border border-border/40 bg-background/70 px-5 py-4 text-sm leading-7 text-muted-foreground">
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-muted/30 py-24 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">The main product surfaces in the concept.</h2>
              <p className="mt-4 text-lg text-muted-foreground">Each surface exists to support one loop: capture, reflect, interpret, test.</p>
            </div>
            
            <div className="mx-auto grid max-w-6xl gap-8 md:grid-cols-2">
              {publicFeaturePages.map((feature) => (
                <article key={feature.slug} className="glass-card rounded-2xl border border-border/50 bg-card/40 p-8 transition-all hover:bg-card/60">
                  <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">{feature.primaryKeyword}</p>
                  <h3 className="mt-4 text-xl font-medium">{feature.name}</h3>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{feature.summary}</p>
                  <Link
                    href={`/features/${feature.slug}`}
                    className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-foreground transition-colors hover:text-primary"
                  >
                    Read the feature page <ArrowRight className="size-4" />
                  </Link>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section id="use-cases" className="py-24 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-16 max-w-3xl">
              <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">What this showcase is trying to prove.</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Cadence is strongest when it is read as a product-design exploration into how reflection, routine tracking, and planning might inform each other inside one coherent interface.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-3">
              {useCases.map((useCase) => (
                <article key={useCase.title} className="rounded-[28px] border border-border/40 bg-card/55 p-7">
                  <h3 className="text-xl font-semibold tracking-tight">{useCase.title}</h3>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{useCase.description}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-muted/30 py-24 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-16 max-w-3xl">
              <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">What the prototype demonstrates.</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Phase 1 shifts the public story away from launch mechanics and toward the reasons this project belongs in a portfolio: product thinking, interaction design, and believable mock storytelling.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-3">
              {[
                {
                  title: "Product storytelling",
                  body: "The seeded week, weekly review, and experiment handoff are designed to make the system feel like a real product with taste, not a collection of CRUD forms.",
                },
                {
                  title: "Frontend craft",
                  body: "Cadence is built to showcase layout system quality, composed surfaces, motion restraint, and clear state transitions across public and authenticated routes.",
                },
                {
                  title: "Trust-aware analytics",
                  body: "The interface avoids overclaiming. Context, uncertainty, and signal strength are treated as part of the experience instead of hidden implementation details.",
                },
              ].map((pillar) => (
                <article key={pillar.title} className="glass-card rounded-[28px] border border-border/40 bg-card/60 p-8">
                  <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">{pillar.title}</p>
                  <p className="mt-4 text-sm leading-7 text-muted-foreground">{pillar.body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="py-24 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="grid gap-8 rounded-[32px] border border-border/40 bg-card/55 p-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
              <div>
                <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">Supporting routes still matter in a concept product.</h2>
                <p className="mt-4 max-w-2xl text-sm leading-8 text-muted-foreground sm:text-base">
                  Supporting pages still matter here, but only when they reinforce the real contract of the site: a guided portfolio demo, a clear privacy position, and a direct way to reach the project owner.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                {trustLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={buttonVariants({
                      variant: "outline",
                      className: "rounded-full border-border/40 bg-background/75",
                    })}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-12 backdrop-blur-sm">
        <div className="container mx-auto grid gap-8 px-4 md:grid-cols-[1fr_auto_auto] md:items-start md:px-6">
          <div className="flex items-center gap-2">
            <CadenceMark className="size-5" />
            <div>
              <span className="text-sm font-medium text-muted-foreground">Cadence</span>
              <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                A conceptual product exploring mood, routines, planning, and reflection through a calmer behavioural analytics lens.
              </p>
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Feature pages</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              <Link href="/features">All features</Link>
              {publicFeaturePages.map((feature) => (
                <Link key={feature.slug} href={`/features/${feature.slug}`}>
                  {feature.navLabel}
                </Link>
              ))}
            </div>
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">Trust</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-muted-foreground">
              {trustLinks.map((link) => (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ))}
              <a href={projectOwner.portfolioUrl} target="_blank" rel="noreferrer">
                Portfolio
              </a>
              <p className="pt-3 text-sm text-muted-foreground">© {new Date().getFullYear()} {siteConfig.name}. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
