"use client";

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, HeartPulse, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageIntro } from "@/features/shared/components/page-intro";
import type { InsightsPageData } from "@/features/insights/types";
import { cn } from "@/lib/utils";

type InsightsWorkspaceProps = {
  data: InsightsPageData;
};

function getCandidateContextShare(candidate: InsightsPageData["analysis"]["candidates"][number]) {
  const value = candidate.payload.confoundedDayShare;

  return typeof value === "number" ? value : 0;
}

function getCandidateCorrelationLabel(
  candidate: InsightsPageData["analysis"]["candidates"][number],
  key: "rawCorrelation" | "adjustedCorrelation"
) {
  const value = candidate.payload[key];

  return typeof value === "number" ? value.toFixed(2) : "-";
}

function getEvidenceTone(level: InsightsPageData["analysis"]["candidates"][number]["evidenceLevel"]) {
  if (level === "SUPPORTED") {
    return "border-[color:color-mix(in_oklab,var(--mood-4)_28%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-4)_12%,transparent)] text-foreground";
  }

  if (level === "EMERGING") {
    return "border-[color:color-mix(in_oklab,var(--mood-3)_28%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-3)_12%,transparent)] text-foreground";
  }

  return "border-border/40 bg-background/45 text-muted-foreground";
}

function getSentimentTone(sentiment: InsightsPageData["context"]["lifeEvents"][number]["sentiment"]) {
  if (sentiment === "POSITIVE") {
    return "border-[color:color-mix(in_oklab,var(--mood-4)_32%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-4)_14%,transparent)] text-foreground";
  }

  if (sentiment === "NEGATIVE") {
    return "border-[color:color-mix(in_oklab,var(--mood-2)_32%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-2)_14%,transparent)] text-foreground";
  }

  return "border-border/40 bg-background/45 text-muted-foreground";
}

