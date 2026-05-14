"use client";

import { format, startOfDay, subDays } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, useTransition } from "react";
import { BookOpenText, CalendarRange, Pencil, Plus, Save, Sparkles, Trash2 } from "lucide-react";
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
import type { LifeEventItem } from "@/features/life-events/types";
import { buildJournalInsightOverlays } from "@/features/journal/lib/insight-overlay";
import { buildJournalPromptLibrary } from "@/features/journal/lib/prompt-library";
import { buildJournalStorytelling } from "@/features/journal/lib/storytelling";
import { buildJournalThemeArchive } from "@/features/journal/lib/theme-archive";
import { PageIntro } from "@/features/shared/components/page-intro";
import type { JournalEntryItem, JournalPageData, JournalPromptTemplate } from "@/features/journal/types";
import { defaultMockScenario, type MockScenarioKey } from "@/lib/data/mock-scenarios";
import { lifeEventOverlapsDay } from "@/lib/life-events";
import { dedupeTags, getMoodColorToken } from "@/lib/mood";
import { cn } from "@/lib/utils";
import { deleteJournalEntryAction, upsertJournalEntryAction } from "@/server/journal/actions";

type JournalWorkspaceProps = {
  data: JournalPageData;
  entryMode?: "guided-demo" | null;
  entrySource?: string | null;
  scenario?: MockScenarioKey;
  readOnlyDemo?: boolean;
};

type JournalFormState = {
  id?: string;
  day: string;
  title: string;
  content: string;
  moodScore: string;
};

const RECENT_ENTRY_LIMIT = 12;
const DAYS_PER_WEEK = 7;
const WEEK_WINDOW = 4;

