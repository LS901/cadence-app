"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowUpRight, CalendarRange, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  getInsightConfidencePresentation,
  formatInsightEvidenceLine,
  getInsightSurfacePresentation,
} from "@/features/insights/lib/highlight-presentation";
import {
  defaultMockScenario,
  mockScenarioOptions,
  type MockScenarioKey,
} from "@/lib/data/mock-scenarios";
import type { DashboardData } from "@/lib/data/mock-cadence";
import { MoodTrendChart } from "@/features/dashboard/components/mood-trend-chart";
import { upsertQuickMoodCaptureAction } from "@/server/mood/actions";

type DashboardOverviewProps = {
  data: DashboardData;
  focusContext?: {
    sourceLabel: string;
    windowLabel: string;
  } | null;
  entryMode?: "guided-demo" | null;
  scenario?: MockScenarioKey;
};

const sectionMotion = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

const mobileActionClassName = "w-full justify-center whitespace-normal text-center sm:w-auto";

export function DashboardOverview({
  data,
  focusContext = null,
  entryMode = null,
  scenario = defaultMockScenario,
}: DashboardOverviewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const hasContextTimeline = data.contextTimeline.some((point) => point.activeCount > 0);
  const insightSurfacePresentation = getInsightSurfacePresentation({
    surface: "dashboard",
    mode: data.insightHighlightMode,
    nullState: data.insightNullState,
  });
  const [quickScore, setQuickScore] = useState<number | null>(data.todayQuickCapture.score);
  const [quickNotes, setQuickNotes] = useState(data.todayQuickCapture.notes ?? "");
  const hasCompleteReflection = data.todayQuickCapture.reflectionCompleted || data.todayQuickCapture.hasPeriods;
  const moodReflectionParams = new URLSearchParams();

  if (!hasCompleteReflection) {
    moodReflectionParams.set("compose", "today");
  }

  if (scenario !== defaultMockScenario) {
    moodReflectionParams.set("scenario", scenario);
  }

  const moodReflectionHref = moodReflectionParams.size ? `/mood?${moodReflectionParams.toString()}` : "/mood";
  const plannerSuggestionParams = new URLSearchParams({
    compose: "review",
  });

  if (entryMode === "guided-demo") {
    plannerSuggestionParams.set("entry", "guided-demo");
    plannerSuggestionParams.set("source", "dashboard");
  }

  if (scenario !== defaultMockScenario) {
    plannerSuggestionParams.set("scenario", scenario);
  }

  const plannerSuggestionHref = `/planner?${plannerSuggestionParams.toString()}`;
  const overviewStoryLines = [
    data.weeklyReview.momentumDetail,
    data.weeklyReview.signalDetail,
    data.weeklyReview.plannerSuggestion.supportStateDetail,
    data.weeklyReview.contextDetail,
  ];

  function handleQuickCaptureSubmit() {
    if (quickScore == null) {
      toast.error("Choose a mood score first.");
      return;
    }

    startTransition(async () => {
      try {
        await upsertQuickMoodCaptureAction({
          day: data.todayQuickCapture.dayIso,
          score: quickScore,
          notes: quickNotes,
        });
        toast.success("Quick check-in saved.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save quick check-in.");
      }
    });
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-8 ">
      {entryMode === "guided-demo" && focusContext ? (
        <motion.section {...sectionMotion}>
          <Card className="glass-card rounded-[32px] border-primary/20 bg-primary/[0.04]">
            <CardContent className="grid gap-5 p-4 sm:p-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Guided demo path</p>
                <p className="mt-3 text-lg sm:text-xl font-semibold tracking-tight text-foreground">Start with the weekly review, then follow the carry-forward experiment.</p>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  This shared workspace is arranged to show the best product story first: read the synthesis, inspect the archive, then turn the handoff into a Planner experiment.
                </p>
              </div>
              <div className="grid gap-3 min-w-0">
                {[
                  "1. Read the weekly review to understand the current pattern and context.",
                  "2. Open the Planner handoff to see how analysis becomes a concrete experiment.",
                  "3. Return to mood or journal context only after the narrative arc is clear.",
                ].map((item) => (
                  <div key={item} className="rounded-[24px] border border-border/40 bg-background/65 px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm leading-6 text-muted-foreground">
                    {item}
                  </div>
                ))}
                <div className="flex flex-col gap-3 pt-1 sm:flex-row sm:flex-wrap">
                  <Link
                    href="#weekly-review"
                    className={buttonVariants({ className: `rounded-full ${mobileActionClassName}` })}
                  >
                    Start with weekly review
                  </Link>
                  <Link
                    href={plannerSuggestionHref}
                    className={buttonVariants({
                      variant: "outline",
                      className: `rounded-full border-border/40 bg-transparent ${mobileActionClassName}`,
                    })}
                  >
                    Jump to Planner handoff
                  </Link>
                </div>
                <div className="rounded-[24px] border border-border/40 bg-background/65 p-3 sm:p-4">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Demo stories</p>
                  <div className="mt-3 grid gap-2 sm:gap-3 grid-cols-1 xs:grid-cols-2 sm:grid-cols-2">
                    {mockScenarioOptions.map((option) => {
                      const params = new URLSearchParams({ entry: "guided-demo" });

                      if (option.key !== defaultMockScenario) {
                        params.set("scenario", option.key);
                      }

                      return (
                        <Link
                          key={option.key}
                          href={`/dashboard?${params.toString()}`}
                          className={option.key === scenario
                            ? "rounded-[20px] border border-primary/35 bg-primary/[0.08] p-3 sm:p-4"
                            : "rounded-[20px] border border-border/40 bg-background/45 p-3 sm:p-4 transition hover:border-border/70 hover:bg-background/60"
                          }
                        >
                          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{option.shortLabel}</p>
                          <p className="mt-2 text-xs sm:text-sm font-medium text-foreground">{option.label}</p>
                          <p className="mt-2 text-xs sm:text-sm leading-6 text-muted-foreground line-clamp-2">{option.summary}</p>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.section>
      ) : null}

      {focusContext ? (
        <motion.section {...sectionMotion}>
          <Card className="glass-card rounded-[32px] border-primary/20 bg-primary/[0.04]">
            <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{focusContext.sourceLabel}</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Opened with journal context for {focusContext.windowLabel}. Use the weekly review below to compare that narrative stretch against the broader weekly read.
                </p>
              </div>
              <Badge variant="outline" className="rounded-full border-border/40 bg-transparent px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                {focusContext.windowLabel}
              </Badge>
            </CardContent>
          </Card>
        </motion.section>
      ) : null}

      <motion.section {...sectionMotion} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {data.overview.map((item, index) => (
          <Card key={item.label} className="glass-card rounded-[28px]">
            <CardHeader className="space-y-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">
                {item.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <div className="flex items-start justify-between gap-4">
                <span>{item.detail}</span>
                <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-primary" />
              </div>
              <p className="text-xs leading-5 text-foreground/80">{overviewStoryLines[index] ?? item.detail}</p>
            </CardContent>
          </Card>
        ))}
      </motion.section>

      <motion.section id="weekly-review" {...sectionMotion}>
        <Card className="glass-card rounded-[32px]">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <CardDescription className="text-[10px] sm:text-xs">Weekly review synthesis</CardDescription>
              <CardTitle className="text-xl sm:text-2xl text-foreground">{data.weeklyReview.title}</CardTitle>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              {entryMode === "guided-demo" ? (
                <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
                  Start here
                </Badge>
              ) : null}
              <Link
                href={moodReflectionHref}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: `rounded-full border-border/40 bg-transparent ${mobileActionClassName}`,
                })}
              >
                Open Mood review
              </Link>
              <Link
                href={plannerSuggestionHref}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: `rounded-full border-border/40 bg-transparent ${mobileActionClassName}`,
                })}
              >
                Carry into Planner
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{data.weeklyReview.summary}</p>
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
              <div className="rounded-[24px] border border-border/40 bg-background/45 p-3 sm:p-4">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  {data.weeklyReview.momentumLabel}
                </p>
                <p className="mt-3 text-xs sm:text-sm leading-6 text-foreground">{data.weeklyReview.momentumDetail}</p>
              </div>
              <div className="rounded-[24px] border border-border/40 bg-background/45 p-3 sm:p-4">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  {data.weeklyReview.signalLabel}
                </p>
                <p className="mt-3 text-xs sm:text-sm leading-6 text-foreground">{data.weeklyReview.signalDetail}</p>
              </div>
              <div className="rounded-[24px] border border-border/40 bg-background/45 p-3 sm:p-4">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  {data.weeklyReview.contextLabel}
                </p>
                <p className="mt-3 text-xs sm:text-sm leading-6 text-foreground">{data.weeklyReview.contextDetail}</p>
              </div>
            </div>
            <div className="rounded-[26px] border border-border/40 bg-card/70 p-4 sm:p-5">
              <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Carry forward</p>
              <p className="mt-3 text-xs sm:text-sm leading-6 text-foreground">{data.weeklyReview.nextStep}</p>
              <div className="mt-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-[20px] border border-border/30 bg-background/45 p-3 sm:p-4">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Observation</p>
                  <p className="mt-2 text-xs sm:text-sm leading-6 text-foreground">{data.weeklyReview.signalDetail}</p>
                </div>
                <div className="rounded-[20px] border border-border/30 bg-background/45 p-3 sm:p-4">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Hypothesis</p>
                  <p className="mt-2 text-xs sm:text-sm leading-6 text-foreground">{data.weeklyReview.plannerSuggestion.hypothesis}</p>
                </div>
                <div className="rounded-[20px] border border-border/30 bg-background/45 p-3 sm:p-4">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Tested support</p>
                  <p className="mt-2 text-xs sm:text-sm leading-6 text-foreground">{data.weeklyReview.plannerSuggestion.supportStateLabel}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{data.weeklyReview.plannerSuggestion.supportStateDetail}</p>
                </div>
              </div>
              <div className="mt-3 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-2">
                <div className="rounded-[20px] border border-border/30 bg-background/45 p-3 sm:p-4">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">What to notice</p>
                  <p className="mt-2 text-xs sm:text-sm leading-6 text-foreground">{data.weeklyReview.plannerSuggestion.observationPrompt}</p>
                </div>
                <div className="rounded-[20px] border border-border/30 bg-background/45 p-3 sm:p-4">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Review window</p>
                  <p className="mt-2 text-xs sm:text-sm leading-6 text-foreground">
                    Revisit this after {data.weeklyReview.plannerSuggestion.reviewWindowDays}{" "}
                    {data.weeklyReview.plannerSuggestion.reviewWindowDays === 1 ? "day" : "days"}.
                  </p>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-muted-foreground">{data.weeklyReview.plannerSuggestion.uncertaintyNote}</p>
            </div>
            {data.weeklyReviewArchive.length ? (
              <div className="space-y-3 border-t border-border/40 pt-2">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                  <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Review archive</p>
                  <Badge variant="outline" className="rounded-full border-border/40 bg-transparent px-2 sm:px-3 py-1 text-[9px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Last {data.weeklyReviewArchive.length} weeks
                  </Badge>
                </div>
                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                  {data.weeklyReviewArchive.map((item) => (
                    <div key={item.weekLabel} className="rounded-[24px] border border-border/40 bg-background/45 p-3 sm:p-4">
                      <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{item.weekLabel}</p>
                      <p className="mt-3 text-xs sm:text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-2 text-xs sm:text-sm leading-6 text-muted-foreground">{item.summary}</p>
                      <div className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">
                        <p><span className="text-foreground">Momentum:</span> {item.momentumDetail}</p>
                        <p><span className="text-foreground">Signal:</span> {item.signalDetail}</p>
                        <p><span className="text-foreground">Context:</span> {item.contextDetail}</p>
                      </div>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.nextStep}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section {...sectionMotion}>
        <Card className="glass-card rounded-[32px]">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 flex-1">
              <CardDescription className="text-[10px] sm:text-xs">Quick capture</CardDescription>
              <CardTitle className="text-xl sm:text-2xl text-foreground">Check in now, reflect later</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <Badge variant="outline" className="rounded-full border-border/40 bg-transparent px-2 sm:px-3 py-1 text-[9px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                Dashboard draft
              </Badge>
              <Link
                href={moodReflectionHref}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "rounded-full border-border/40 bg-transparent",
                })}
              >
                Open full reflection
              </Link>
            </div>
          </CardHeader>
          <CardContent className="grid gap-5 grid-cols-1 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                Save a lightweight mood draft from the dashboard, then come back later to complete the full end-of-day reflection with timing and context.
              </p>
              <div className="flex flex-wrap gap-2">
                {[20, 35, 50, 65, 80, 95].map((score) => (
                  <Button
                    key={`quick-score-${score}`}
                    type="button"
                    variant="outline"
                    className={score === quickScore ? "rounded-full border-primary/40 bg-primary/10 text-primary" : "rounded-full border-border/40 bg-transparent"}
                    disabled={isPending || hasCompleteReflection}
                    onClick={() => setQuickScore(score)}
                  >
                    {score}
                  </Button>
                ))}
              </div>
              <Textarea
                className="min-h-28 rounded-[24px] border-border/40 bg-background/45"
                value={quickNotes}
                disabled={isPending || hasCompleteReflection}
                onChange={(event) => setQuickNotes(event.target.value)}
                placeholder="Optional note about today’s baseline before you do a fuller reflection tonight."
              />
              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Button
                  type="button"
                  className="w-full rounded-full sm:w-auto"
                  disabled={isPending || hasCompleteReflection || quickScore == null}
                  onClick={handleQuickCaptureSubmit}
                >
                  Save quick check-in
                </Button>
                <Link
                  href={moodReflectionHref}
                  className={buttonVariants({
                    variant: "outline",
                    className: `rounded-full border-border/40 bg-transparent ${mobileActionClassName}`,
                  })}
                >
                  Finish the day properly
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-border/40 bg-background/40 p-4 sm:p-5">
              {hasCompleteReflection ? (
                <div className="space-y-3">
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
                    Reflection complete
                  </Badge>
                  <p className="text-base font-medium text-foreground">Today already has a full reflection.</p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    Use the Mood page if you want to revise the timing blocks, notes, or contextual details rather than saving a lighter draft here.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Badge variant="outline" className="rounded-full border-border/40 bg-transparent px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    {data.todayQuickCapture.score != null ? "Draft saved today" : "No draft yet"}
                  </Badge>
                  <p className="text-base font-medium text-foreground">
                    {quickScore != null ? `Current draft score: ${quickScore}/100` : "Pick a score to save today’s baseline."}
                  </p>
                  <p className="text-sm leading-6 text-muted-foreground">
                    This keeps Phase 3 low-friction: quick capture on the dashboard, then a fuller reflection later when you have enough context to break the day into mood blocks.
                  </p>
                  {data.todayQuickCapture.notes ? (
                    <p className="rounded-[20px] border border-border/40 bg-card/70 p-4 text-sm leading-6 text-muted-foreground">
                      Existing note: {data.todayQuickCapture.notes}
                    </p>
                  ) : null}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <div className="grid gap-6 grid-cols-1 ">
        <motion.section {...sectionMotion}>
          <Card className="glass-card rounded-[32px]">
            <CardHeader className="space-y-3">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <CardDescription className="text-[10px] sm:text-xs">Mood graph</CardDescription>
                  <CardTitle className="text-xl sm:text-2xl text-foreground">
                    Daily emotional baseline
                  </CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className="rounded-full px-2 sm:px-3 py-1 text-[9px] sm:text-[11px] uppercase tracking-[0.22em] whitespace-nowrap"
                >
                  Live seeded data
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <MoodTrendChart data={data.moodSeries} contextTimeline={data.contextTimeline} />
              {hasContextTimeline ? (
                <div className="mt-6 space-y-3">
                  <div className="flex flex-col gap-3 sm:gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">Context track</p>
                      <p className="text-xs leading-5 text-muted-foreground">The chart now marks the days that need life context in the interpretation, and the context surface keeps that narrative editable.</p>
                    </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-shrink-0">
                        <Badge variant="outline" className="rounded-full border-border/40 bg-transparent px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
                          Last 7 days
                        </Badge>
                        <Link
                          href="/life-events"
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                            className: `rounded-full border-border/40 bg-transparent ${mobileActionClassName}`,
                          })}
                        >
                          Manage context
                        </Link>
                      </div>
                  </div>
                  <p className="rounded-[20px] border border-border/40 bg-background/35 px-4 py-3 text-sm leading-6 text-muted-foreground">
                    Life events stay visible as interpretation context rather than post-hoc explanation, so the mood curve can read as human activity over time instead of detached numbers.
                  </p>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.section>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2 xl:grid-cols-1">
          <motion.section {...sectionMotion}>
            <Card className="glass-card rounded-[32px]">
              <CardHeader>
                <div className="flex items-center gap-2 sm:gap-3">
                  <Sparkles className="size-4 sm:size-5 text-primary" />
                  <CardTitle className="text-lg sm:text-2xl text-foreground">Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.insights.length ? (
                  data.insights.map((insight) => {
                    const confidencePresentation = getInsightConfidencePresentation(insight.confidence);

                    return (
                    <div key={insight.id} className="rounded-[24px] border border-white/10 bg-background/40 p-3 sm:p-4">
                      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1 sm:gap-2">
                            <p className="text-xs sm:text-sm font-medium text-foreground">{insight.title}</p>
                            <Badge variant="secondary" className="rounded-full px-2 sm:px-3 py-1 text-[9px] sm:text-[11px]">
                              {insight.evidenceLabel}
                            </Badge>
                            {insightSurfacePresentation.exploratoryBadgeLabel ? (
                              <Badge variant="outline" className="rounded-full border-border/40 bg-transparent px-3 py-1 text-[11px] text-muted-foreground">
                                {insightSurfacePresentation.exploratoryBadgeLabel}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-2 text-sm leading-6 text-muted-foreground">
                            {insight.summary}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {formatInsightEvidenceLine(insight)}
                          </p>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">
                            {confidencePresentation.description}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-2">
                          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
                            {confidencePresentation.label}
                          </Badge>
                          <Badge variant="outline" className="rounded-full border-border/40 bg-transparent px-2 sm:px-3 py-1 text-[9px] sm:text-[11px] text-muted-foreground">
                            {(insight.confidence * 100).toFixed(0)}% confidence
                          </Badge>
                        </div>
                      </div>
                    </div>
                  );})
                ) : (
                  <div className="rounded-[24px] border border-white/10 bg-background/40 p-4 text-sm leading-6 text-muted-foreground">
                    <p>{insightSurfacePresentation.emptyDescription}</p>
                    {insightSurfacePresentation.emptyRecommendation ? (
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{insightSurfacePresentation.emptyRecommendation}</p>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.section>

          <motion.section {...sectionMotion}>
            <Card className="glass-card rounded-[32px]">
              <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <CalendarRange className="size-4 sm:size-5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <CardDescription className="text-[10px] sm:text-xs">Life context and rhythm</CardDescription>
                    <CardTitle className="text-lg sm:text-2xl text-foreground">What may be shaping the week</CardTitle>
                  </div>
                </div>
                <Link
                  href="/life-events"
                  className={buttonVariants({
                    variant: "outline",
                    size: "sm",
                    className: `rounded-full border-border/40 bg-transparent ${mobileActionClassName}`,
                  })}
                >
                  Open
                </Link>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentContext.length ? (
                  data.recentContext.map((event) => (
                    <div key={event.id} className="rounded-[24px] border border-white/10 bg-background/40 px-3 py-3 sm:px-4 sm:py-4">
                      <div className="flex items-start justify-between gap-2 sm:gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs sm:text-sm font-medium text-foreground truncate">{event.title}</p>
                          <p className="mt-1 text-xs sm:text-sm text-muted-foreground line-clamp-2">{event.windowLabel}</p>
                        </div>
                        <Badge variant="secondary" className="rounded-full px-2 sm:px-3 py-1 text-[9px] sm:text-[11px] uppercase tracking-[0.22em] whitespace-nowrap">
                          {event.severityLabel}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full border-border/40 bg-transparent text-[9px] sm:text-[11px] uppercase tracking-[0.18em]">
                          {event.categoryLabel}
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-border/40 bg-transparent text-[9px] sm:text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          {event.sentimentLabel}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  data.plannerPreview.map((item) => (
                    <div key={item.id} className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-[24px] border border-white/10 bg-background/40 px-3 py-3 sm:px-4 sm:py-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-xs sm:text-sm font-medium text-foreground truncate">{item.title}</p>
                        <p className="mt-1 text-xs sm:text-sm text-muted-foreground">{item.when}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="rounded-full px-2 sm:px-3 py-1 text-[9px] sm:text-[11px] uppercase tracking-[0.22em] whitespace-nowrap"
                      >
                        {item.status}
                      </Badge>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.section>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-[1fr_1fr]">
        <motion.section {...sectionMotion}>
          <Card className="glass-card rounded-[32px]">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <CardDescription className="text-[10px] sm:text-xs">Recent feed</CardDescription>
                <CardTitle className="text-lg sm:text-2xl text-foreground">Journal and activity trail</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.recentFeed.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-white/10 bg-background/40 p-3 sm:p-4">
                  <p className="text-xs sm:text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-2 text-xs sm:text-sm leading-6 text-muted-foreground">{item.description}</p>
                  <p className="mt-3 font-geist text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    {item.meta}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.section>

        <motion.section {...sectionMotion}>
          <Card className="glass-card rounded-[32px]">
            <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 flex-1">
                <CardDescription className="text-[10px] sm:text-xs">Habit pulse</CardDescription>
                <CardTitle className="text-lg sm:text-2xl text-foreground">Consistency snapshot</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.habitsSnapshot.map((habit) => (
                <div key={habit.id} className="space-y-3 rounded-[24px] border border-white/10 bg-background/40 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 sm:gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-xs sm:text-sm font-medium text-foreground">{habit.name}</p>
                      <p className="text-[10px] sm:text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {habit.type === "POSITIVE" ? "Positive habit" : "Negative habit"}
                      </p>
                    </div>
                    <span className="text-xs sm:text-sm font-medium text-foreground whitespace-nowrap">{habit.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/8">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{ width: `${habit.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.section>
      </div>
    </div>
  );
}