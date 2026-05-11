"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarRange, HeartPulse, Plus, Save, Trash2 } from "lucide-react";
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
import { PageIntro } from "@/features/shared/components/page-intro";
import type { LifeEventItem, LifeEventsPageData } from "@/features/life-events/types";
import {
  LIFE_EVENT_CATEGORY_OPTIONS,
  LIFE_EVENT_RECURRENCE_OPTIONS,
  LIFE_EVENT_SENTIMENT_OPTIONS,
  LIFE_EVENT_SEVERITY_OPTIONS,
  type LifeEventCategoryValue,
  type LifeEventRecurrencePatternValue,
  type LifeEventSentimentValue,
} from "@/lib/life-events";
import { parseTagInput } from "@/lib/mood";
import { cn } from "@/lib/utils";
import { deleteLifeEventAction, upsertLifeEventAction } from "@/server/life-events/actions";

type LifeEventsWorkspaceProps = {
  data: LifeEventsPageData;
};

type LifeEventFormState = {
  id?: string;
  title: string;
  category: LifeEventCategoryValue;
  customCategoryLabel: string;
  description: string;
  severityScore: number;
  sentiment: LifeEventSentimentValue | "";
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  isOngoing: boolean;
  recurrencePattern: LifeEventRecurrencePatternValue | "";
  recurrenceInterval: string;
  recurrenceRule: string;
  tagsInput: string;
};

function toDateInputValue(dateIso: string) {
  const date = new Date(dateIso);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 10);
}

function toTimeInputValue(dateIso: string) {
  return format(new Date(dateIso), "HH:mm");
}

function getTodayDateInput() {
  return toDateInputValue(new Date().toISOString());
}

function createLifeEventFormState(event?: LifeEventItem | null): LifeEventFormState {
  return {
    id: event?.id,
    title: event?.title ?? "",
    category: event?.category ?? "ILLNESS",
    customCategoryLabel: event?.customCategoryLabel ?? "",
    description: event?.description ?? "",
    severityScore: event?.severityScore ?? 2,
    sentiment: event?.sentiment ?? "",
    startDate: event ? toDateInputValue(event.startAtIso) : getTodayDateInput(),
    startTime: event ? toTimeInputValue(event.startAtIso) : "09:00",
    endDate: event?.endAtIso ? toDateInputValue(event.endAtIso) : getTodayDateInput(),
    endTime: event?.endAtIso ? toTimeInputValue(event.endAtIso) : "18:00",
    isOngoing: event?.isOngoing ?? false,
    recurrencePattern: event?.recurrencePattern ?? "",
    recurrenceInterval: event?.recurrenceInterval != null ? String(event.recurrenceInterval) : "1",
    recurrenceRule: event?.recurrenceRule ?? "",
    tagsInput: event?.tags.join(", ") ?? "",
  };
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

function isGeneratedOccurrence(event: LifeEventItem) {
  return event.source === "RECURRING_GENERATED";
}

function EventListItem({
  event,
  isPending,
  onEdit,
  onDelete,
}: {
  event: LifeEventItem;
  isPending: boolean;
  onEdit: (event: LifeEventItem) => void;
  onDelete: (event: LifeEventItem) => void;
}) {
  const generatedOccurrence = isGeneratedOccurrence(event);

  return (
    <div data-testid={`life-event-card-${event.id}`} className="rounded-[24px] border border-border/40 bg-background/45 p-4">
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
        {event.isRecurring && event.recurrenceLabel ? (
          <Badge variant="outline" className="border-border/40 bg-transparent">{event.recurrenceLabel}</Badge>
        ) : null}
        {generatedOccurrence ? (
          <Badge variant="outline" className="border-border/40 bg-transparent">Generated occurrence</Badge>
        ) : null}
        {event.tags.map((tag) => (
          <Badge key={`${event.id}-${tag}`} variant="outline" className="border-border/40 bg-transparent capitalize">
            {tag}
          </Badge>
        ))}
      </div>
      {event.description ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">{event.description}</p>
      ) : null}
      {generatedOccurrence && event.seriesTitle ? (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Managed from the recurring series rooted in {event.seriesTitle}.
        </p>
      ) : null}
      <div className="mt-4 flex justify-end gap-2">
        <Button type="button" variant="ghost" className="rounded-full" disabled={generatedOccurrence} onClick={() => onEdit(event)}>
          Edit
        </Button>
        <Button
          type="button"
          variant="ghost"
          className="rounded-full text-muted-foreground"
          disabled={isPending || generatedOccurrence}
          onClick={() => onDelete(event)}
        >
          <Trash2 className="size-4" />
          {event.isRecurring && !generatedOccurrence ? "Delete series" : "Delete"}
        </Button>
      </div>
    </div>
  );
}