function getTodayDateInput() {
  const date = new Date();
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function getDayKey(date: Date) {
  return startOfDay(date).toISOString().slice(0, 10);
}

function getDayKeyFromIso(dayIso: string) {
  return getDayKey(new Date(dayIso));
}

function toDateInputValue(dayIso: string) {
  const date = new Date(dayIso);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function createJournalFormState(entry?: JournalEntryItem | null): JournalFormState {
  return {
    id: entry?.id,
    day: entry ? toDateInputValue(entry.dayIso) : getTodayDateInput(),
    title: entry?.title ?? "",
    content: entry?.content ?? "",
    moodScore: entry?.moodScore != null ? String(entry.moodScore) : "",
  };
}

function formatEntryDay(dayIso: string) {
  return format(new Date(dayIso), "EEEE, MMM d");
}

function getExcerpt(content: string) {
  return content.length > 180 ? `${content.slice(0, 177).trimEnd()}...` : content;
}

function getWordCount(content: string) {
  return content.trim().split(/\s+/).filter(Boolean).length;
}

function getKeywordTags(title: string, content: string) {
  const combined = `${title} ${content}`.toLowerCase();
  const keywordGroups = [
    { keywords: ["energy", "tired", "rested", "fatigue"], tag: "energy" },
    { keywords: ["focus", "work", "friction", "flow"], tag: "focus" },
    { keywords: ["friend", "social", "conversation", "people"], tag: "social" },
    { keywords: ["exercise", "walk", "run", "strength", "movement"], tag: "movement" },
    { keywords: ["sleep", "morning", "evening", "routine"], tag: "routine" },
    { keywords: ["stress", "overload", "heavy", "fog"], tag: "stress" },
  ];

  return keywordGroups
    .filter((group) => group.keywords.some((keyword) => combined.includes(keyword)))
    .map((group) => group.tag);
}

function isThisWeek(dayIso: string) {
  return new Date(dayIso) >= subDays(startOfDay(new Date()), DAYS_PER_WEEK - 1);
}

function averageMoodScore(entries: JournalEntryItem[]) {
  const scores = entries.map((entry) => entry.moodScore).filter((score): score is number => score != null);

  if (!scores.length) {
    return null;
  }

  return Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length);
}

function getWritingStreak(entries: JournalEntryItem[]) {
  const today = startOfDay(new Date());
  const dayKeys = new Set(entries.map((entry) => getDayKeyFromIso(entry.dayIso)));
  let streak = 0;

  while (dayKeys.has(getDayKey(subDays(today, streak)))) {
    streak += 1;
  }

  return streak;
}

function buildWeeklyVolume(entries: JournalEntryItem[]) {
  const today = startOfDay(new Date());

  return Array.from({ length: WEEK_WINDOW }, (_, index) => {
    const windowEnd = subDays(today, (WEEK_WINDOW - index - 1) * DAYS_PER_WEEK);
    const windowStart = subDays(windowEnd, DAYS_PER_WEEK - 1);
    const windowEntries = entries.filter((entry) => {
      const day = new Date(entry.dayIso);
      return day >= windowStart && day <= windowEnd;
    });

    return {
      label: format(windowStart, "MMM d"),
      entryCount: windowEntries.length,
      averageMoodScore: averageMoodScore(windowEntries),
    };
  });
}

function sortEntries(entries: JournalEntryItem[]) {
  return [...entries].sort((left, right) => new Date(right.dayIso).getTime() - new Date(left.dayIso).getTime());
}

function buildOptimisticPageData(
  data: JournalPageData,
  entries: JournalEntryItem[],
  totalEntries: number,
  entriesThisWeek: number
): JournalPageData {
  const sortedEntries = sortEntries(entries);
  const recentEntries = sortedEntries.slice(0, RECENT_ENTRY_LIMIT);
  const summary = {
    totalEntries: Math.max(0, totalEntries),
    entriesThisWeek: Math.max(0, entriesThisWeek),
    writingStreak: getWritingStreak(sortedEntries),
    averageMoodScore: averageMoodScore(recentEntries),
  };
  const storytelling = buildJournalStorytelling(recentEntries);
  const themeArchive = buildJournalThemeArchive(recentEntries, storytelling.storyWindows);
  const weeklyReviewSnapshot = data.insightOverlays[0]
    ? {
        title: data.insightOverlays[0].weeklyReview.title,
        summary: data.insightOverlays[0].weeklyReview.summary,
        averageMoodScore: data.insightOverlays[0].weeklyReview.averageMoodScore,
      }
    : {
        title: "No weekly synthesis yet",
        summary: "The weekly review will strengthen as more mood signal accumulates.",
        averageMoodScore: null,
      };
  const moodArchiveSnapshots = data.insightOverlays.reduce<Array<{ weekLabel: string; title: string; summary: string; averageMoodScore: number | null }>>((snapshots, overlay) => {
    if (!overlay.moodArchive.weekLabel || snapshots.some((snapshot) => snapshot.weekLabel === overlay.moodArchive.weekLabel)) {
      return snapshots;
    }

    return [
      ...snapshots,
      {
        weekLabel: overlay.moodArchive.weekLabel,
        title: overlay.moodArchive.title,
        summary: overlay.moodArchive.summary,
        averageMoodScore: overlay.moodArchive.averageMoodScore,
      },
    ];
  }, []);

  return {
    ...data,
    summary,
    latestEntry: recentEntries[0] ?? null,
    recentEntries,
    weeklyVolume: buildWeeklyVolume(sortedEntries),
    storyline: storytelling.storyline,
    storyWindows: storytelling.storyWindows,
    themeArchive,
    insightOverlays: buildJournalInsightOverlays({
      storyWindows: storytelling.storyWindows,
      weeklyReview: weeklyReviewSnapshot,
      moodArchive: moodArchiveSnapshots,
    }),
    promptLibrary: buildJournalPromptLibrary({
      latestEntry: recentEntries[0] ?? null,
      recentEntries,
      summary,
      availableLifeEvents: data.availableLifeEvents,
    }),
  };
}

function buildOptimisticEntry(formState: JournalFormState, previousEntry?: JournalEntryItem | null): JournalEntryItem {
  const content = formState.content.trim();
  const title = formState.title.trim() || null;
  const moodScore = formState.moodScore ? Number(formState.moodScore) : null;
  const dayIso = new Date(`${formState.day}T12:00:00`).toISOString();
  const derivedTags = dedupeTags([
    ...(previousEntry?.context.derivedTags ?? []),
    ...getKeywordTags(title ?? "", content),
  ]).slice(0, 6);

  return {
    id: formState.id ?? `optimistic-journal-${Date.now()}`,
    dayIso,
    title,
    content,
    moodScore,
    excerpt: getExcerpt(content),
    wordCount: getWordCount(content),
    context: {
      derivedTags,
      moodScore: previousEntry?.context.moodScore ?? moodScore,
      moodStability: previousEntry?.context.moodStability ?? null,
      dominantTags: previousEntry?.context.dominantTags ?? [],
      periodHighlights: previousEntry?.context.periodHighlights ?? [],
      activities: previousEntry?.context.activities ?? [],
      lifeEvents: previousEntry?.context.lifeEvents ?? [],
      correlationSummary:
        previousEntry?.context.correlationSummary ??
        (moodScore != null
          ? `Saved with a ${moodScore}/100 mood tag. Same-day mood and activity signals will refresh automatically.`
          : "Narrative saved. Same-day mood and activity signals will refresh automatically."),
    },
  };
}

function applyOptimisticUpsert(data: JournalPageData, entry: JournalEntryItem, previousEntry?: JournalEntryItem | null) {
  const nextEntries = sortEntries([
    entry,
    ...data.recentEntries.filter((currentEntry) => currentEntry.id !== entry.id),
  ]).slice(0, RECENT_ENTRY_LIMIT);
  const previousDayCount = previousEntry ? Number(isThisWeek(previousEntry.dayIso)) : 0;
  const nextDayCount = Number(isThisWeek(entry.dayIso));
  const totalEntries = data.summary.totalEntries + (previousEntry ? 0 : 1);
  const entriesThisWeek = data.summary.entriesThisWeek + nextDayCount - previousDayCount;

  return buildOptimisticPageData(data, nextEntries, totalEntries, entriesThisWeek);
}

function applyOptimisticDelete(data: JournalPageData, entry: JournalEntryItem) {
  return buildOptimisticPageData(
    data,
    data.recentEntries.filter((currentEntry) => currentEntry.id !== entry.id),
    data.summary.totalEntries - 1,
    data.summary.entriesThisWeek - Number(isThisWeek(entry.dayIso))
  );
}

function withPromptTemplate(baseState: JournalFormState, prompt: JournalPromptTemplate) {
  return {
    ...baseState,
    title: baseState.title || prompt.label,
    content: baseState.content.trim() ? baseState.content : `${prompt.prompt}\n\n`,
  };
}

function getMoodBadgeStyle(score: number | null) {
  if (score == null) {
    return undefined;
  }

  const moodColor = getMoodColorToken(score);

  return {
    borderColor: `color-mix(in oklab, ${moodColor} 24%, transparent)`,
    background: `color-mix(in oklab, ${moodColor} 15%, transparent)`,
  };
}

function getActivityStatusClassName(status: "SCHEDULED" | "COMPLETED" | "SKIPPED") {
  if (status === "COMPLETED") {
    return "border-[color:color-mix(in_oklab,var(--mood-4)_28%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-4)_14%,transparent)] text-foreground";
  }

  if (status === "SKIPPED") {
    return "border-border/40 bg-background/45 text-muted-foreground";
  }

  return "border-[color:color-mix(in_oklab,var(--mood-3)_28%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-3)_14%,transparent)] text-foreground";
}

function getSentimentTone(sentiment: LifeEventItem["sentiment"]) {
  if (sentiment === "POSITIVE") {
    return "border-[color:color-mix(in_oklab,var(--mood-4)_32%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-4)_14%,transparent)] text-foreground";
  }

  if (sentiment === "NEGATIVE") {
    return "border-[color:color-mix(in_oklab,var(--mood-2)_32%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-2)_14%,transparent)] text-foreground";
  }

  return "border-border/40 bg-background/45 text-muted-foreground";
}

function getDraftLifeEvents(dayValue: string, lifeEvents: LifeEventItem[]) {
  if (!dayValue) {
    return [];
  }

  const day = new Date(`${dayValue}T12:00:00`);

  if (Number.isNaN(day.getTime())) {
    return [];
  }

  return lifeEvents
    .filter((lifeEvent) =>
      lifeEventOverlapsDay(
        {
          startAt: new Date(lifeEvent.startAtIso),
          endAt: lifeEvent.endAtIso ? new Date(lifeEvent.endAtIso) : null,
          isOngoing: lifeEvent.isOngoing,
        },
        day
      )
    )
    .sort((left, right) => right.severityScore - left.severityScore);
}

type JournalSignalsProps = {
  entry: JournalEntryItem;
  compact?: boolean;
};

function JournalSignals({ entry, compact = false }: JournalSignalsProps) {
  const hasSignals =
    entry.context.correlationSummary ||
    entry.context.derivedTags.length ||
    entry.context.periodHighlights.length ||
    entry.context.activities.length ||
    entry.context.moodScore != null;

  if (!hasSignals) {
    return null;
  }

  return (
    <div className={cn("rounded-[24px] border border-border/40 bg-background/30", compact ? "mt-4 p-4" : "p-5")}>
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
        <CalendarRange className="size-3.5" />
        Same-day signals
      </div>

      {entry.context.correlationSummary ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{entry.context.correlationSummary}</p>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2">
        {entry.context.moodScore != null ? (
          <Badge
            variant="outline"
            className="border-border/40 bg-transparent"
            style={getMoodBadgeStyle(entry.context.moodScore)}
          >
            {entry.context.moodScore}/100 day mood
          </Badge>
        ) : null}
        {entry.context.moodStability != null ? (
          <Badge variant="outline" className="border-border/40 bg-transparent">
            {entry.context.moodStability}/100 stability
          </Badge>
        ) : null}
        {entry.context.derivedTags.map((tag) => (
          <Badge key={`${entry.id}-${tag}`} variant="outline" className="border-border/40 bg-transparent capitalize">
            {tag}
          </Badge>
        ))}
        {entry.context.lifeEvents.length ? (
          <Badge variant="outline" className="border-border/40 bg-transparent">
            {entry.context.lifeEvents.length} life context marker{entry.context.lifeEvents.length === 1 ? "" : "s"}
          </Badge>
        ) : null}
      </div>

      {compact ? (
        <div className="mt-3 flex flex-wrap gap-2 text-xs uppercase tracking-[0.18em] text-muted-foreground">
          {entry.context.periodHighlights.length ? <span>{entry.context.periodHighlights.length} mood moments</span> : null}
          {entry.context.activities.length ? <span>{entry.context.activities.length} activity signals</span> : null}
          {entry.context.lifeEvents.length ? <span>{entry.context.lifeEvents.length} context markers</span> : null}
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-[0.9fr_1.1fr]">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Mood timeline</p>
            {entry.context.periodHighlights.length ? (
              entry.context.periodHighlights.map((period) => (
                <div key={period.id} className="rounded-[20px] border border-border/40 bg-background/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm font-medium text-foreground">{period.timeLabel}</p>
                    <Badge
                      variant="outline"
                      className="border-border/40 bg-transparent"
                      style={getMoodBadgeStyle(period.score)}
                    >
                      {period.score}/100
                    </Badge>
                  </div>
                  {period.notes ? (
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{period.notes}</p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-border/40 bg-background/40 p-4 text-sm leading-6 text-muted-foreground">
                No detailed mood periods were logged for this day.
              </div>
            )}
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Related activities</p>
            {entry.context.activities.length ? (
              entry.context.activities.map((activity) => (
                <div key={activity.id} className="rounded-[20px] border border-border/40 bg-background/40 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{activity.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {activity.categoryLabel} · {activity.timeLabel}
                      </p>
                    </div>
                    <Badge variant="outline" className={cn("capitalize", getActivityStatusClassName(activity.status))}>
                      {activity.status.toLowerCase()}
                    </Badge>
                  </div>
                  {activity.completionMoodScore != null ? (
                    <p className="mt-3 text-sm text-muted-foreground">
                      Completion mood: {activity.completionMoodScore}/100
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-[20px] border border-dashed border-border/40 bg-background/40 p-4 text-sm leading-6 text-muted-foreground">
                No planner activity was attached to this day.
              </div>
            )}
          </div>

          <div className="space-y-3 lg:col-span-2">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Life context</p>
            {entry.context.lifeEvents.length ? (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {entry.context.lifeEvents.map((lifeEvent) => (
                  <div key={lifeEvent.id} className="rounded-[20px] border border-border/40 bg-background/40 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{lifeEvent.title}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                          {lifeEvent.windowLabel}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-border/40 bg-transparent text-muted-foreground">
                        {lifeEvent.sentimentLabel}
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Badge variant="outline" className="border-border/40 bg-transparent">
                        {lifeEvent.categoryLabel}
                      </Badge>
                      <Badge variant="outline" className="border-border/40 bg-transparent">
                        {lifeEvent.severityLabel}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-[20px] border border-dashed border-border/40 bg-background/40 p-4 text-sm leading-6 text-muted-foreground">
                No external life context was logged for this day.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function JournalWorkspace({
  data,
  entryMode = null,
  entrySource = null,
  scenario = defaultMockScenario,
  readOnlyDemo = false,
}: JournalWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const editorReturnFocusRef = useRef<HTMLElement | null>(null);
  const [activeStoryWindowId, setActiveStoryWindowId] = useState<string | null>(null);
  const [activeThemeTag, setActiveThemeTag] = useState<string | null>(null);
  const [formState, setFormState] = useState<JournalFormState>(() => createJournalFormState());
  const [optimisticData, setOptimisticData] = useState<JournalPageData | null>(null);
  const surfaceData = optimisticData ?? data;
  const latestEntry = surfaceData.latestEntry;
  const storyline = surfaceData.storyline;
  const guidedPrompt = entryMode === "guided-demo" && entrySource === "planner"
    ? surfaceData.promptLibrary[0] ?? null
    : null;
  const defaultGuidedStoryWindow = entryMode === "guided-demo" && entrySource === "planner"
    ? surfaceData.storyWindows[0] ?? null
    : null;
  const activeStoryWindow = useMemo(
    () => surfaceData.storyWindows.find((window) => window.id === activeStoryWindowId) ?? defaultGuidedStoryWindow,
    [activeStoryWindowId, defaultGuidedStoryWindow, surfaceData.storyWindows]
  );
  const activeTheme = useMemo(
    () => surfaceData.themeArchive.find((theme) => theme.tag === activeThemeTag) ?? null,
    [activeThemeTag, surfaceData.themeArchive]
  );
  const filteredEntries = useMemo(
    () => surfaceData.recentEntries.filter((entry) => {
      if (activeStoryWindow && !activeStoryWindow.entryIds.includes(entry.id)) {
        return false;
      }

      if (activeTheme && !entry.context.derivedTags.includes(activeTheme.tag)) {
        return false;
      }

      return true;
    }),
    [activeStoryWindow, activeTheme, surfaceData.recentEntries]
  );
  const selectedInsightOverlay = useMemo(
    () => activeStoryWindow
      ? surfaceData.insightOverlays.find((overlay) => overlay.storyWindowId === activeStoryWindow.id) ?? null
      : surfaceData.insightOverlays[0] ?? null,
    [activeStoryWindow, surfaceData.insightOverlays]
  );
  const selectedOverlayWindow = activeStoryWindow ?? surfaceData.storyWindows[0] ?? null;
  const overlayDashboardParams = selectedOverlayWindow
    ? new URLSearchParams({
        focus: "weekly-review",
        source: "journal",
        windowStart: selectedOverlayWindow.windowStartIso,
        windowEnd: selectedOverlayWindow.windowEndIso,
      })
    : null;

  if (overlayDashboardParams && scenario !== defaultMockScenario) {
    overlayDashboardParams.set("scenario", scenario);
  }

  const overlayDashboardHref = overlayDashboardParams ? `/dashboard?${overlayDashboardParams.toString()}` : null;
  const overlayMoodParams = selectedOverlayWindow
    ? new URLSearchParams({
        source: "journal",
        windowStart: selectedOverlayWindow.windowStartIso,
        windowEnd: selectedOverlayWindow.windowEndIso,
      })
    : null;

  if (overlayMoodParams && scenario !== defaultMockScenario) {
    overlayMoodParams.set("scenario", scenario);
  }

  const overlayMoodHref = overlayMoodParams ? `/mood?${overlayMoodParams.toString()}` : null;

  const latestMoodLabel = useMemo(() => {
    if (surfaceData.summary.averageMoodScore == null) {
      return "No mood-tagged entries yet";
    }

    return `${surfaceData.summary.averageMoodScore}/100 average mood tag`;
  }, [surfaceData.summary.averageMoodScore]);

  const editorDerivedTags = useMemo(
    () => dedupeTags(getKeywordTags(formState.title, formState.content)).slice(0, 5),
    [formState.content, formState.title]
  );
  const editorLifeEvents = useMemo(
    () => getDraftLifeEvents(formState.day, surfaceData.availableLifeEvents),
    [formState.day, surfaceData.availableLifeEvents]
  );

  function captureEditorReturnFocusTarget() {
    if (typeof document === "undefined") {
      editorReturnFocusRef.current = null;
      return;
    }

    const activeElement = document.activeElement;
    editorReturnFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
  }

  function openCreateEditor(prompt?: JournalPromptTemplate) {
    if (readOnlyDemo) {
      return;
    }
    captureEditorReturnFocusTarget();
    const baseState = createJournalFormState();
    setFormState(prompt ? withPromptTemplate(baseState, prompt) : baseState);
    setIsEditorOpen(true);
  }

  function openEditEditor(entry: JournalEntryItem) {
    if (readOnlyDemo) {
      return;
    }
    captureEditorReturnFocusTarget();
    setFormState(createJournalFormState(entry));
    setIsEditorOpen(true);
  }

  function closeEditor(open: boolean) {
    setIsEditorOpen(open);

    if (!open) {
      const returnFocusTarget = editorReturnFocusRef.current;

      editorReturnFocusRef.current = null;
      setFormState(createJournalFormState());

      if (returnFocusTarget) {
        window.requestAnimationFrame(() => {
          returnFocusTarget.focus();
        });
      }
    }
  }

  function handleSubmitEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const submittedState = { ...formState };
    const previousEntry = submittedState.id
      ? surfaceData.recentEntries.find((entry) => entry.id === submittedState.id) ?? null
      : null;
    const optimisticEntry = buildOptimisticEntry(submittedState, previousEntry);
    setOptimisticData(applyOptimisticUpsert(surfaceData, optimisticEntry, previousEntry));
    closeEditor(false);

    startTransition(async () => {
      try {
        await upsertJournalEntryAction({
          id: submittedState.id,
          day: new Date(`${submittedState.day}T12:00:00`),
          title: submittedState.title,
          content: submittedState.content,
          moodScore: submittedState.moodScore ? Number(submittedState.moodScore) : undefined,
        });

        setOptimisticData(null);
        toast.success(submittedState.id ? "Journal entry updated." : "Journal entry saved.");
        router.refresh();
      } catch (error) {
        setOptimisticData(null);
        setFormState(submittedState);
        setIsEditorOpen(true);
        toast.error(error instanceof Error ? error.message : "Unable to save journal entry.");
      }
    });
  }

  function handleDeleteEntry(entry: JournalEntryItem) {
    setOptimisticData(applyOptimisticDelete(surfaceData, entry));

    startTransition(async () => {
      try {
        await deleteJournalEntryAction({ id: entry.id });
        setOptimisticData(null);
        toast.success("Journal entry deleted.");
        router.refresh();
      } catch (error) {
        setOptimisticData(null);
        toast.error(error instanceof Error ? error.message : "Unable to delete journal entry.");
      }
    });
  }

  function applyPromptTemplate(prompt: JournalPromptTemplate) {
    setFormState((current) => withPromptTemplate(current, prompt));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <PageIntro
          eyebrow="Journal"
          title="Capture the texture behind the numbers."
          description="Use the journal to record narrative context, tag entries with mood when it helps, and keep enough detail that patterns can surface without flattening the day into a single score."
        />
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="rounded-full border-border/40 px-2 sm:px-3 py-1 text-[9px] sm:text-[11px] uppercase tracking-[0.22em]">
            {surfaceData.dataSource === "mock" ? "Mock preview" : "Database connected"}
          </Badge>
          {readOnlyDemo ? (
            <p className="text-sm text-muted-foreground">Shared demo is preview-only. Journal writing is disabled.</p>
          ) : null}
          <Button type="button" className="rounded-full" onClick={() => openCreateEditor()} disabled={readOnlyDemo}>
            <Plus className="size-4" />
            New entry
          </Button>
        </div>
      </div>

      {entryMode === "guided-demo" ? (
        <Card className="glass-card rounded-[32px] border-primary/20 bg-primary/[0.04]">
          <CardContent className="grid gap-5 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Guided demo path · Step 3 of 4</p>
              <p className="mt-3 text-xl font-semibold tracking-tight text-foreground">Capture the narrative context behind the experiment.</p>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">
                {entrySource === "planner"
                  ? "You arrived from Planner after the weekly review handoff. Use Journal to record why the experiment felt supportive, noisy, or harder than the metrics alone suggest before comparing that story in Insights."
                  : "Use Journal to add narrative texture after the weekly review and planner steps have set the analytical frame."}
              </p>
            </div>
            <div className="grid gap-3">
              {guidedPrompt ? (
                <div className="rounded-[24px] border border-border/40 bg-background/65 p-4 text-sm leading-6 text-muted-foreground">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Recommended next prompt</p>
                  <p className="mt-2 text-base font-medium text-foreground">{guidedPrompt.label}</p>
                  <p className="mt-2">{guidedPrompt.description}</p>
                  <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{guidedPrompt.whyNow}</p>
                </div>
              ) : null}
              {[
                "1. Keep the planner experiment in mind while writing.",
                "2. Capture the emotional texture or context the dashboard cannot fully express.",
                "3. Use the weekly comparison card below to connect narrative and review language.",
              ].map((item) => (
                <div key={item} className="rounded-[24px] border border-border/40 bg-background/65 px-4 py-3 text-sm leading-6 text-muted-foreground">
                  {item}
                </div>
              ))}
              <div className="flex flex-wrap gap-3 pt-1">
                {guidedPrompt ? (
                  <Button type="button" className="rounded-full" onClick={() => openCreateEditor(guidedPrompt)} disabled={readOnlyDemo}>
                    Open guided reflection
                  </Button>
                ) : null}
                <Link
                  href={`/insights?${new URLSearchParams({
                    entry: "guided-demo",
                    source: "journal",
                    ...(scenario !== defaultMockScenario ? { scenario } : {}),
                  }).toString()}`}
                  className={buttonVariants({
                    variant: "outline",
                    className: "rounded-full border-border/40 bg-transparent",
                  })}
                >
                  Continue into Insights
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
                <Link
                  href={`/planner?${new URLSearchParams({
                    entry: "guided-demo",
                    ...(scenario !== defaultMockScenario ? { scenario } : {}),
                  }).toString()}`}
                  className={buttonVariants({
                    variant: "outline",
                    className: "rounded-full border-border/40 bg-transparent",
                  })}
                >
                  Return to Planner
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[28px] border-border/40 bg-card/70">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Total entries</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {surfaceData.summary.totalEntries}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-border/40 bg-card/70">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Entries this week</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {surfaceData.summary.entriesThisWeek}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-border/40 bg-card/70">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Writing streak</p>
            <p className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
              {surfaceData.summary.writingStreak}
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-border/40 bg-card/70">
          <CardContent className="p-5">
            <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Mood-tag trend</p>
            <p className="mt-3 text-lg font-semibold tracking-tight text-foreground">
              {latestMoodLabel}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-border/40 bg-card/70">
        <CardHeader>
          <div className="flex items-center gap-3">
            <Sparkles className="size-5 text-primary" />
            <div>
              <CardDescription>Start from a prompt</CardDescription>
              <CardTitle className="text-2xl text-foreground">Structure without rigidity</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 lg:grid-cols-3">
          {surfaceData.promptLibrary.map((prompt) => (
            <button
              key={prompt.id}
              type="button"
              className={cn(
                "rounded-[24px] border border-border/40 bg-background/35 p-5 text-left transition hover:border-border/70 hover:bg-background/50",
                guidedPrompt?.id === prompt.id && "border-primary/35 bg-primary/[0.06]"
              )}
              disabled={readOnlyDemo}
              onClick={() => openCreateEditor(prompt)}
            >
              {guidedPrompt?.id === prompt.id ? (
                <p className="text-[11px] uppercase tracking-[0.22em] text-primary">Recommended from Planner</p>
              ) : null}
              <p className="text-base font-semibold tracking-tight text-foreground">{prompt.label}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{prompt.description}</p>
              <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">{prompt.whyNow}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>Storyline so far</CardDescription>
            <CardTitle className="text-2xl text-foreground">
              {storyline?.title ?? latestEntry?.title ?? "No entry written yet"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {storyline ? (
              <div className="space-y-5">
                <p className="text-sm leading-7 text-muted-foreground">{storyline.summary}</p>
                {storyline.signalAnchors.length ? (
                  <div className="flex flex-wrap gap-2">
                    {storyline.signalAnchors.map((anchor) => (
                      <Badge key={anchor} variant="outline" className="border-border/40 bg-transparent">
                        {anchor}
                      </Badge>
                    ))}
                  </div>
                ) : null}
                {latestEntry ? (
                  <div className="rounded-[24px] border border-border/40 bg-background/35 p-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <Badge variant="outline" className="border-border/40 bg-transparent">
                        Latest anchor
                      </Badge>
                      <Badge variant="outline" className="border-border/40 bg-transparent">
                        {formatEntryDay(latestEntry.dayIso)}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="border-border/40 bg-transparent"
                        style={getMoodBadgeStyle(latestEntry.moodScore)}
                      >
                        {latestEntry.moodScore != null
                          ? `${latestEntry.moodScore}/100 mood tag`
                          : "No mood tag"}
                      </Badge>
                    </div>
                    <p className="mt-4 text-base font-medium text-foreground">
                      {latestEntry.title ?? "Untitled reflection"}
                    </p>
                    <p className="mt-3 text-sm leading-6 text-muted-foreground">{latestEntry.excerpt}</p>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-3">
                  {latestEntry ? (
                    <Badge variant="outline" className="border-border/40 bg-transparent">
                      {latestEntry.wordCount} words in the latest entry
                    </Badge>
                  ) : null}
                </div>
                {latestEntry ? <JournalSignals entry={latestEntry} compact /> : null}
                {latestEntry ? (
                  <div className="flex flex-wrap gap-3">
                    <Button type="button" className="rounded-full" onClick={() => openEditEditor(latestEntry)} disabled={readOnlyDemo}>
                      <Pencil className="size-4" />
                      Edit latest entry
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-full text-muted-foreground"
                      disabled={isPending || readOnlyDemo}
                      onClick={() => handleDeleteEntry(latestEntry)}
                    >
                      <Trash2 className="size-4" />
                      Delete
                    </Button>
                  </div>
                ) : null}
              </div>
            ) : latestEntry ? (
              <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-3">
                  <Badge variant="outline" className="border-border/40 bg-transparent">
                    {formatEntryDay(latestEntry.dayIso)}
                  </Badge>
                  <Badge
                    variant="outline"
                    className="border-border/40 bg-transparent"
                    style={getMoodBadgeStyle(latestEntry.moodScore)}
                  >
                    {latestEntry.moodScore != null
                      ? `${latestEntry.moodScore}/100 mood tag`
                      : "No mood tag"}
                  </Badge>
                  <Badge variant="outline" className="border-border/40 bg-transparent">
                    {latestEntry.wordCount} words
                  </Badge>
                </div>
                <div className="rounded-[24px] border border-border/40 bg-background/35 p-5 text-sm leading-7 text-muted-foreground">
                  {latestEntry.content}
                </div>
                <JournalSignals entry={latestEntry} />
                <div className="flex flex-wrap gap-3">
                  <Button type="button" className="rounded-full" onClick={() => openEditEditor(latestEntry)} disabled={readOnlyDemo}>
                    <Pencil className="size-4" />
                    Edit entry
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full text-muted-foreground"
                    disabled={isPending || readOnlyDemo}
                    onClick={() => handleDeleteEntry(latestEntry)}
                  >
                    <Trash2 className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border/40 bg-background/35 p-5 text-sm leading-6 text-muted-foreground">
                Start with a short reflection about what shaped the day. Mood tagging is optional, but helpful when you want the journal to connect back to your emotional trend lines.
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>Writing cadence</CardDescription>
            <CardTitle className="text-2xl text-foreground">Last four weeks</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {surfaceData.weeklyVolume.map((week) => (
              <div key={week.label} className="rounded-[24px] border border-border/40 bg-background/35 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-foreground">Week of {week.label}</p>
                  <Badge variant="outline" className="border-border/40 bg-transparent">
                    {week.entryCount} entr{week.entryCount === 1 ? "y" : "ies"}
                  </Badge>
                </div>
                <div className="mt-4 h-2 rounded-full bg-background/60">
                  <div
                    className="h-2 rounded-full bg-primary"
                    style={{ width: `${Math.min(100, week.entryCount * 25)}%` }}
                  />
                </div>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">
                  {week.averageMoodScore != null
                    ? `Average mood tag ${week.averageMoodScore}/100 across entries in this window.`
                    : "No mood tags in this window yet."}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-[32px] border-border/40 bg-card/70">
        <CardHeader>
          <div className="flex items-center gap-3">
            <CalendarRange className="size-5 text-primary" />
            <div>
              <CardDescription>Story windows</CardDescription>
              <CardTitle className="text-2xl text-foreground">Read the same stretch across surfaces</CardTitle>
            </div>
          </div>
          <p className="text-sm leading-6 text-muted-foreground">
            Select a story window to focus the matching entries below and see how that stretch compares with the broader weekly read.
          </p>
        </CardHeader>
        <CardContent>
          {surfaceData.storyWindows.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {surfaceData.storyWindows.map((window) => (
                <button
                  key={window.id}
                  type="button"
                  className={cn(
                    "rounded-[28px] border border-border/40 bg-background/35 p-5 text-left transition hover:border-border/70 hover:bg-background/45",
                    activeStoryWindow?.id === window.id && "border-primary/40 bg-primary/5"
                  )}
                  onClick={() => setActiveStoryWindowId((current) => current === window.id ? null : window.id)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold tracking-tight text-foreground">{window.title}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {window.dateRangeLabel}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-border/40 bg-transparent">
                      {window.entryCount} entr{window.entryCount === 1 ? "y" : "ies"}
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{window.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {window.averageMoodScore != null ? (
                      <Badge
                        variant="outline"
                        className="border-border/40 bg-transparent"
                        style={getMoodBadgeStyle(window.averageMoodScore)}
                      >
                        {window.averageMoodScore}/100 average mood tag
                      </Badge>
                    ) : null}
                    {window.signalAnchors.map((anchor) => (
                      <Badge key={`${window.id}-${anchor}`} variant="outline" className="border-border/40 bg-transparent">
                        {anchor}
                      </Badge>
                    ))}
                  </div>
                  {window.moodMomentLabel ? (
                    <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      Mood window: {window.moodMomentLabel}
                    </p>
                  ) : null}
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {activeStoryWindow?.id === window.id ? "Showing matching entries below" : "Focus matching entries below"}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border/40 bg-background/35 p-5 text-sm leading-6 text-muted-foreground">
              Story windows appear once there are enough journal entries to read narrative, mood timing, and life context together across a shared stretch of days.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border-border/40 bg-card/70">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardDescription>Theme archive</CardDescription>
            <CardTitle className="text-2xl text-foreground">Repeated themes across story windows</CardTitle>
          </div>
          {activeTheme ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-border/40 bg-transparent"
              onClick={() => setActiveThemeTag(null)}
            >
              Clear theme focus
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {surfaceData.themeArchive.length ? (
            <div className="grid gap-4 xl:grid-cols-3">
              {surfaceData.themeArchive.map((theme) => (
                <button
                  key={theme.tag}
                  type="button"
                  className={cn(
                    "rounded-[28px] border border-border/40 bg-background/35 p-5 text-left transition hover:border-border/70 hover:bg-background/45",
                    activeTheme?.tag === theme.tag && "border-primary/40 bg-primary/5"
                  )}
                  onClick={() => setActiveThemeTag((current) => current === theme.tag ? null : theme.tag)}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold tracking-tight text-foreground">{theme.label}</p>
                      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        Last seen {theme.latestEntryDayLabel}
                      </p>
                    </div>
                    <Badge variant="outline" className="border-border/40 bg-transparent">
                      {theme.entryCount} entr{theme.entryCount === 1 ? "y" : "ies"}
                    </Badge>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {theme.averageMoodScore != null ? (
                      <Badge variant="outline" className="border-border/40 bg-transparent" style={getMoodBadgeStyle(theme.averageMoodScore)}>
                        {theme.averageMoodScore}/100 average mood tag
                      </Badge>
                    ) : null}
                    {Array.from(new Set(theme.relatedWindowLabels)).map((windowLabel) => (
                      <Badge key={`${theme.tag}-${windowLabel}`} variant="outline" className="border-border/40 bg-transparent">
                        {windowLabel}
                      </Badge>
                    ))}
                  </div>
                  <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                    {activeTheme?.tag === theme.tag ? "Showing matching entries below" : "Review this theme across windows"}
                  </p>
                </button>
              ))}
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border/40 bg-background/35 p-5 text-sm leading-6 text-muted-foreground">
              Repeated journal themes appear once tags recur across at least two recent entries.
            </div>
          )}
        </CardContent>
      </Card>

      {activeTheme ? (
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>Theme drilldown</CardDescription>
            <CardTitle className="text-2xl text-foreground">
              {activeTheme.label} across {activeTheme.dateRangeLabel}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-[24px] border border-border/40 bg-background/35 p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Mood trajectory</p>
                <p className="mt-3 text-sm leading-6 text-foreground">{activeTheme.moodTrajectorySummary}</p>
              </div>
              <div className="rounded-[24px] border border-border/40 bg-background/35 p-5">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Life context</p>
                <p className="mt-3 text-sm leading-6 text-foreground">{activeTheme.contextSummary}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="border-border/40 bg-transparent">
                {activeTheme.entryCount} entr{activeTheme.entryCount === 1 ? "y" : "ies"}
              </Badge>
              {activeTheme.averageMoodScore != null ? (
                <Badge variant="outline" className="border-border/40 bg-transparent" style={getMoodBadgeStyle(activeTheme.averageMoodScore)}>
                  {activeTheme.averageMoodScore}/100 average mood tag
                </Badge>
              ) : null}
              {Array.from(new Set(activeTheme.relatedWindowLabels)).map((windowLabel) => (
                <Badge key={`${activeTheme.tag}-${windowLabel}`} variant="outline" className="border-border/40 bg-transparent">
                  {windowLabel}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card className="rounded-[32px] border-border/40 bg-card/70">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardDescription>Journal insight overlay</CardDescription>
            <CardTitle className="text-2xl text-foreground">
              {selectedInsightOverlay?.title ?? "Weekly comparison appears once story windows exist"}
            </CardTitle>
          </div>
          {activeStoryWindow ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-border/40 bg-transparent"
              onClick={() => setActiveStoryWindowId(null)}
            >
              Clear window focus
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {selectedInsightOverlay ? (
            <div className="space-y-5">
              <p className="text-sm leading-6 text-muted-foreground">{selectedInsightOverlay.summary}</p>
              <div className="flex flex-wrap gap-3">
                {overlayDashboardHref ? (
                  <Link
                    href={overlayDashboardHref}
                    className={buttonVariants({
                      variant: "outline",
                      className: "rounded-full border-border/40 bg-transparent",
                    })}
                  >
                    Open dashboard weekly review
                  </Link>
                ) : null}
                {overlayMoodHref ? (
                  <Link
                    href={overlayMoodHref}
                    className={buttonVariants({
                      variant: "outline",
                      className: "rounded-full border-border/40 bg-transparent",
                    })}
                  >
                    Open mood context
                  </Link>
                ) : null}
              </div>
              <div className="grid gap-4 lg:grid-cols-2">
                <div className="rounded-[24px] border border-border/40 bg-background/35 p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Dashboard weekly review</p>
                  <p className="mt-3 text-base font-medium text-foreground">{selectedInsightOverlay.weeklyReview.title}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedInsightOverlay.weeklyReview.summary}</p>
                  <p className="mt-4 text-sm leading-6 text-foreground">{selectedInsightOverlay.weeklyReview.comparison}</p>
                </div>
                <div className="rounded-[24px] border border-border/40 bg-background/35 p-5">
                  <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">Mood archive</p>
                  <p className="mt-3 text-base font-medium text-foreground">
                    {selectedInsightOverlay.moodArchive.weekLabel
                      ? `${selectedInsightOverlay.moodArchive.weekLabel} · ${selectedInsightOverlay.moodArchive.title}`
                      : selectedInsightOverlay.moodArchive.title}
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{selectedInsightOverlay.moodArchive.summary}</p>
                  <p className="mt-4 text-sm leading-6 text-foreground">{selectedInsightOverlay.moodArchive.comparison}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border/40 bg-background/35 p-5 text-sm leading-6 text-muted-foreground">
              Once story windows exist, Cadence will compare the selected narrative stretch against the broader weekly review and the prior mood archive.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-[32px] border-border/40 bg-card/70">
        <CardHeader className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex items-center gap-3">
            <BookOpenText className="size-5 text-primary" />
            <div>
              <CardDescription>Recent entries</CardDescription>
              <CardTitle className="text-2xl text-foreground">
                {activeStoryWindow || activeTheme
                  ? `Focused on ${[
                      activeStoryWindow ? activeStoryWindow.dateRangeLabel : null,
                      activeTheme ? `${activeTheme.label} theme` : null,
                    ].filter(Boolean).join(" · ")}`
                  : "Narrative context, not just metrics"}
              </CardTitle>
            </div>
          </div>
          {activeStoryWindow || activeTheme ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-border/40 bg-transparent"
              onClick={() => {
                setActiveStoryWindowId(null);
                setActiveThemeTag(null);
              }}
            >
              Show all recent entries
            </Button>
          ) : null}
        </CardHeader>
        <CardContent>
          {filteredEntries.length ? (
            <div className="grid gap-4 xl:grid-cols-2">
              {filteredEntries.map((entry) => (
                <div key={entry.id} className="rounded-[28px] border border-border/40 bg-background/35 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-lg font-semibold tracking-tight text-foreground">
                        {entry.title ?? "Untitled reflection"}
                      </p>
                      <p className="mt-2 text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {formatEntryDay(entry.dayIso)}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-border/40 bg-transparent"
                      style={getMoodBadgeStyle(entry.moodScore)}
                    >
                      {entry.moodScore != null ? `${entry.moodScore}/100` : "No mood tag"}
                    </Badge>
                  </div>
                  <p className="mt-4 text-sm leading-6 text-muted-foreground">{entry.excerpt}</p>
                  <JournalSignals entry={entry} compact />
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                      {entry.wordCount} words
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="ghost" className="rounded-full" onClick={() => openEditEditor(entry)} disabled={readOnlyDemo}>
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-full text-muted-foreground"
                        disabled={isPending || readOnlyDemo}
                        onClick={() => handleDeleteEntry(entry)}
                      >
                        <Trash2 className="size-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : surfaceData.recentEntries.length ? (
            <div className="rounded-[24px] border border-dashed border-border/40 bg-background/35 p-5 text-sm leading-6 text-muted-foreground">
              The selected story window no longer has visible entries in the recent list.
            </div>
          ) : (
            <div className="rounded-[24px] border border-dashed border-border/40 bg-background/35 p-5 text-sm leading-6 text-muted-foreground">
              There are no journal entries yet. Add a first entry to start building narrative context for your dashboard and insights.
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isEditorOpen} onOpenChange={closeEditor}>
        <SheetContent side="center" className="border-border/40 bg-card/95">
          <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmitEntry}>
            <SheetHeader>
              <SheetTitle>{formState.id ? "Edit journal entry" : "Write a journal entry"}</SheetTitle>
              <SheetDescription>
                Capture what happened, what it felt like, and optionally attach a mood tag so the entry can connect back to your broader patterns.
              </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
              <div className="rounded-[24px] border border-border/40 bg-background/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Prompt cues</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Use one to get past the blank page, then write naturally.
                    </p>
                  </div>
                  {editorDerivedTags.length ? (
                    <div className="flex flex-wrap justify-end gap-2">
                      {editorDerivedTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="border-border/40 bg-transparent capitalize">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="mt-4 grid gap-2">
                  {surfaceData.promptLibrary.map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      className="rounded-[18px] border border-border/40 bg-background/40 px-4 py-3 text-left transition hover:border-border/70 hover:bg-background/55 disabled:cursor-not-allowed disabled:opacity-60"
                      disabled={readOnlyDemo}
                      onClick={() => applyPromptTemplate(prompt)}
                    >
                      <p className="text-sm font-medium text-foreground">{prompt.label}</p>
                      <p className="mt-1 text-sm leading-6 text-muted-foreground">{prompt.prompt}</p>
                      <p className="mt-3 text-xs uppercase tracking-[0.18em] text-muted-foreground">{prompt.whyNow}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="journalDay">Day</Label>
                  <Input
                    id="journalDay"
                    type="date"
                    value={formState.day}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, day: event.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="journalMoodScore">Mood tag</Label>
                  <Input
                    id="journalMoodScore"
                    type="number"
                    min={1}
                    max={100}
                    placeholder="82"
                    value={formState.moodScore}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, moodScore: event.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="rounded-[24px] border border-border/40 bg-background/35 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Same-day context</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      Review what is already overlapping this draft day before you write, so the entry carries the right frame instead of relying on memory alone.
                    </p>
                  </div>
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => router.push("/life-events")}>
                    Manage context
                  </Button>
                </div>
                {editorLifeEvents.length ? (
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {editorLifeEvents.map((lifeEvent) => (
                      <div key={lifeEvent.id} className="rounded-[20px] border border-border/40 bg-background/45 p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-medium text-foreground">{lifeEvent.title}</p>
                            <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{lifeEvent.windowLabel}</p>
                          </div>
                          <Badge variant="outline" className={cn("capitalize", getSentimentTone(lifeEvent.sentiment))}>
                            {lifeEvent.sentimentLabel}
                          </Badge>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Badge variant="outline" className="border-border/40 bg-transparent">{lifeEvent.categoryLabel}</Badge>
                          <Badge variant="outline" className="border-border/40 bg-transparent">{lifeEvent.severityLabel}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-4 rounded-[20px] border border-dashed border-border/40 bg-background/40 p-4 text-sm leading-6 text-muted-foreground">
                    No life context overlaps this draft day yet.
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="journalTitle">Title</Label>
                <Input
                  id="journalTitle"
                  autoFocus
                  value={formState.title}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, title: event.target.value }))
                  }
                  placeholder="What stood out today?"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="journalContent">Entry</Label>
                <Textarea
                  id="journalContent"
                  className="min-h-64"
                  value={formState.content}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, content: event.target.value }))
                  }
                  placeholder="Write about what shaped the day, what felt heavier or lighter than expected, and anything you might want to remember when looking back later."
                />
              </div>
            </div>

            <SheetFooter className="border-t border-border/40 bg-background/40">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Mood tags are optional. The journal stays useful even when the entry remains fully narrative.
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => closeEditor(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-full" disabled={isPending || readOnlyDemo}>
                    <Save className="size-4" />
                    {formState.id ? "Save changes" : "Save entry"}
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}