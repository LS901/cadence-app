"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  CalendarRange,
  GripHorizontal,
  Plus,
  Save,
  Sparkles,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { MoodTrendChart } from "@/features/dashboard/components/mood-trend-chart";
import {
  formatInsightEvidenceLine,
  getInsightSurfacePresentation,
} from "@/features/insights/lib/highlight-presentation";
import {
  getReflectionDraftPeriods,
  isQuickCaptureDraft,
} from "@/features/mood/lib/reflection-draft";
import type {
  MoodPageData,
  MoodReflectionEntry,
  MoodReflectionPeriod,
} from "@/features/mood/types";
import { getLifeEventSentimentLabel } from "@/lib/life-events";
import {
  SLOT_MINUTES,
  TOTAL_DAY_MINUTES,
  clampMoodScore,
  deriveMoodSummary,
  formatMinuteLabel,
  getMoodColorToken,
  hasOverlappingMoodPeriods,
  minuteToTimeInput,
  parseTagInput,
  sortMoodPeriods,
  timeInputToMinute,
} from "@/lib/mood";
import { cn } from "@/lib/utils";
import { upsertCompleteDayReflectionAction } from "@/server/mood/actions";

type MoodReflectionWorkspaceProps = {
  data: MoodPageData;
  openTodayComposerOnLoad?: boolean;
  focusContext?: {
    sourceLabel: string;
    windowLabel: string;
  } | null;
};

type DraftPeriod = MoodReflectionPeriod;

type PendingSegment = {
  id: string | null;
  startMinute: number;
  endMinute: number;
  score: string;
  notes: string;
  tagsInput: string;
};

const SLOT_COUNT = TOTAL_DAY_MINUTES / SLOT_MINUTES;
const SLEEP_QUALITY_OPTIONS = [
  { value: 1, label: "1 - Very restless" },
  { value: 2, label: "2 - Fragmented" },
  { value: 3, label: "3 - Fair" },
  { value: 4, label: "4 - Rested" },
  { value: 5, label: "5 - Deep and restorative" },
];
const WORK_STRESS_OPTIONS = [
  { value: 1, label: "1 - Light" },
  { value: 2, label: "2 - Manageable" },
  { value: 3, label: "3 - Demanding" },
  { value: 4, label: "4 - Heavy" },
  { value: 5, label: "5 - Overloaded" },
];
const SOCIAL_QUALITY_OPTIONS = [
  { value: 1, label: "1 - Isolating or draining" },
  { value: 2, label: "2 - Thin" },
  { value: 3, label: "3 - Neutral" },
  { value: 4, label: "4 - Supportive" },
  { value: 5, label: "5 - Nourishing and connected" },
];
const TIME_SLOT_OPTIONS = Array.from({ length: SLOT_COUNT + 1 }, (_, index) => {
  const minute = index * SLOT_MINUTES;

  return {
    value: minute,
    label: minuteToTimeInput(minute),
  };
});