export function InsightsWorkspace({ data }: InsightsWorkspaceProps) {
  const router = useRouter();

  const averageMoodBlocks =
    data.analysis.rows.reduce((sum, row) => sum + row.moodPeriodsCount, 0) /
    Math.max(data.analysis.rows.length, 1);
  const laggedSignals = data.analysis.candidates.filter((candidate) => candidate.lagDays > 0).length;
  const sameDaySignals = data.analysis.candidates.filter((candidate) => candidate.lagDays === 0).length;
  const supportedSignals = data.analysis.summary.supportedSignals;
  const emergingSignals = data.analysis.summary.emergingSignals;
  const exploratorySignals = data.analysis.summary.exploratorySignals;
  const confoundedDays = data.analysis.rows.filter((row) => row.confoundedDay).length;
  const contextAwareSignals = data.analysis.candidates.filter(
    (candidate) => getCandidateContextShare(candidate) > 0
  ).length;
  const maxVisibleLagDays = data.analysis.summary.visibleLagDays.at(-1) ?? 0;

  const contextTags = useMemo(
    () =>
      data.context.lifeEvents
        .flatMap((event) => event.tags)
        .filter((tag, index, tags) => tags.indexOf(tag) === index)
        .slice(0, 6),
    [data.context.lifeEvents]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <PageIntro
          eyebrow="Insights engine"
          title="Behavior first. Context kept in view."
          description="Cadence now treats meaningful life context as part of the analytical picture, so low mood during illness, grief, or strain does not get mistaken for a behavioural failure signal."
        />
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
            {data.dataSource === "mock" ? "Mock preview" : "Database connected"}
          </Badge>
          <Button type="button" className="rounded-full" onClick={() => router.push("/life-events") }>
            Open context
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>Tracked rows</CardDescription>
            <CardTitle>{data.analysis.rows.length} daily feature rows</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Daily rows now include mood periods, behaviors, and contextual life-event burden.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>Evidence mix</CardDescription>
            <CardTitle>{supportedSignals} supported / {emergingSignals} emerging</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              {sameDaySignals} same-day and {laggedSignals} delayed patterns are currently visible. {exploratorySignals} additional signals remain exploratory and are intentionally kept out of the primary feed.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>Context-heavy days</CardDescription>
            <CardTitle>{confoundedDays} days currently flagged</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              These are days where logged external context likely carries enough weight to soften confidence in behavioural correlations.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>Reflection density</CardDescription>
            <CardTitle>{averageMoodBlocks.toFixed(1)} mood blocks per day</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              More mood blocks and more context events create stronger timing and confounder signals across same-day to {maxVisibleLagDays}-day windows.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>Evidence-graded patterns</CardDescription>
            <CardTitle>What the current data supports</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.analysis.candidates.length ? (
              data.analysis.candidates.map((candidate) => {
                const contextShare = getCandidateContextShare(candidate);

                return (
                  <div key={candidate.id} className="rounded-[24px] border border-border/40 bg-background/50 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-border/40 bg-transparent text-foreground">
                        {candidate.metric.replaceAll("_", " ")}
                      </Badge>
                      <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                        {candidate.lagDays === 0 ? "Same day" : `${candidate.lagDays}-day lag`}
                      </Badge>
                      <Badge variant="outline" className={cn("border-border/40", getEvidenceTone(candidate.evidenceLevel))}>
                        {candidate.evidenceLabel}
                      </Badge>
                      <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                        {Math.round(candidate.confidence * 100)}% confidence
                      </Badge>
                      {contextShare > 0 ? (
                        <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                          {Math.round(contextShare * 100)}% context-heavy exposure
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">{candidate.title}</h2>
                        <p className="text-sm leading-6 text-muted-foreground">{candidate.summary}</p>
                        <p className="text-xs leading-5 text-muted-foreground">{candidate.evidenceSummary}</p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {candidate.alignedDayCount} of {Math.max(candidate.exposedDayCount, candidate.sampleSize)} relevant days move in the expected direction. {candidate.uncertaintySummary}
                        </p>
                        <div className="rounded-[20px] border border-border/40 bg-card/70 p-4">
                          <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                            <span>Raw {getCandidateCorrelationLabel(candidate, "rawCorrelation")}</span>
                            <span>Adjusted {getCandidateCorrelationLabel(candidate, "adjustedCorrelation")}</span>
                            <span>{Math.round(candidate.rawConfidence * 100)}% to {Math.round(candidate.adjustedConfidence * 100)}%</span>
                          </div>
                          <p className="mt-2 text-xs leading-5 text-muted-foreground">{candidate.adjustmentSummary}</p>
                        </div>
                      </div>
                      <div className="rounded-[20px] border border-border/40 bg-card/80 px-4 py-3 text-right">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Strength</p>
                        <p className="mt-1 text-2xl font-semibold tracking-tight text-foreground">{candidate.strength.toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="rounded-[24px] border border-dashed border-border/50 bg-background/35 p-5">
                <h2 className="text-lg font-semibold tracking-tight text-foreground">
                  {data.analysis.nullState?.title ?? "Not enough signal yet"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {data.analysis.nullState?.description ?? "Cadence needs a little more consistent tracking before it can surface supported patterns."}
                </p>
                {data.analysis.nullState ? (
                  <p className="mt-3 text-xs leading-5 text-muted-foreground">
                    {data.analysis.nullState.recommendation}
                  </p>
                ) : null}
              </div>
            )}

            {data.analysis.exploratoryCandidates.length ? (
              <div className="rounded-[24px] border border-border/40 bg-background/35 p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold tracking-tight text-foreground">Still too early to trust</h2>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      These patterns are visible enough to watch, but not strong enough to treat as reliable yet.
                    </p>
                  </div>
                  <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                    Exploratory only
                  </Badge>
                </div>

                <div className="mt-4 space-y-3">
                  {data.analysis.exploratoryCandidates.map((candidate) => (
                    <div key={candidate.id} className="rounded-[20px] border border-border/40 bg-card/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-border/40 bg-transparent text-foreground">
                          {candidate.metric.replaceAll("_", " ")}
                        </Badge>
                        <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                          {candidate.lagDays === 0 ? "Same day" : `${candidate.lagDays}-day lag`}
                        </Badge>
                        <Badge variant="outline" className={cn("border-border/40", getEvidenceTone(candidate.evidenceLevel))}>
                          {candidate.evidenceLabel}
                        </Badge>
                      </div>
                      <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground">{candidate.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{candidate.summary}</p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{candidate.evidenceSummary}</p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">{candidate.uncertaintySummary}</p>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-[32px] border-border/40 bg-card/70">
            <CardHeader>
              <div className="flex items-center gap-3">
                <HeartPulse className="size-5 text-primary" />
                <div>
                  <CardDescription>Life context</CardDescription>
                  <CardTitle>Meaningful events in view</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[24px] border border-border/40 bg-background/45 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Total logged</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{data.context.summary.totalEvents}</p>
                </div>
                <div className="rounded-[24px] border border-border/40 bg-background/45 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Active now</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{data.context.summary.activeEvents}</p>
                </div>
                <div className="rounded-[24px] border border-border/40 bg-background/45 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Ongoing</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{data.context.summary.ongoingEvents}</p>
                </div>
                <div className="rounded-[24px] border border-border/40 bg-background/45 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">High severity</p>
                  <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{data.context.summary.highSeverityEvents}</p>
                </div>
              </div>
              <div className="rounded-[24px] border border-border/40 bg-background/50 p-4 text-sm leading-6 text-muted-foreground">
                {contextAwareSignals
                  ? `${contextAwareSignals} current insight candidates are now being softened or contextualized by logged life events.`
                  : "Add context events when they materially shape a period. The goal is better interpretation, not more tracking for its own sake."}
              </div>
              <Button type="button" variant="outline" className="rounded-full" onClick={() => router.push("/life-events") }>
                Manage context timeline
              </Button>
              {contextTags.length ? (
                <div className="flex flex-wrap gap-2">
                  {contextTags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-border/40 bg-transparent capitalize">
                      {tag}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="rounded-[32px] border-border/40 bg-card/70">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CalendarRange className="size-5 text-primary" />
                <div>
                  <CardDescription>Recent context</CardDescription>
                  <CardTitle>Keep meaningful events visible</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.context.lifeEvents.length ? (
                  data.context.lifeEvents.map((event) => (
                  <div key={event.id} className="rounded-[24px] border border-border/40 bg-background/45 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-base font-semibold tracking-tight text-foreground">{event.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{event.windowLabel}</p>
                      </div>
                      <Badge variant="outline" className={cn("capitalize", getSentimentTone(event.sentiment))}>
                        {event.sentimentLabel}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-border/40 bg-transparent">{event.categoryLabel}</Badge>
                      <Badge variant="outline" className="border-border/40 bg-transparent">{event.severityLabel}</Badge>
                      {event.tags.map((tag) => (
                        <Badge key={`${event.id}-${tag}`} variant="outline" className="border-border/40 bg-transparent capitalize">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    {event.description ? (
                      <p className="mt-3 text-sm leading-6 text-muted-foreground">{event.description}</p>
                    ) : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border/40 bg-background/45 p-5 text-sm leading-6 text-muted-foreground">
                  No context events logged yet. Add one when sickness, grief, travel, burnout, or a meaningful positive shift should stay in the analytical picture.
                </div>
              )}
              <Button type="button" variant="outline" className="rounded-full" onClick={() => router.push("/life-events") }>
                Go to Life events
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-[32px] border-border/40 bg-card/70">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-primary" />
            <div>
              <CardDescription>Architecture</CardDescription>
              <CardTitle>Context-aware analysis stack</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
          <div className="rounded-[24px] border border-border/40 bg-background/50 p-4">
            Mood is stored as daily summaries plus intraday periods, while context is stored in its own timeline surface and projected onto day-level exposure rows for analysis.
          </div>
          <div className="rounded-[24px] border border-border/40 bg-background/50 p-4">
            Context does not invalidate behaviors. It lowers false correlations by reducing confidence when a behavior is heavily concentrated on confounded days.
          </div>
          <div className="rounded-[24px] border border-border/40 bg-background/50 p-4">
            The current model is still lightweight correlation analysis, so Cadence now grades patterns by evidence rather than treating every visible relationship as equally reliable.
          </div>
          <div className="rounded-[24px] border border-border/40 bg-background/50 p-4">
            Exploratory relationships stay visible but separate, and delayed windows now extend beyond next-day effects when the data can support that comparison.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}