"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { CalendarRange, CircleHelp, HeartPulse, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { PageIntro } from "@/features/shared/components/page-intro";
import type { InsightsPageData } from "@/features/insights/types";
import {
  formatInsightContextLine,
  getInsightConfidencePresentation,
} from "@/features/insights/lib/highlight-presentation";
import { defaultMockScenario, type MockScenarioKey } from "@/lib/data/mock-scenarios";
import { cn } from "@/lib/utils";

type InsightsWorkspaceProps = {
  data: InsightsPageData;
  entryMode?: "guided-demo" | null;
  entrySource?: string | null;
  scenario?: MockScenarioKey;
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

function getCandidateStoryAnchors(candidate: InsightsPageData["analysis"]["candidates"][number]) {
  const value = candidate.payload.storyAnchors;

  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((anchor) => {
    if (!anchor || typeof anchor !== "object") {
      return [];
    }

    const record = anchor as {
      dayIso?: unknown;
      moodScore?: unknown;
      journalTitles?: unknown;
      lifeEventTitles?: unknown;
      confoundedDay?: unknown;
    };

    if (typeof record.dayIso !== "string" || typeof record.moodScore !== "number") {
      return [];
    }

    return [{
      dayIso: record.dayIso,
      moodScore: record.moodScore,
      journalTitles: Array.isArray(record.journalTitles)
        ? record.journalTitles.filter((title): title is string => typeof title === "string")
        : [],
      lifeEventTitles: Array.isArray(record.lifeEventTitles)
        ? record.lifeEventTitles.filter((title): title is string => typeof title === "string")
        : [],
      confoundedDay: record.confoundedDay === true,
    }];
  });
}

function formatAnchorDay(dayIso: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(dayIso));
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

function getConfidenceTone(confidence: number) {
  if (confidence >= 0.8) {
    return "border-[color:color-mix(in_oklab,var(--mood-4)_28%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-4)_10%,transparent)] text-foreground";
  }

  if (confidence >= 0.6) {
    return "border-[color:color-mix(in_oklab,var(--mood-3)_28%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-3)_10%,transparent)] text-foreground";
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

function InsightExtraInfoTooltip({
  children,
  label = "Extra info",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-background/70 px-2.5 py-1 text-[11px] font-medium text-muted-foreground transition hover:text-foreground"
          >
            <CircleHelp className="size-3.5" />
            {label}
          </button>
        }
      />
      <TooltipContent side="top" align="end" className="max-w-sm whitespace-normal text-xs leading-5">
        <div className="space-y-2">{children}</div>
      </TooltipContent>
    </Tooltip>
  );
}

export function InsightsWorkspace({
  data,
  entryMode = null,
  entrySource = null,
  scenario = defaultMockScenario,
}: InsightsWorkspaceProps) {
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
  const guidedCandidate = useMemo(
    () =>
      data.analysis.candidates.find((candidate) => candidate.evidenceLevel === "SUPPORTED") ??
      data.analysis.candidates[0] ??
      data.analysis.exploratoryCandidates[0] ??
      null,
    [data.analysis.candidates, data.analysis.exploratoryCandidates]
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <PageIntro
          eyebrow="Insights engine"
          title="Behavior first. Context kept in view."
          description="Cadence treats meaningful life context as part of the analytical picture. Insights surfaces observations from recent tracking, planner experiments turn those observations into hypotheses, and tested support only appears after follow-through is recorded."
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

      {entryMode === "guided-demo" ? (
        <Card className="glass-card rounded-[32px] border-primary/20 bg-primary/[0.04]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Guided demo path · Step 4 of 4</p>
              <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">Interpret what changed after the experiment.</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {entrySource === "journal"
                  ? "You arrived from Journal after capturing the narrative context. Use Insights to compare that story with the planner outcome and decide whether the visible pattern looks supported, softened by context, or still too early to trust."
                  : "Use Insights to compare the weekly review, planner follow-through, and journal context in one analytical read."}
              </p>
            </div>
            <div className="grid gap-3">
              <div className="rounded-[24px] border border-border/40 bg-background/65 p-4 text-sm leading-6 text-muted-foreground">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Recommended interpretation</p>
                <p className="mt-2 text-base font-medium text-foreground">
                  {guidedCandidate?.title ?? "Compare tested support against the current signal mix."}
                </p>
                <p className="mt-2">{guidedCandidate?.summary ?? "Look for whether the experiment still reads as promising once context-heavy days and weak evidence are kept in frame."}</p>
                <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                  {guidedCandidate?.evidenceSummary ?? "Treat supported observations as stronger leads, and keep exploratory relationships separate from conclusions."}
                </p>
              </div>
              {[
                "1. Compare the planner outcome with the strongest visible observation on this page.",
                "2. Use the journal context to decide whether the pattern is clearer or more confounded than the metric alone suggests.",
                "3. Keep exploratory relationships visible, but separate them from tested support.",
              ].map((item) => (
                <div key={item} className="rounded-[24px] border border-border/40 bg-background/65 px-4 py-3 text-sm leading-6 text-muted-foreground">
                  {item}
                </div>
              ))}
              <div className="flex flex-wrap gap-3 pt-1">
                <Link
                  href={`/journal?${new URLSearchParams({
                    entry: "guided-demo",
                    source: "insights",
                    ...(scenario !== defaultMockScenario ? { scenario } : {}),
                  }).toString()}`}
                  className={buttonVariants({
                    variant: "outline",
                    className: "rounded-full border-border/40 bg-transparent",
                  })}
                >
                  Return to Journal
                </Link>
                <Link
                  href={`/dashboard?${new URLSearchParams({
                    entry: "guided-demo",
                    ...(scenario !== defaultMockScenario ? { scenario } : {}),
                  }).toString()}`}
                  className={buttonVariants({
                    variant: "outline",
                    className: "rounded-full border-border/40 bg-transparent",
                  })}
                >
                  Open dashboard weekly review
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

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
            <CardDescription>Observation mix</CardDescription>
            <CardTitle>{supportedSignals} supported / {emergingSignals} emerging</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              {sameDaySignals} same-day and {laggedSignals} delayed observations are currently visible. {exploratorySignals} additional signals remain exploratory and are intentionally kept out of the primary feed until more tracking exists.
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

      <Card className="rounded-[32px] border-border/40 bg-card/70">
        <CardHeader>
          <CardDescription>How to read this page</CardDescription>
          <CardTitle>Observation first, support later</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[24px] border border-border/40 bg-background/35 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Observation</p>
            <p className="mt-2 text-sm leading-6 text-foreground">A repeated pattern in recent tracking that is worth noticing.</p>
          </div>
          <div className="rounded-[24px] border border-border/40 bg-background/35 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Hypothesis</p>
            <p className="mt-2 text-sm leading-6 text-foreground">A planner experiment you choose to run because the observation looks worth testing.</p>
          </div>
          <div className="rounded-[24px] border border-border/40 bg-background/35 p-4">
            <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Tested support</p>
            <p className="mt-2 text-sm leading-6 text-foreground">What happened after you tried the experiment and logged whether the expected effect actually showed up.</p>
          </div>
        </CardContent>
      </Card>

      <div className="">
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>Observed patterns</CardDescription>
            <CardTitle>What the current data suggests testing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.analysis.candidates.length ? (
              data.analysis.candidates.map((candidate) => {
                const contextShare = getCandidateContextShare(candidate);
                const confidencePresentation = getInsightConfidencePresentation(candidate.confidence);
                const storyAnchors = getCandidateStoryAnchors(candidate);
                const relevantDayCount = Math.max(candidate.exposedDayCount, candidate.sampleSize);

                return (
                  <div key={candidate.id} className="rounded-[24px] border border-border/40 bg-background/50 p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="border-border/40 bg-transparent text-foreground">
                        {candidate.metric.replaceAll("_", " ")}
                      </Badge>
                      <Badge variant="outline" className={cn("border-border/40", getEvidenceTone(candidate.evidenceLevel))}>
                        {candidate.evidenceLabel}
                      </Badge>
                      <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                        {candidate.lagDays === 0 ? "Same day" : `${candidate.lagDays}-day delay`}
                      </Badge>
                    </div>
                    <div className="mt-4 flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <h2 className="text-lg font-semibold tracking-tight text-foreground">{candidate.title}</h2>
                        <p className="text-sm leading-6 text-muted-foreground">{candidate.summary}</p>
                        <div className="flex flex-wrap items-center gap-2 pt-1">
                          <Badge variant="outline" className={cn("border-border/40", getConfidenceTone(candidate.confidence))}>
                            {confidencePresentation.label}
                          </Badge>
                          {contextShare > 0 ? (
                            <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                              {Math.round(contextShare * 100)}% context overlap
                            </Badge>
                          ) : null}
                          <InsightExtraInfoTooltip>
                            <p>{candidate.alignedDayCount} of {relevantDayCount} relevant days moved in the expected direction.</p>
                            <p>{confidencePresentation.description}</p>
                            <p>{candidate.uncertaintySummary}</p>
                            <p>{candidate.adjustmentSummary}</p>
                            <p>
                              Raw {getCandidateCorrelationLabel(candidate, "rawCorrelation")} · Adjusted {getCandidateCorrelationLabel(candidate, "adjustedCorrelation")} · {Math.round(candidate.rawConfidence * 100)}% to {Math.round(candidate.adjustedConfidence * 100)}% confidence
                            </p>
                          </InsightExtraInfoTooltip>
                        </div>
                        <div className="grid gap-3 md:grid-cols-2">
                          <div className="rounded-[20px] border border-border/40 bg-card/70 p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Why it stands out</p>
                            <p className="mt-2 text-sm leading-6 text-foreground">{candidate.evidenceSummary}</p>
                          </div>
                          <div className="rounded-[20px] border border-border/40 bg-card/70 p-4">
                            <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">How to read it</p>
                            <p className="mt-2 text-sm leading-6 text-foreground">
                              {contextShare > 0
                                ? formatInsightContextLine(contextShare)
                                : "This read is less tangled up with logged external context, so it is easier to interpret directly."}
                            </p>
                          </div>
                        </div>
                        {storyAnchors.length ? (
                          <div className="rounded-[20px] border border-border/40 bg-card/70 p-4">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Story anchors</p>
                                <p className="mt-1 text-xs leading-5 text-muted-foreground">
                                  These journal and context moments are the clearest visible examples behind the pattern.
                                </p>
                              </div>
                              <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                                {storyAnchors.length} anchor{storyAnchors.length === 1 ? "" : "s"}
                              </Badge>
                            </div>
                            <div className="mt-4 grid gap-3 md:grid-cols-2">
                              {storyAnchors.map((anchor) => (
                                <div key={anchor.dayIso} className="rounded-[18px] border border-border/40 bg-background/45 p-4">
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="text-sm font-medium text-foreground">{formatAnchorDay(anchor.dayIso)}</p>
                                    <div className="flex flex-wrap gap-2">
                                      <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                                        {anchor.moodScore}/100 mood
                                      </Badge>
                                      {anchor.confoundedDay ? (
                                        <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                                          Context-heavy
                                        </Badge>
                                      ) : null}
                                    </div>
                                  </div>
                                  {anchor.journalTitles.length ? (
                                    <p className="mt-3 text-sm leading-6 text-foreground">
                                      <span className="text-muted-foreground">Journal:</span> {anchor.journalTitles.join(" · ")}
                                    </p>
                                  ) : null}
                                  {anchor.lifeEventTitles.length ? (
                                    <p className="mt-2 text-sm leading-6 text-foreground">
                                      <span className="text-muted-foreground">Context:</span> {anchor.lifeEventTitles.join(" · ")}
                                    </p>
                                  ) : null}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </div>
                      <div className="rounded-[20px] border border-border/40 bg-card/80 px-4 py-3 text-right">
                        <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Signal</p>
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
                      These are observations worth watching, but not strong enough to treat as reliable support yet.
                    </p>
                  </div>
                  <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                    Exploratory only
                  </Badge>
                </div>

                <div className="mt-4 space-y-3">
                  {data.analysis.exploratoryCandidates.map((candidate) => {
                    const confidencePresentation = getInsightConfidencePresentation(candidate.confidence);

                    return (
                    <div key={candidate.id} className="rounded-[20px] border border-border/40 bg-card/70 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className="border-border/40 bg-transparent text-foreground">
                          {candidate.metric.replaceAll("_", " ")}
                        </Badge>
                        <Badge variant="outline" className={cn("border-border/40", getEvidenceTone(candidate.evidenceLevel))}>
                          {candidate.evidenceLabel}
                        </Badge>
                        <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                          {candidate.lagDays === 0 ? "Same day" : `${candidate.lagDays}-day delay`}
                        </Badge>
                      </div>
                      <h3 className="mt-3 text-base font-semibold tracking-tight text-foreground">{candidate.title}</h3>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{candidate.summary}</p>
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <Badge variant="outline" className={cn("border-border/40", getConfidenceTone(candidate.confidence))}>
                          {confidencePresentation.label}
                        </Badge>
                        <InsightExtraInfoTooltip>
                          <p>{candidate.evidenceSummary}</p>
                          <p>{confidencePresentation.description}</p>
                          <p>{candidate.uncertaintySummary}</p>
                        </InsightExtraInfoTooltip>
                      </div>
                    </div>
                  );})}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="space-y-5 pt-5">
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