function toDateInputValue(dayIso: string) {
  const date = new Date(dayIso);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function createPendingSegment(segment?: Partial<PendingSegment>): PendingSegment {
  return {
    id: segment?.id ?? null,
    startMinute: segment?.startMinute ?? 9 * 60,
    endMinute: segment?.endMinute ?? 11 * 60,
    score: segment?.score ?? "72",
    notes: segment?.notes ?? "",
    tagsInput: segment?.tagsInput ?? "",
  };
}

function getTodayDateInput() {
  return toDateInputValue(new Date().toISOString());
}

function getOptionLabel(options: Array<{ value: number; label: string }>, value: number | null | undefined) {
  return options.find((option) => option.value === value)?.label ?? "-";
}

function getEditorDraft(entry: MoodReflectionEntry | null) {
  return {
    reflectionDay: entry ? toDateInputValue(entry.dayIso) : getTodayDateInput(),
    sleepHours: entry?.sleepHours != null ? String(entry.sleepHours) : "",
    sleepQuality: entry?.sleepQuality != null ? String(entry.sleepQuality) : "",
    workStress: entry?.workStress != null ? String(entry.workStress) : "",
    socialQuality: entry?.socialQuality != null ? String(entry.socialQuality) : "",
    notes: entry?.notes ?? "",
    dayTagsInput: entry?.tags.join(", ") ?? "",
    periods: getReflectionDraftPeriods(entry),
  };
}

export function MoodReflectionWorkspace({
  data,
  openTodayComposerOnLoad = false,
  focusContext = null,
}: MoodReflectionWorkspaceProps) {
  const router = useRouter();
  const initialEditorEntry = openTodayComposerOnLoad ? data.todayEntry : null;
  const initialEditorDraft = getEditorDraft(initialEditorEntry);
  const [isPending, startTransition] = useTransition();
  const [isEditorOpen, setIsEditorOpen] = useState(openTodayComposerOnLoad);
  const [editingEntry, setEditingEntry] = useState<MoodReflectionEntry | null>(initialEditorEntry);
  const [reflectionDay, setReflectionDay] = useState(initialEditorDraft.reflectionDay);
  const [sleepHours, setSleepHours] = useState(initialEditorDraft.sleepHours);
  const [sleepQuality, setSleepQuality] = useState(initialEditorDraft.sleepQuality);
  const [workStress, setWorkStress] = useState(initialEditorDraft.workStress);
  const [socialQuality, setSocialQuality] = useState(initialEditorDraft.socialQuality);
  const [notes, setNotes] = useState(initialEditorDraft.notes);
  const [dayTagsInput, setDayTagsInput] = useState(initialEditorDraft.dayTagsInput);
  const [periods, setPeriods] = useState<DraftPeriod[]>(initialEditorDraft.periods);
  const [pendingSegment, setPendingSegment] = useState<PendingSegment | null>(null);
  const [dragState, setDragState] = useState<{ anchor: number; current: number; active: boolean } | null>(null);

  const currentEntry = data.recentEntries[0] ?? null;
  const hasTodayDraft = isQuickCaptureDraft(data.todayEntry);
  const seededDraftPeriod = editingEntry && isQuickCaptureDraft(editingEntry)
    ? getReflectionDraftPeriods(editingEntry)[0] ?? null
    : null;
  const derivedSummary = useMemo(() => deriveMoodSummary(periods), [periods]);
  const hasContextTimeline = data.contextTimeline.some((point) => point.activeCount > 0);
  const selectedSlotRange = useMemo(() => {
    if (!dragState) {
      return null;
    }

    const startSlot = Math.min(dragState.anchor, dragState.current);
    const endSlot = Math.max(dragState.anchor, dragState.current) + 1;

    return {
      startMinute: startSlot * SLOT_MINUTES,
      endMinute: endSlot * SLOT_MINUTES,
    };
  }, [dragState]);

  useEffect(() => {
    if (!dragState?.active) {
      return undefined;
    }

    const handlePointerUp = () => {
      const range = {
        startMinute: Math.min(dragState.anchor, dragState.current) * SLOT_MINUTES,
        endMinute: (Math.max(dragState.anchor, dragState.current) + 1) * SLOT_MINUTES,
      };

      setPendingSegment(
        createPendingSegment({
          startMinute: range.startMinute,
          endMinute: range.endMinute,
        })
      );
      setDragState((state) => (state ? { ...state, active: false } : state));
    };

    window.addEventListener("pointerup", handlePointerUp);

    return () => {
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, [dragState]);

  const resetEditor = (entry: MoodReflectionEntry | null) => {
    const draft = getEditorDraft(entry);

    setEditingEntry(entry);
    setReflectionDay(draft.reflectionDay);
    setSleepHours(draft.sleepHours);
    setSleepQuality(draft.sleepQuality);
    setWorkStress(draft.workStress);
    setSocialQuality(draft.socialQuality);
    setNotes(draft.notes);
    setDayTagsInput(draft.dayTagsInput);
    setPeriods(draft.periods);
    setPendingSegment(null);
    setDragState(null);
  };

  const openEditor = (entry: MoodReflectionEntry | null) => {
    resetEditor(entry);
    setIsEditorOpen(true);
  };

  const handleSaveSegment = () => {
    if (!pendingSegment) {
      return;
    }

    const nextPeriod: DraftPeriod = {
      id: pendingSegment.id ?? `draft-${Date.now()}`,
      startMinute: timeInputToMinute(minuteToTimeInput(pendingSegment.startMinute)),
      endMinute: timeInputToMinute(minuteToTimeInput(pendingSegment.endMinute)),
      score: clampMoodScore(Number(pendingSegment.score || 0)),
      notes: pendingSegment.notes.trim() || null,
      tags: parseTagInput(pendingSegment.tagsInput),
    };

    if (nextPeriod.endMinute <= nextPeriod.startMinute) {
      toast.error("Mood blocks need an end time after the start time.");
      return;
    }

    const remainingPeriods = periods.filter((period) => period.id !== nextPeriod.id);

    if (hasOverlappingMoodPeriods([...remainingPeriods, nextPeriod])) {
      toast.error("Mood blocks cannot overlap. Edit the neighboring block or adjust the range first.");
      return;
    }

    const nextPeriods = sortMoodPeriods([...remainingPeriods, nextPeriod]);

    setPeriods(nextPeriods);
    setPendingSegment(null);
    setDragState(null);
  };

  const handleDeleteSegment = () => {
    if (!pendingSegment?.id) {
      setPendingSegment(null);
      return;
    }

    setPeriods((currentPeriods) => currentPeriods.filter((period) => period.id !== pendingSegment.id));
    setPendingSegment(null);
  };

  const handleSubmitReflection = () => {
    if (!periods.length) {
      toast.error("Add at least one mood block before saving the day.");
      return;
    }

    startTransition(async () => {
      try {
        await upsertCompleteDayReflectionAction({
          day: reflectionDay,
          sleepHours: sleepHours ? Number(sleepHours) : undefined,
          sleepQuality: sleepQuality ? Number(sleepQuality) : undefined,
          workStress: workStress ? Number(workStress) : undefined,
          socialQuality: socialQuality ? Number(socialQuality) : undefined,
          notes,
          tags: parseTagInput(dayTagsInput),
          periods: periods.map((period) => ({
            startMinute: period.startMinute,
            endMinute: period.endMinute,
            score: period.score,
            notes: period.notes ?? undefined,
            tags: period.tags,
          })),
        });

        toast.success("Daily reflection saved.");
        setIsEditorOpen(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save reflection.");
      }
    });
  };

  const insightHighlights = data.insightHighlights.slice(0, 2);
  const insightSurfacePresentation = getInsightSurfacePresentation({
    surface: "mood",
    mode: data.insightHighlightMode,
    nullState: data.insightNullState,
  });

  function getTimelineTone(sentiment: MoodPageData["contextTimeline"][number]["dominantSentiment"]) {
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
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="max-w-3xl space-y-3">
          <p className="font-mono text-[11px] uppercase tracking-[0.32em] text-muted-foreground">
            Complete day reflections
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Complete the day, then read the shape of it.
          </h1>
          <p className="text-sm leading-7 text-muted-foreground sm:text-base">
            Log mood in calm segments across the day. Cadence uses those blocks to derive daily stability, same-day lift, and delayed behavioral effects without turning reflection into a chore.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
            {data.dataSource === "database" ? "Reflection editor live" : "Mock preview"}
          </Badge>
          <Button className="rounded-full" onClick={() => openEditor(data.todayEntry)}>
            <Plus className="size-4" />
            {hasTodayDraft ? "Resume today's draft" : data.todayEntry ? "Edit today" : "Complete today"}
          </Button>
          {hasTodayDraft ? (
            <p className="text-sm text-muted-foreground">
              Your dashboard draft is ready to be completed with time blocks and context.
            </p>
          ) : null}
        </div>
      </div>

      {focusContext ? (
        <Card className="rounded-[32px] border-primary/20 bg-primary/[0.04]">
          <CardContent className="flex flex-col gap-3 p-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">{focusContext.sourceLabel}</p>
              <p className="mt-2 text-sm leading-6 text-foreground">
                Opened with journal context for {focusContext.windowLabel}. Use the mood blocks and same-day context below to compare that narrative stretch against fuller day-level reflection.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full border-border/40 bg-transparent px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {focusContext.windowLabel}
            </Badge>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.9fr]">
        <Card className="glass-card rounded-[32px]">
          <CardHeader>
            <CardDescription>Daily curve</CardDescription>
            <CardTitle>14-day mood and energy trend</CardTitle>
          </CardHeader>
          <CardContent className="py-2">
            {data.moodSeries.length ? (
              <div className="space-y-5">
                <MoodTrendChart data={data.moodSeries} />
                {hasContextTimeline ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">Context track</p>
                        <p className="text-xs leading-5 text-muted-foreground">External events logged across the same mood window.</p>
                      </div>
                      <Badge variant="outline" className="rounded-full border-border/40 bg-transparent px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
                        Last 14 days
                      </Badge>
                    </div>
                    <div className="grid gap-2 sm:grid-cols-7 xl:grid-cols-14">
                      {data.contextTimeline.map((point) => (
                        <div
                          key={point.dateIso}
                          className={`rounded-[18px] border px-3 py-3 ${getTimelineTone(point.dominantSentiment)}`}
                        >
                          <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{point.day}</p>
                          <p className="mt-2 text-sm font-medium text-foreground">
                            {point.activeCount ? `${point.activeCount} event${point.activeCount === 1 ? "" : "s"}` : "Clear"}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">
                            {point.dominantTitle ?? "No major context logged."}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center rounded-[24px] border border-border/40 bg-background/35 p-6 text-center text-sm text-muted-foreground">
                Complete the first day reflection to start building a richer emotional timeline.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>{currentEntry ? "Latest reflection" : "Start with one day"}</CardDescription>
            <CardTitle>{currentEntry ? `${currentEntry.score}/100 overall` : "No complete-day reflection yet"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {currentEntry ? (
              <>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
                  <div className="rounded-[24px] border border-border/40 bg-background/50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Stability</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">{currentEntry.moodStability ?? "-"}</p>
                  </div>
                  <div className="rounded-[24px] border border-border/40 bg-background/50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Sleep</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">{currentEntry.sleepHours?.toFixed(1) ?? "-"}h</p>
                  </div>
                  <div className="rounded-[24px] border border-border/40 bg-background/50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Sleep quality</p>
                    <p className="mt-2 text-sm font-semibold tracking-tight text-foreground">
                      {getOptionLabel(SLEEP_QUALITY_OPTIONS, currentEntry.sleepQuality)}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-border/40 bg-background/50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Work stress</p>
                    <p className="mt-2 text-sm font-semibold tracking-tight text-foreground">
                      {getOptionLabel(WORK_STRESS_OPTIONS, currentEntry.workStress)}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-border/40 bg-background/50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Social quality</p>
                    <p className="mt-2 text-sm font-semibold tracking-tight text-foreground">
                      {getOptionLabel(SOCIAL_QUALITY_OPTIONS, currentEntry.socialQuality)}
                    </p>
                  </div>
                  <div className="rounded-[24px] border border-border/40 bg-background/50 p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Mood blocks</p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight">{currentEntry.periods.length}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">Timeline</p>
                    <Button variant="ghost" className="rounded-full px-3" onClick={() => openEditor(currentEntry)}>
                      Edit day
                    </Button>
                  </div>
                  <div className="flex overflow-hidden rounded-[24px] border border-border/40 bg-background/60">
                    {currentEntry.periods.map((period) => {
                      const width = ((period.endMinute - period.startMinute) / TOTAL_DAY_MINUTES) * 100;
                      const moodColor = getMoodColorToken(period.score);

                      return (
                        <button
                          type="button"
                          key={period.id}
                          className="min-h-24 border-r border-background/40 p-3 text-left last:border-r-0"
                          style={{
                            width: `${Math.max(width, 18)}%`,
                            background: `linear-gradient(180deg, color-mix(in oklab, ${moodColor} 30%, transparent), color-mix(in oklab, ${moodColor} 12%, transparent))`,
                          }}
                          onClick={() => openEditor(currentEntry)}
                        >
                          <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                            {formatMinuteLabel(period.startMinute)} - {formatMinuteLabel(period.endMinute)}
                          </p>
                          <p className="mt-3 text-2xl font-semibold tracking-tight text-foreground">{period.score}</p>
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{period.notes}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {currentEntry.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="border-border/40 bg-background/50 text-foreground">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-sm font-medium text-foreground">
                      <CalendarRange className="size-4 text-primary" />
                      Context on this day
                    </div>
                    <Button variant="outline" className="rounded-full" onClick={() => router.push("/life-events")}>
                      Manage context
                    </Button>
                  </div>
                  {data.currentEntryContext.length ? (
                    data.currentEntryContext.map((event) => (
                      <div key={event.id} className="rounded-[22px] border border-border/40 bg-background/50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{event.title}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{event.windowLabel}</p>
                          </div>
                          <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                            {getLifeEventSentimentLabel(event.sentiment)}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-border/40 bg-transparent">{event.categoryLabel}</Badge>
                          <Badge variant="outline" className="border-border/40 bg-transparent">{event.severityLabel}</Badge>
                        </div>
                      </div>
                    ))
                  ) : data.recentContext.length ? (
                    <div className="rounded-[22px] border border-dashed border-border/40 bg-background/35 p-4 text-sm leading-6 text-muted-foreground">
                      No matching life context is logged for this day. Recent context remains visible in the trend track above.
                    </div>
                  ) : null}
                </div>
              </>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border/40 bg-background/35 p-5 text-sm leading-6 text-muted-foreground">
                Start with two or three blocks like a steady morning, a lower afternoon, and a calmer evening. Cadence will derive the daily score and stability for you.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>Recent reflections</CardDescription>
            <CardTitle>Completed days, not isolated scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.recentEntries.length ? (
              data.recentEntries.map((entry) => (
                <button
                  type="button"
                  key={entry.id}
                  className="w-full rounded-[24px] border border-border/40 bg-background/50 p-4 text-left transition hover:bg-background/70"
                  onClick={() => openEditor(entry)}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {format(new Date(entry.dayIso), "EEEE, MMM d")}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {entry.periods.length} mood blocks · stability {entry.moodStability ?? "-"}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-[11px]">
                      {entry.score}/100
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.notes}</p>
                </button>
              ))
            ) : (
              <div className="rounded-[24px] border border-border/40 bg-background/35 p-4 text-sm text-muted-foreground">
                Once you log a few days, their emotional contour will show up here for quick comparison and editing.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <div className="flex items-center gap-3">
              <Sparkles className="size-5 text-primary" />
              <div>
                <CardDescription>Emerging signals</CardDescription>
                <CardTitle>Reflection-driven insights</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {insightHighlights.length ? (
              insightHighlights.map((insight) => (
                <div key={insight.id} className="rounded-[24px] border border-border/40 bg-background/50 p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="border-border/40 bg-transparent text-foreground">
                      {insight.lagDays === 0 ? "Same day" : `${insight.lagDays}-day lag`}
                    </Badge>
                    <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                      {insight.evidenceLabel}
                    </Badge>
                    <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                      {Math.round(insight.confidence * 100)}% confidence
                    </Badge>
                    {insightSurfacePresentation.exploratoryBadgeLabel ? (
                      <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                        {insightSurfacePresentation.exploratoryBadgeLabel}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm font-medium text-foreground">{insight.title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">{insight.summary}</p>
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">
                    {formatInsightEvidenceLine(insight)}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-border/40 bg-background/35 p-4 text-sm text-muted-foreground">
                <p>{insightSurfacePresentation.emptyDescription}</p>
                {insightSurfacePresentation.emptyRecommendation ? (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{insightSurfacePresentation.emptyRecommendation}</p>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Sheet open={isEditorOpen} onOpenChange={setIsEditorOpen}>
        <SheetContent side="center" className="border-border/40 bg-card/95">
          <div className="flex h-full min-h-0 flex-col">
            <SheetHeader>
              <SheetTitle>{editingEntry ? "Edit complete day" : "Complete the day"}</SheetTitle>
              <SheetDescription>
                Drag across the timeline to create a mood block, then add a score, notes, and context. Cadence derives the daily summary from the segments you save.
              </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-4">
              {seededDraftPeriod ? (
                <div className="rounded-[24px] border border-primary/30 bg-primary/10 px-4 py-4 text-sm leading-6 text-foreground">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                    Seeded from dashboard capture
                  </p>
                  <p className="mt-2">
                    You checked in at {editingEntry?.draftCapturedAtIso ? format(new Date(editingEntry.draftCapturedAtIso), "h:mm a") : "an earlier moment today"}, so Cadence opened a starter block from {formatMinuteLabel(seededDraftPeriod.startMinute)} to {formatMinuteLabel(seededDraftPeriod.endMinute)}.
                  </p>
                </div>
              ) : null}

              <div className="grid gap-5 xl:grid-cols-[0.72fr_1.28fr]">
                <div className="space-y-4 rounded-[28px] border border-border/40 bg-background/35 p-4">
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
                    <div className="space-y-2">
                      <Label htmlFor="reflectionDay">Day</Label>
                      <Input id="reflectionDay" type="date" value={reflectionDay} onChange={(event) => setReflectionDay(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sleepHours">Sleep hours</Label>
                      <Input id="sleepHours" inputMode="decimal" placeholder="7.5" value={sleepHours} onChange={(event) => setSleepHours(event.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="sleepQuality">Sleep quality</Label>
                      <select
                        id="sleepQuality"
                        className="flex h-11 w-full rounded-2xl border border-border/40 bg-background px-4 text-sm outline-none transition focus:border-primary/40"
                        value={sleepQuality}
                        onChange={(event) => setSleepQuality(event.target.value)}
                      >
                        <option value="">Select</option>
                        {SLEEP_QUALITY_OPTIONS.map((option) => (
                          <option key={`sleep-quality-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="workStress">Work stress</Label>
                      <select
                        id="workStress"
                        className="flex h-11 w-full rounded-2xl border border-border/40 bg-background px-4 text-sm outline-none transition focus:border-primary/40"
                        value={workStress}
                        onChange={(event) => setWorkStress(event.target.value)}
                      >
                        <option value="">Select</option>
                        {WORK_STRESS_OPTIONS.map((option) => (
                          <option key={`work-stress-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="socialQuality">Social quality</Label>
                      <select
                        id="socialQuality"
                        className="flex h-11 w-full rounded-2xl border border-border/40 bg-background px-4 text-sm outline-none transition focus:border-primary/40"
                        value={socialQuality}
                        onChange={(event) => setSocialQuality(event.target.value)}
                      >
                        <option value="">Select</option>
                        {SOCIAL_QUALITY_OPTIONS.map((option) => (
                          <option key={`social-quality-${option.value}`} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reflectionNotes">Day notes</Label>
                    <Textarea id="reflectionNotes" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="What shaped the day emotionally?" className="min-h-28" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="reflectionTags">Day tags</Label>
                    <Input id="reflectionTags" value={dayTagsInput} onChange={(event) => setDayTagsInput(event.target.value)} placeholder="sleep, focus, social" />
                    <p className="text-xs leading-5 text-muted-foreground">Comma-separated tags for the whole day.</p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[22px] border border-border/40 bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Overall</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                        {derivedSummary.score ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-border/40 bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Stability</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                        {derivedSummary.moodStability ?? "-"}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-border/40 bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Blocks</p>
                      <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{periods.length}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 rounded-[28px] border border-border/40 bg-background/35 p-4 lg:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">Timeline editor</p>
                      <p className="text-xs leading-5 text-muted-foreground">Drag across 30-minute slots to define a mood period.</p>
                    </div>
                    <div className="flex items-center gap-2 rounded-full border border-border/40 bg-card/70 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                      <GripHorizontal className="size-3.5" />
                      Drag to select
                    </div>
                  </div>

                  <div className="overflow-x-auto pb-1">
                    <div className="grid min-w-[760px] grid-cols-12 gap-3 pr-1">
                      {Array.from({ length: SLOT_COUNT }, (_, slotIndex) => {
                        const slotStart = slotIndex * SLOT_MINUTES;
                        const slotEnd = slotStart + SLOT_MINUTES;
                        const occupiedPeriod = periods.find(
                          (period) => period.startMinute < slotEnd && period.endMinute > slotStart
                        );
                        const isSelected =
                          selectedSlotRange != null &&
                          slotStart >= selectedSlotRange.startMinute &&
                          slotEnd <= selectedSlotRange.endMinute;
                        const moodColor = occupiedPeriod ? getMoodColorToken(occupiedPeriod.score) : null;

                        return (
                          <button
                            type="button"
                            key={slotStart}
                            className={cn(
                              "h-14 rounded-[18px] border border-border/40 px-2.5 py-2 text-left transition",
                              !occupiedPeriod && "bg-card/70 hover:bg-card",
                              isSelected && "border-primary/50 bg-primary/10",
                              occupiedPeriod && "text-foreground"
                            )}
                            style={
                              occupiedPeriod
                                ? {
                                    background: `linear-gradient(180deg, color-mix(in oklab, ${moodColor} 34%, transparent), color-mix(in oklab, ${moodColor} 16%, transparent))`,
                                  }
                                : undefined
                            }
                            onPointerDown={(event) => {
                              event.preventDefault();
                              setDragState({ anchor: slotIndex, current: slotIndex, active: true });
                            }}
                            onPointerEnter={() => {
                              if (!dragState?.active) {
                                return;
                              }

                              setDragState((state) => (state ? { ...state, current: slotIndex } : state));
                            }}
                            onClick={() => {
                              if (dragState?.active) {
                                return;
                              }

                              if (occupiedPeriod) {
                                setPendingSegment(
                                  createPendingSegment({
                                    id: occupiedPeriod.id,
                                    startMinute: occupiedPeriod.startMinute,
                                    endMinute: occupiedPeriod.endMinute,
                                    score: String(occupiedPeriod.score),
                                    notes: occupiedPeriod.notes ?? "",
                                    tagsInput: occupiedPeriod.tags.join(", "),
                                  })
                                );
                              }
                            }}
                          >
                            <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                              {slotStart % 120 === 0 ? formatMinuteLabel(slotStart) : ""}
                            </p>
                            {occupiedPeriod ? (
                              <p className="mt-1.5 text-base font-medium">{occupiedPeriod.score}</p>
                            ) : null}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <p className="text-xs leading-5 text-muted-foreground">
                    Mood blocks cannot overlap. Click an existing colored block to adjust it before adding a neighboring range.
                  </p>

                  <div className="space-y-3 rounded-[24px] border border-border/40 bg-card/70 p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-foreground">
                          {pendingSegment?.id ? "Edit mood block" : "Selected range"}
                        </p>
                        <p className="text-xs leading-5 text-muted-foreground">
                          {pendingSegment
                            ? `${formatMinuteLabel(pendingSegment.startMinute)} - ${formatMinuteLabel(pendingSegment.endMinute)}`
                            : "Drag on the timeline to start a new block."}
                        </p>
                      </div>
                      {!pendingSegment ? (
                        <Button variant="outline" className="rounded-full" onClick={() => setPendingSegment(createPendingSegment())}>
                          <Plus className="size-4" />
                          Add manually
                        </Button>
                      ) : null}
                    </div>

                    {pendingSegment ? (
                      <div className="space-y-4">
                        <div className="grid gap-4 sm:grid-cols-2">
                          <div className="space-y-2">
                            <Label htmlFor="segmentStart">Start</Label>
                            <select
                              id="segmentStart"
                              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                              value={pendingSegment.startMinute}
                              onChange={(event) =>
                                setPendingSegment((current) =>
                                  current
                                    ? { ...current, startMinute: Number(event.target.value) }
                                    : current
                                )
                              }
                            >
                              {TIME_SLOT_OPTIONS.slice(0, -1).map((option) => (
                                <option key={`start-${option.value}`} value={option.value} className="bg-card text-foreground">
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="segmentEnd">End</Label>
                            <select
                              id="segmentEnd"
                              className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                              value={pendingSegment.endMinute}
                              onChange={(event) =>
                                setPendingSegment((current) =>
                                  current
                                    ? { ...current, endMinute: Number(event.target.value) }
                                    : current
                                )
                              }
                            >
                              {TIME_SLOT_OPTIONS.slice(1).map((option) => (
                                <option key={`end-${option.value}`} value={option.value} className="bg-card text-foreground">
                                  {option.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="segmentScore">Mood score</Label>
                          <Input id="segmentScore" inputMode="numeric" placeholder="72" value={pendingSegment.score} onChange={(event) => setPendingSegment((current) => current ? { ...current, score: event.target.value } : current)} />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="segmentNotes">Context</Label>
                          <Textarea id="segmentNotes" value={pendingSegment.notes} onChange={(event) => setPendingSegment((current) => current ? { ...current, notes: event.target.value } : current)} placeholder="What shaped this segment?" className="min-h-24" />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="segmentTags">Tags</Label>
                          <Input id="segmentTags" value={pendingSegment.tagsInput} onChange={(event) => setPendingSegment((current) => current ? { ...current, tagsInput: event.target.value } : current)} placeholder="exercise, work, social" />
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <Button className="rounded-full" onClick={handleSaveSegment}>
                            <Save className="size-4" />
                            Save block
                          </Button>
                          <Button variant="outline" className="rounded-full" onClick={() => setPendingSegment(null)}>
                            Close
                          </Button>
                          {pendingSegment.id ? (
                            <Button variant="ghost" className="rounded-full text-destructive hover:text-destructive" onClick={handleDeleteSegment}>
                              <Trash2 className="size-4" />
                              Remove block
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>

              <Card className="rounded-[28px] border-border/40 bg-background/35">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <CalendarRange className="size-5 text-primary" />
                    <div>
                      <CardDescription>Reflection blocks</CardDescription>
                      <CardTitle className="text-xl text-foreground">Current day segments</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {periods.length ? (
                    periods.map((period) => (
                      <button
                        type="button"
                        key={period.id}
                        className="rounded-[22px] border border-border/40 bg-card/70 p-4 text-left transition hover:bg-card"
                        onClick={() =>
                          setPendingSegment(
                            createPendingSegment({
                              id: period.id,
                              startMinute: period.startMinute,
                              endMinute: period.endMinute,
                              score: String(period.score),
                              notes: period.notes ?? "",
                              tagsInput: period.tags.join(", "),
                            })
                          )
                        }
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                            {formatMinuteLabel(period.startMinute)} - {formatMinuteLabel(period.endMinute)}
                          </p>
                          <Badge variant="outline" className="border-border/40 bg-transparent">
                            {period.score}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{period.notes || "No context added yet."}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {period.tags.map((tag) => (
                            <Badge key={`${period.id}-${tag}`} variant="outline" className="border-border/40 bg-transparent">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="rounded-[22px] border border-dashed border-border/40 bg-card/70 p-4 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
                      Drag across the timeline or add a block manually to start building the day.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <SheetFooter className="border-t border-border/40 bg-background/40">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  {derivedSummary.score != null
                    ? `Derived overall mood ${derivedSummary.score}/100 from ${periods.length} block${periods.length === 1 ? "" : "s"}.`
                    : "Add at least one block to derive the day summary."}
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  <Button variant="outline" className="rounded-full" onClick={() => setIsEditorOpen(false)}>
                    Cancel
                  </Button>
                  <Button className="rounded-full" disabled={isPending || !periods.length} onClick={handleSubmitReflection}>
                    <Save className="size-4" />
                    Save day
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}