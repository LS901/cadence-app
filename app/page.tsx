import Link from "next/link";
import { CadenceMark } from "@/components/layout/cadence-mark";
import { buttonVariants } from "@/components/ui/button";
import { ArrowRight, Activity, Calendar, PieChart } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground selection:bg-primary/20">
      <header className="container sticky top-0 z-50 mx-auto flex h-16 items-center justify-between bg-background/80 px-4 backdrop-blur-md md:px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-border/50 bg-card/65 backdrop-blur-xl">
            <CadenceMark className="size-6" />
          </div>
          <span className="text-lg font-medium tracking-[0.18em] text-foreground/95">Cadence</span>
        </div>
        <nav className="hidden gap-6 text-sm md:flex">
          <Link href="#features" className="text-muted-foreground transition-colors hover:text-foreground">
            Features
          </Link>
          <Link href="#testimonials" className="text-muted-foreground transition-colors hover:text-foreground">
            Testimonials
          </Link>
          <Link href="#pricing" className="text-muted-foreground transition-colors hover:text-foreground">
            Pricing
          </Link>
        </nav>
        <div className="flex items-center gap-4">
          <Link href="/sign-in" className="hidden text-sm font-medium md:block">
            Sign In
          </Link>
          <Link href="/dashboard" className={buttonVariants({ className: "rounded-full px-6" })}>
            Get Started
          </Link>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-24 pb-32 md:pt-32 md:pb-40">
          <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.15),rgba(255,255,255,0))]" />
          
          <div className="container mx-auto px-4 text-center md:px-6">
            <div className="mb-8 mx-auto inline-flex items-center rounded-full border border-border/50 bg-muted/50 px-3 py-1 text-sm backdrop-blur-sm">
              <span className="mr-2 flex h-2 w-2 rounded-full bg-primary"></span>
              Introducing the new Cadence OS
            </div>
            
            <h1 className="mx-auto max-w-4xl text-balance text-5xl font-medium tracking-tight sm:text-6xl md:text-7xl lg:text-8xl">
              Find your <span className="bg-gradient-to-r from-primary/80 to-primary bg-clip-text text-transparent">rhythm.</span><br />
              Master your day.
            </h1>
            
            <p className="mx-auto mt-6 max-w-2xl text-balance text-lg leading-relaxed text-muted-foreground md:text-xl">
              The premium, distraction-free environment for deep work, habit tracking, and personal reflection. Designed for those who value focus.
            </p>
            
            <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
              <Link
                href="/dashboard"
                className={buttonVariants({
                  size: "lg",
                  className: "h-12 w-full rounded-full px-8 text-base sm:w-auto",
                })}
              >
                Start your journey <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
              <Link
                href="#features"
                className={buttonVariants({
                  variant: "outline",
                  size: "lg",
                  className: "glass-card h-12 w-full rounded-full px-8 text-base sm:w-auto",
                })}
              >
                Explore features
              </Link>
            </div>
            
            {/* Dashboard Preview */}
            <div className="glass-card relative mx-auto mt-20 max-w-5xl rounded-2xl border border-border/40 bg-card/40 p-2 shadow-2xl">
              <div className="absolute bottom-0 top-1/2 z-10 inset-x-0 rounded-b-2xl bg-gradient-to-t from-background via-background/20 to-transparent" />
              <div className="overflow-hidden rounded-xl border border-border/50 bg-background">
                <div className="flex h-8 items-center border-b border-border/50 bg-muted/30 px-4">
                  <div className="flex gap-1.5">
                    <div className="h-2.5 w-2.5 rounded-full bg-border" />
                    <div className="h-2.5 w-2.5 rounded-full bg-border" />
                    <div className="h-2.5 w-2.5 rounded-full bg-border" />
                  </div>
                </div>
                <div className="flex aspect-[16/9] items-center justify-center bg-gradient-to-br from-muted/50 to-background p-8">
                  <div className="grid h-full w-full grid-cols-12 gap-4">
                    <div className="col-span-3 flex flex-col gap-3 rounded-lg border border-border/50 bg-card/50 p-4">
                      <div className="h-4 w-1/2 rounded bg-muted-foreground/20" />
                      <div className="h-24 rounded bg-muted/50" />
                      <div className="h-2 w-3/4 rounded bg-muted-foreground/10" />
                      <div className="h-2 w-full rounded bg-muted-foreground/10" />
                    </div>
                    <div className="col-span-9 grid grid-rows-3 gap-4">
                      <div className="row-span-2 grid grid-cols-3 gap-4">
                        <div className="col-span-2 rounded-lg border border-border/50 bg-card/50 p-4" />
                        <div className="col-span-1 rounded-lg border border-border/50 bg-card/50 p-4" />
                      </div>
                      <div className="row-span-1 rounded-lg border border-border/50 bg-card/50 p-4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="bg-muted/30 py-24 md:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <div className="mb-16 text-center">
              <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">Everything you need, nothing you don&apos;t.</h2>
              <p className="mt-4 text-lg text-muted-foreground">A unified space for your habits, journal, and tasks.</p>
            </div>
            
            <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-3">
              <div className="glass-card rounded-2xl border border-border/50 bg-card/40 p-8 transition-all hover:bg-card/60">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Activity className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-medium">Habit Tracking</h3>
                <p className="leading-relaxed text-muted-foreground">Build lasting routines with beautiful heatmaps and gentle nudges that keep you on track.</p>
              </div>
              
              <div className="glass-card rounded-2xl border border-border/50 bg-card/40 p-8 transition-all hover:bg-card/60">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Calendar className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-medium">Smart Planner</h3>
                <p className="leading-relaxed text-muted-foreground">Organize your day with a minimalist interface that respects your time and attention.</p>
              </div>
              
              <div className="glass-card rounded-2xl border border-border/50 bg-card/40 p-8 transition-all hover:bg-card/60">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <PieChart className="h-6 w-6" />
                </div>
                <h3 className="mb-2 text-xl font-medium">Deep Insights</h3>
                <p className="leading-relaxed text-muted-foreground">Understand your rhythms with private, secure analytics that reveal your most productive patterns.</p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-12 backdrop-blur-sm">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 md:flex-row md:px-6">
          <div className="flex items-center gap-2">
            <CadenceMark className="size-5" />
            <span className="text-sm font-medium text-muted-foreground">Cadence</span>
          </div>
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Cadence Software. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