export function LifeEventsWorkspace({ data }: LifeEventsWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [eventPendingDeletion, setEventPendingDeletion] = useState<LifeEventItem | null>(null);
  const [formState, setFormState] = useState<LifeEventFormState>(() => createLifeEventFormState());

  const contextTags = useMemo(
    () =>
      data.allLifeEvents
        .flatMap((event) => event.tags)
        .filter((tag, index, tags) => tags.indexOf(tag) === index)
        .slice(0, 8),
    [data.allLifeEvents]
  );

  function openCreateSheet() {
    setFormState(createLifeEventFormState());
    setIsSheetOpen(true);
  }

  function openEditSheet(event: LifeEventItem) {
    setFormState(createLifeEventFormState(event));
    setIsSheetOpen(true);
  }

  function closeSheet(open: boolean) {
    setIsSheetOpen(open);

    if (!open) {
      setFormState(createLifeEventFormState());
    }
  }

  function closeDeleteConfirmation(open: boolean) {
    if (!open) {
      setEventPendingDeletion(null);
    }
  }

  function handleSubmitEvent(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      try {
        await upsertLifeEventAction({
          id: formState.id,
          title: formState.title,
          category: formState.category,
          customCategoryLabel: formState.customCategoryLabel,
          description: formState.description,
          severityScore: formState.severityScore,
          sentiment: formState.sentiment || undefined,
          startAt: new Date(`${formState.startDate}T${formState.startTime}:00`),
          endAt: formState.isOngoing
            ? undefined
            : new Date(`${formState.endDate}T${formState.endTime}:00`),
          isOngoing: formState.isOngoing,
          recurrencePattern: formState.recurrencePattern || undefined,
          recurrenceInterval: formState.recurrencePattern && formState.recurrencePattern !== "CUSTOM"
            ? Number(formState.recurrenceInterval || "1")
            : undefined,
          recurrenceRule: formState.recurrencePattern === "CUSTOM" ? formState.recurrenceRule : undefined,
          tags: parseTagInput(formState.tagsInput),
        });

        toast.success(formState.id ? "Context event updated." : "Context event saved.");
        closeSheet(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save context event.");
      }
    });
  }

  function handleDeleteEvent(event: LifeEventItem) {
    setEventPendingDeletion(event);
  }

  function confirmDeleteEvent() {
    if (!eventPendingDeletion) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteLifeEventAction({ id: eventPendingDeletion.id });
        toast.success(
          eventPendingDeletion.isRecurring ? "Recurring context series deleted." : "Context event deleted."
        );
        setEventPendingDeletion(null);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to delete context event.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <PageIntro
          eyebrow="Life context"
          title="Keep the bigger picture visible."
          description="Life events belong in their own place so illness, stress, travel, recovery, and meaningful positive shifts stay visible across mood, journal, and insight interpretation."
        />
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
            {data.dataSource === "mock" ? "Mock preview" : "Database connected"}
          </Badge>
          <Button type="button" className="rounded-full" onClick={openCreateSheet}>
            <Plus className="size-4" />
            Log context
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>Total context</CardDescription>
            <CardTitle>{data.summary.totalEvents} events logged</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Context becomes more useful when the bigger shifts are captured without making every day feel over-tracked.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>Active now</CardDescription>
            <CardTitle>{data.summary.activeEvents} currently shaping the week</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Ongoing or still-active context should stay easy to revisit while you log mood and reflection.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>Ongoing load</CardDescription>
            <CardTitle>{data.summary.ongoingEvents} marked ongoing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Ongoing events matter because their emotional weight usually lingers beyond a single day.
            </p>
          </CardContent>
        </Card>
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <CardDescription>High intensity</CardDescription>
            <CardTitle>{data.summary.highSeverityEvents} dominant events</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-6 text-muted-foreground">
              Higher-severity periods are the ones most likely to reshape how behavioural patterns should be read.
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardHeader>
            <div className="flex items-center gap-3">
              <HeartPulse className="size-5 text-primary" />
              <div>
                <CardDescription>Active context</CardDescription>
                <CardTitle>What is still shaping the present</CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.activeLifeEvents.length ? (
              data.activeLifeEvents.map((event) => (
                <EventListItem
                  key={event.id}
                  event={event}
                  isPending={isPending}
                  onEdit={openEditSheet}
                  onDelete={handleDeleteEvent}
                />
              ))
            ) : (
              <div className="rounded-[24px] border border-dashed border-border/40 bg-background/35 p-5 text-sm leading-6 text-muted-foreground">
                No active life context is logged right now. Add an event when something materially changes how the week should be interpreted.
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-5">
          <Card className="rounded-[32px] border-border/40 bg-card/70">
            <CardHeader>
              <div className="flex items-center gap-3">
                <CalendarRange className="size-5 text-primary" />
                <div>
                  <CardDescription>Why this matters</CardDescription>
                  <CardTitle>Context should not be buried in analytics</CardTitle>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 text-sm leading-6 text-muted-foreground">
              <div className="rounded-[24px] border border-border/40 bg-background/50 p-4">
                Logging context here keeps it visible across Mood, Journal, Dashboard, and Insights instead of relying on memory when a week feels unusual.
              </div>
              <div className="rounded-[24px] border border-border/40 bg-background/50 p-4">
                The goal is not to document everything. It is to preserve the few events that materially change how your patterns should be read.
              </div>
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
              <CardDescription>Recent history</CardDescription>
              <CardTitle>Resolved or earlier context</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.recentLifeEvents.length ? (
                data.recentLifeEvents.map((event) => (
                  <EventListItem
                    key={event.id}
                    event={event}
                    isPending={isPending}
                    onEdit={openEditSheet}
                    onDelete={handleDeleteEvent}
                  />
                ))
              ) : (
                <div className="rounded-[24px] border border-dashed border-border/40 bg-background/35 p-5 text-sm leading-6 text-muted-foreground">
                  Resolved life events will appear here once you start logging them.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="rounded-[32px] border-border/40 bg-card/70">
        <CardHeader>
          <CardDescription>Full context list</CardDescription>
          <CardTitle>Everything currently in the picture</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {data.allLifeEvents.length ? (
            data.allLifeEvents.map((event) => (
              <EventListItem
                key={event.id}
                event={event}
                isPending={isPending}
                onEdit={openEditSheet}
                onDelete={handleDeleteEvent}
              />
            ))
          ) : (
            <div className="rounded-[24px] border border-dashed border-border/40 bg-background/35 p-5 text-sm leading-6 text-muted-foreground">
              No life events logged yet. Start with the moments that would otherwise distort how a week looks in hindsight.
            </div>
          )}
        </CardContent>
      </Card>

      <Sheet open={isSheetOpen} onOpenChange={closeSheet}>
        <SheetContent side="center" className="border-border/40 bg-card/95">
          <form className="flex h-full min-h-0 flex-col" onSubmit={handleSubmitEvent}>
            <SheetHeader>
              <SheetTitle>{formState.id ? "Edit context event" : "Log context event"}</SheetTitle>
              <SheetDescription>
                Keep this lightweight. Only log context that materially changes how the day or week should be interpreted.
              </SheetDescription>
            </SheetHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="lifeEventTitle">Title</Label>
                <Input
                  id="lifeEventTitle"
                  value={formState.title}
                  onChange={(event) => setFormState((current) => ({ ...current, title: event.target.value }))}
                  placeholder="Sick with a cold"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lifeEventCategory">Category</Label>
                  <select
                    id="lifeEventCategory"
                    className="flex h-11 w-full rounded-2xl border border-border/40 bg-background px-4 text-sm outline-none transition focus:border-primary/40"
                    value={formState.category}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        category: event.target.value as LifeEventCategoryValue,
                      }))
                    }
                  >
                    {LIFE_EVENT_CATEGORY_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lifeEventSentiment">Sentiment</Label>
                  <select
                    id="lifeEventSentiment"
                    className="flex h-11 w-full rounded-2xl border border-border/40 bg-background px-4 text-sm outline-none transition focus:border-primary/40"
                    value={formState.sentiment}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        sentiment: event.target.value as LifeEventSentimentValue | "",
                      }))
                    }
                  >
                    <option value="">Unspecified</option>
                    {LIFE_EVENT_SENTIMENT_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {formState.category === "CUSTOM" ? (
                <div className="space-y-2">
                  <Label htmlFor="lifeEventCustomLabel">Custom label</Label>
                  <Input
                    id="lifeEventCustomLabel"
                    value={formState.customCategoryLabel}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, customCategoryLabel: event.target.value }))
                    }
                    placeholder="Exam pressure"
                  />
                </div>
              ) : null}

              <div className="space-y-2">
                <Label>Intensity</Label>
                <div className="grid gap-2 sm:grid-cols-5">
                  {LIFE_EVENT_SEVERITY_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant="outline"
                      className={cn(
                        "rounded-2xl border-border/40 bg-transparent px-3",
                        formState.severityScore === option.value && "border-primary/40 bg-primary/10 text-primary"
                      )}
                      onClick={() => setFormState((current) => ({ ...current, severityScore: option.value }))}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="lifeEventStartDate">Start day</Label>
                  <Input
                    id="lifeEventStartDate"
                    type="date"
                    value={formState.startDate}
                    onChange={(event) => setFormState((current) => ({ ...current, startDate: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lifeEventStartTime">Start time</Label>
                  <Input
                    id="lifeEventStartTime"
                    type="time"
                    value={formState.startTime}
                    onChange={(event) => setFormState((current) => ({ ...current, startTime: event.target.value }))}
                  />
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-[20px] border border-border/40 bg-background/40 px-4 py-3 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={formState.isOngoing}
                  onChange={(event) => setFormState((current) => ({ ...current, isOngoing: event.target.checked }))}
                />
                This is still ongoing
              </label>

              {!formState.isOngoing ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="lifeEventEndDate">End day</Label>
                    <Input
                      id="lifeEventEndDate"
                      type="date"
                      value={formState.endDate}
                      onChange={(event) => setFormState((current) => ({ ...current, endDate: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lifeEventEndTime">End time</Label>
                    <Input
                      id="lifeEventEndTime"
                      type="time"
                      value={formState.endTime}
                      onChange={(event) => setFormState((current) => ({ ...current, endTime: event.target.value }))}
                    />
                  </div>
                </div>
              ) : null}

              <div className="rounded-[24px] border border-border/40 bg-background/35 p-4">
                <div className="space-y-2">
                  <Label htmlFor="lifeEventRecurrencePattern">Repeats</Label>
                  <select
                    id="lifeEventRecurrencePattern"
                    className="flex h-11 w-full rounded-2xl border border-border/40 bg-background px-4 text-sm outline-none transition focus:border-primary/40"
                    value={formState.recurrencePattern}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        recurrencePattern: event.target.value as LifeEventRecurrencePatternValue | "",
                      }))
                    }
                  >
                    <option value="">Does not repeat</option>
                    {LIFE_EVENT_RECURRENCE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                {formState.recurrencePattern && formState.recurrencePattern !== "CUSTOM" ? (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="lifeEventRecurrenceInterval">Interval</Label>
                    <Input
                      id="lifeEventRecurrenceInterval"
                      inputMode="numeric"
                      min={1}
                      value={formState.recurrenceInterval}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, recurrenceInterval: event.target.value }))
                      }
                      placeholder="1"
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      Use 1 for every occurrence, 2 for every other interval, and so on.
                    </p>
                  </div>
                ) : null}

                {formState.recurrencePattern === "CUSTOM" ? (
                  <div className="mt-4 space-y-2">
                    <Label htmlFor="lifeEventRecurrenceRule">Custom rule</Label>
                    <Input
                      id="lifeEventRecurrenceRule"
                      value={formState.recurrenceRule}
                      onChange={(event) =>
                        setFormState((current) => ({ ...current, recurrenceRule: event.target.value }))
                      }
                      placeholder="Every second Tuesday"
                    />
                    <p className="text-xs leading-5 text-muted-foreground">
                      Custom cadence is stored on the series now, while future auto-generation stays limited to daily, weekly, and monthly patterns.
                    </p>
                  </div>
                ) : null}
              </div>

              <div className="space-y-2">
                <Label htmlFor="lifeEventTags">Tags</Label>
                <Input
                  id="lifeEventTags"
                  value={formState.tagsInput}
                  onChange={(event) => setFormState((current) => ({ ...current, tagsInput: event.target.value }))}
                  placeholder="illness, recovery, travel"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="lifeEventDescription">Description</Label>
                <Textarea
                  id="lifeEventDescription"
                  className="min-h-40"
                  value={formState.description}
                  onChange={(event) => setFormState((current) => ({ ...current, description: event.target.value }))}
                  placeholder="Optional note to help future-you remember why this period should be interpreted differently."
                />
              </div>
            </div>

            <SheetFooter className="border-t border-border/40 bg-background/40">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                  Log only what meaningfully changes how a day should be understood. This is context, not diagnosis.
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => closeSheet(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-full" disabled={isPending}>
                    <Save className="size-4" />
                    {formState.id ? "Save changes" : "Save context"}
                  </Button>
                </div>
              </div>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet open={eventPendingDeletion != null} onOpenChange={closeDeleteConfirmation}>
        <SheetContent side="center" className="h-auto w-[min(96vw,34rem)] border-border/40 bg-card/95">
          <SheetHeader>
            <SheetTitle>
              {eventPendingDeletion?.isRecurring ? "Delete recurring context series?" : "Delete context event?"}
            </SheetTitle>
            <SheetDescription>
              {eventPendingDeletion?.isRecurring
                ? "This removes the original context event and any generated future occurrences tied to it."
                : "This permanently removes this context event from your timeline and analytics context."}
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4 px-4 pb-2">
            {eventPendingDeletion ? (
              <div className="rounded-[24px] border border-border/40 bg-background/40 p-4">
                <p className="text-sm font-medium text-foreground">{eventPendingDeletion.title}</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">{eventPendingDeletion.windowLabel}</p>
                {eventPendingDeletion.recurrenceLabel ? (
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Recurrence: {eventPendingDeletion.recurrenceLabel}
                  </p>
                ) : null}
              </div>
            ) : null}
          </div>

          <SheetFooter className="border-t border-border/40 bg-background/40">
            <div className="flex w-full flex-wrap justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                disabled={isPending}
                onClick={() => setEventPendingDeletion(null)}
              >
                Keep event
              </Button>
              <Button type="button" className="rounded-full" disabled={isPending} onClick={confirmDeleteEvent}>
                <Trash2 className="size-4" />
                {eventPendingDeletion?.isRecurring ? "Delete series" : "Delete event"}
              </Button>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}