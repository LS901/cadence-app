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
  formatInsightEvidenceLine,
  getInsightSurfacePresentation,
} from "@/features/insights/lib/highlight-presentation";
import type { DashboardData } from "@/lib/data/mock-cadence";
import { MoodTrendChart } from "@/features/dashboard/components/mood-trend-chart";
import { upsertQuickMoodCaptureAction } from "@/server/mood/actions";

type DashboardOverviewProps = {
  data: DashboardData;
  focusContext?: {
    sourceLabel: string;
    windowLabel: string;
  } | null;
};

const sectionMotion = {
  initial: { opacity: 0, y: 16 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.25 },
  transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
};

export function DashboardOverview({ data, focusContext = null }: DashboardOverviewProps) {
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
  const moodReflectionHref = hasCompleteReflection ? "/mood" : "/mood?compose=today";
  const plannerSuggestionHref = `/planner?${new URLSearchParams({
    compose: "review",
    title: data.weeklyReview.plannerSuggestion.title,
    historyAnchorTitle: data.weeklyReview.plannerSuggestion.historyAnchorTitle ?? "",
    category: data.weeklyReview.plannerSuggestion.category,
    notes: data.weeklyReview.plannerSuggestion.notes,
    durationMinutes: String(data.weeklyReview.plannerSuggestion.durationMinutes),
    recurring: data.weeklyReview.plannerSuggestion.recurring ? "true" : "false",
    recurrencePattern: data.weeklyReview.plannerSuggestion.recurrencePattern,
  }).toString()}`;

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

  function getTimelineTone(sentiment: DashboardData["contextTimeline"][number]["dominantSentiment"]) {
    if (sentiment === "POSITIVE") {
      return "border-[color:color-mix(in_oklab,var(--mood-4)_32%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-4)_14%,transparent)]";
    }

    if (sentiment === "NEGATIVE") {
      return "border-[color:color-mix(in_oklab,var(--mood-2)_32%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-2)_14%,transparent)]";
    }

    if (sentiment === "MIXED") {
      return "border-border/50 bg-background/55";
    }

    return "border-border/30 bg-background/35";
  }

  return (
    <div className="space-y-8">
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
        {data.overview.map((item) => (
          <Card key={item.label} className="glass-card rounded-[28px]">
            <CardHeader className="space-y-2">
              <CardDescription>{item.label}</CardDescription>
              <CardTitle className="text-3xl font-semibold tracking-tight text-foreground">
                {item.value}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between gap-4 text-sm text-muted-foreground">
              <span>{item.detail}</span>
              <ArrowUpRight className="size-4 text-primary" />
            </CardContent>
          </Card>
        ))}
      </motion.section>

      <motion.section {...sectionMotion}>
        <Card className="glass-card rounded-[32px]">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardDescription>Quick capture</CardDescription>
              <CardTitle className="text-2xl text-foreground">Check in now, reflect later</CardTitle>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="rounded-full border-border/40 bg-transparent px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
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
          <CardContent className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">
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
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  className="rounded-full"
                  disabled={isPending || hasCompleteReflection || quickScore == null}
                  onClick={handleQuickCaptureSubmit}
                >
                  Save quick check-in
                </Button>
                <Link
                  href={moodReflectionHref}
                  className={buttonVariants({
                    variant: "outline",
                    className: "rounded-full border-border/40 bg-transparent",
                  })}
                >
                  Finish the day properly
                </Link>
              </div>
            </div>

            <div className="rounded-[28px] border border-border/40 bg-background/40 p-5">
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

      <motion.section {...sectionMotion}>
        <Card className="glass-card rounded-[32px]">
          <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <CardDescription>Weekly review synthesis</CardDescription>
              <CardTitle className="text-2xl text-foreground">{data.weeklyReview.title}</CardTitle>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href={moodReflectionHref}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "rounded-full border-border/40 bg-transparent",
                })}
              >
                Open Mood review
              </Link>
              <Link
                href={plannerSuggestionHref}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                  className: "rounded-full border-border/40 bg-transparent",
                })}
              >
                Carry into Planner
              </Link>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{data.weeklyReview.summary}</p>
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="rounded-[24px] border border-border/40 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  {data.weeklyReview.momentumLabel}
                </p>
                <p className="mt-3 text-sm leading-6 text-foreground">{data.weeklyReview.momentumDetail}</p>
              </div>
              <div className="rounded-[24px] border border-border/40 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  {data.weeklyReview.signalLabel}
                </p>
                <p className="mt-3 text-sm leading-6 text-foreground">{data.weeklyReview.signalDetail}</p>
              </div>
              <div className="rounded-[24px] border border-border/40 bg-background/45 p-4">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  {data.weeklyReview.contextLabel}
                </p>
                <p className="mt-3 text-sm leading-6 text-foreground">{data.weeklyReview.contextDetail}</p>
              </div>
            </div>
            <div className="rounded-[26px] border border-border/40 bg-card/70 p-5">
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Carry forward</p>
              <p className="mt-3 text-sm leading-6 text-foreground">{data.weeklyReview.nextStep}</p>
            </div>
            {data.weeklyReviewArchive.length ? (
              <div className="space-y-3 border-t border-border/40 pt-2">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Review archive</p>
                  <Badge variant="outline" className="rounded-full border-border/40 bg-transparent px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Last {data.weeklyReviewArchive.length} weeks
                  </Badge>
                </div>
                <div className="grid gap-3 lg:grid-cols-3">
                  {data.weeklyReviewArchive.map((item) => (
                    <div key={item.weekLabel} className="rounded-[24px] border border-border/40 bg-background/45 p-4">
                      <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{item.weekLabel}</p>
                      <p className="mt-3 text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.summary}</p>
                      <p className="mt-3 text-xs leading-5 text-muted-foreground">{item.nextStep}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </motion.section>

      <div className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <motion.section {...sectionMotion}>
          <Card className="glass-card rounded-[32px]">
            <CardHeader className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardDescription>Mood graph</CardDescription>
                  <CardTitle className="text-2xl text-foreground">
                    Daily emotional baseline
                  </CardTitle>
                </div>
                <Badge
                  variant="secondary"
                  className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]"
                >
                  Live seeded data
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <MoodTrendChart data={data.moodSeries} />
              {hasContextTimeline ? (
                <div className="mt-6 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Context track</p>
                      <p className="text-xs leading-5 text-muted-foreground">Days where external life events may be shaping the baseline.</p>
                    </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="rounded-full border-border/40 bg-transparent px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
                          Last 7 days
                        </Badge>
                        <Link
                          href="/life-events"
                          className={buttonVariants({
                            variant: "outline",
                            size: "sm",
                            className: "rounded-full border-border/40 bg-transparent",
                          })}
                        >
                          Manage context
                        </Link>
                      </div>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-7">
                    {data.contextTimeline.map((point) => (
                      <div
                        key={point.dateIso}
                        className={`rounded-[20px] border px-3 py-3 ${getTimelineTone(point.dominantSentiment)}`}
                      >
                        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{point.day}</p>
                        <p className="mt-2 text-sm font-medium text-foreground">
                          {point.activeCount ? `${point.activeCount} context ${point.activeCount === 1 ? "event" : "events"}` : "Clear day"}
                        </p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                          {point.dominantTitle ?? "No major external weight logged."}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </motion.section>

        <div className="grid gap-6">
          <motion.section {...sectionMotion}>
            <Card className="glass-card rounded-[32px]">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <Sparkles className="size-5 text-primary" />
                  <CardTitle className="text-2xl text-foreground">Insights</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {data.insights.length ? (
                  data.insights.map((insight) => (
                    <div key={insight.id} className="rounded-[24px] border border-white/10 bg-background/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-foreground">{insight.title}</p>
                            <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
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
                        </div>
                        <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px]">
                          {(insight.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                    </div>
                  ))
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
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <CalendarRange className="size-5 text-primary" />
                    <div>
                      <CardDescription>Life context and rhythm</CardDescription>
                      <CardTitle className="text-2xl text-foreground">What may be shaping the week</CardTitle>
                    </div>
                  </div>
                  <Link
                    href="/life-events"
                    className={buttonVariants({
                      variant: "outline",
                      size: "sm",
                      className: "rounded-full border-border/40 bg-transparent",
                    })}
                  >
                    Open
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {data.recentContext.length ? (
                  data.recentContext.map((event) => (
                    <div key={event.id} className="rounded-[24px] border border-white/10 bg-background/40 px-4 py-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{event.title}</p>
                          <p className="mt-1 text-sm text-muted-foreground">{event.windowLabel}</p>
                        </div>
                        <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
                          {event.severityLabel}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full border-border/40 bg-transparent text-[11px] uppercase tracking-[0.18em]">
                          {event.categoryLabel}
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-border/40 bg-transparent text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                          {event.sentimentLabel}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  data.plannerPreview.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-[24px] border border-white/10 bg-background/40 px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-foreground">{item.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{item.when}</p>
                      </div>
                      <Badge
                        variant="secondary"
                        className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]"
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

      <div className="grid gap-6 xl:grid-cols-[0.98fr_1.02fr]">
        <motion.section {...sectionMotion}>
          <Card className="glass-card rounded-[32px]">
            <CardHeader>
              <CardDescription>Recent feed</CardDescription>
              <CardTitle className="text-2xl text-foreground">Journal and activity trail</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.recentFeed.map((item) => (
                <div key={item.id} className="rounded-[24px] border border-white/10 bg-background/40 p-4">
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p>
                  <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    {item.meta}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.section>

        <motion.section {...sectionMotion}>
          <Card className="glass-card rounded-[32px]">
            <CardHeader>
              <CardDescription>Habit pulse</CardDescription>
              <CardTitle className="text-2xl text-foreground">Consistency snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.habitsSnapshot.map((habit) => (
                <div key={habit.id} className="space-y-3 rounded-[24px] border border-white/10 bg-background/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{habit.name}</p>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {habit.type === "POSITIVE" ? "Positive habit" : "Negative habit"}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-foreground">{habit.progress}%</span>
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