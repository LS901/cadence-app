"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { format } from "date-fns";
import { CalendarClock, CalendarDays, Check, CircleDashed, History, Pencil, Plus, Save, Trash2, X } from "lucide-react";
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
import type { LifeEventItem } from "@/features/life-events/types";
import type {
  PlannerActivityHistory,
  PlannerActivityItem,
  PlannerData,
  PlannerInsightHighlight,
  PlannerInsightState,
  PlannerSuggestedActivityDraft,
} from "@/features/planner/types";
import {
  formatInsightEvidenceLine,
  getInsightSurfacePresentation,
} from "@/features/insights/lib/highlight-presentation";
import { PageIntro } from "@/features/shared/components/page-intro";
import { lifeEventOverlapsDay } from "@/lib/life-events";
import { cn } from "@/lib/utils";
import {
  activityCategoryValues,
  activityFormSchema,
  type ActivityFormValues,
  recurrencePatternValues,
} from "@/lib/validation/activity";
import {
  getSuggestedDraftHistoryMatch,
  getSuggestedDraftScheduledAt,
} from "@/features/planner/lib/suggested-draft";
import {
  deleteActivityAction,
  updateActivityStatusAction,
  upsertActivityAction,
} from "@/server/planner/actions";

type PlannerWorkspaceProps = {
  data: PlannerData;
  insightHighlights?: PlannerInsightHighlight[];
  insightState?: PlannerInsightState;
  suggestedActivityDraft?: PlannerSuggestedActivityDraft | null;
  openSuggestedDraftOnLoad?: boolean;
};

type ActivitySheetMode = "planned" | "retrospective" | "edit";

type ActivitySheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: ActivitySheetMode;
  activity: PlannerActivityItem | null;
  activityHistory: PlannerActivityHistory[];
  lifeEvents: LifeEventItem[];
  suggestedDraft?: PlannerSuggestedActivityDraft | null;
};

type CompletionDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activity: PlannerActivityItem | null;
  historyItem?: PlannerActivityHistory;
  moodScore: string;
  onMoodScoreChange: (value: string) => void;
};

function getEmptyActivityValues(
  mode: ActivitySheetMode,
  suggestedDraft?: PlannerSuggestedActivityDraft | null
): ActivityFormValues {
  const now = new Date();
  now.setMinutes(Math.ceil(now.getMinutes() / 15) * 15, 0, 0);
  const isSuggestedPlannedDraft = mode === "planned" && suggestedDraft;

  return {
    templateId: "",
    title: isSuggestedPlannedDraft ? suggestedDraft.title : "",
    category: isSuggestedPlannedDraft ? suggestedDraft.category : "FOCUS",
    notes: isSuggestedPlannedDraft ? suggestedDraft.notes : "",
    recurring: isSuggestedPlannedDraft ? suggestedDraft.recurring : false,
    recurrencePattern: isSuggestedPlannedDraft ? suggestedDraft.recurrencePattern : "",
    recurrenceCustom: "",
    scheduledAt: format(now, "yyyy-MM-dd'T'HH:mm"),
    durationMinutes: isSuggestedPlannedDraft ? suggestedDraft.durationMinutes : "",
    entryMode: mode === "retrospective" ? "RETROSPECTIVE" : "PLANNED",
    completionMoodScore: mode === "retrospective" ? "" : "",
  };
}

function toDateTimeLocal(value: string) {
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}

function getNextOpenSlotValue(now = new Date()) {
  const rounded = new Date(now);
  rounded.setMinutes(Math.ceil(rounded.getMinutes() / 15) * 15, 0, 0);

  return format(rounded, "yyyy-MM-dd'T'HH:mm");
}

function getActivityDefaults(
  activity: PlannerActivityItem | null,
  mode: ActivitySheetMode,
  suggestedDraft?: PlannerSuggestedActivityDraft | null
): ActivityFormValues {
  if (!activity) {
    return getEmptyActivityValues(mode, suggestedDraft);
  }

  return {
    templateId: activity.templateId ?? "",
    title: activity.title,
    category: activity.category,
    notes: activity.notes ?? "",
    recurring: activity.recurring,
    recurrencePattern: activity.recurrencePattern ?? "",
    recurrenceCustom: activity.recurrenceCustom ?? "",
    scheduledAt: toDateTimeLocal(activity.scheduledAtIso),
    durationMinutes: activity.durationMinutes ? String(activity.durationMinutes) : "",
    entryMode: "PLANNED",
    completionMoodScore: mode === "retrospective" && activity.completionMoodScore
      ? String(activity.completionMoodScore)
      : "",
  };
}

function getStatusBadgeClassName(status: PlannerActivityItem["status"]) {
  if (status === "COMPLETED") {
    return "bg-emerald-500/15 text-emerald-200";
  }

  if (status === "SKIPPED") {
    return "bg-amber-500/15 text-amber-100";
  }

  return "bg-sky-500/15 text-sky-100";
}

function getCategoryBadgeClassName(category: PlannerActivityItem["category"]) {
  if (category === "EXERCISE" || category === "MINDFULNESS") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }

  if (category === "SOCIAL" || category === "CREATIVE") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-100";
  }

  if (category === "SLEEP") {
    return "border-indigo-400/20 bg-indigo-500/10 text-indigo-100";
  }

  return "border-border/40 bg-white/6 text-foreground";
}

function formatEnumLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

function getStatusLabel(status: PlannerActivityItem["status"]) {
  if (status === "COMPLETED") {
    return "Done";
  }

  if (status === "SCHEDULED") {
    return "Planned";
  }

  return "Skipped";
}

function getRecurrenceLabel(activity: PlannerActivityItem) {
  if (!activity.recurring || !activity.recurrencePattern) {
    return null;
  }

  if (activity.recurrencePattern === "CUSTOM") {
    return activity.recurrenceCustom
      ? `Custom: ${activity.recurrenceCustom}`
      : "Custom repeat";
  }

  return `${formatEnumLabel(activity.recurrencePattern)} repeat`;
}

function getContextToneClassName(sentiment: string | null) {
  if (sentiment === "POSITIVE") {
    return "border-[color:color-mix(in_oklab,var(--mood-4)_28%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-4)_14%,transparent)] text-foreground";
  }

  if (sentiment === "NEGATIVE") {
    return "border-[color:color-mix(in_oklab,var(--mood-2)_28%,transparent)] bg-[color:color-mix(in_oklab,var(--mood-2)_14%,transparent)] text-foreground";
  }

  return "border-border/40 bg-background/45 text-muted-foreground";
}

function getDraftLifeEvents(scheduledAtValue: string, lifeEvents: LifeEventItem[]) {
  if (!scheduledAtValue) {
    return [];
  }

  const day = new Date(scheduledAtValue);

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

function ActivitySheet({
  open,
  onOpenChange,
  mode,
  activity,
  activityHistory,
  lifeEvents,
  suggestedDraft,
}: ActivitySheetProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const form = useForm<ActivityFormValues>({
    resolver: zodResolver(activityFormSchema),
    defaultValues: getActivityDefaults(activity, mode, suggestedDraft),
  });
  const recurring = useWatch({
    control: form.control,
    name: "recurring",
  });
  const selectedTemplateId = useWatch({
    control: form.control,
    name: "templateId",
  });
  const recurrencePattern = useWatch({
    control: form.control,
    name: "recurrencePattern",
  });
  const scheduledAt = useWatch({
    control: form.control,
    name: "scheduledAt",
  });

  const selectedHistory = useMemo(
    () => activityHistory.find((item) => item.templateId === selectedTemplateId),
    [activityHistory, selectedTemplateId]
  );
  const draftLifeEvents = useMemo(
    () => getDraftLifeEvents(scheduledAt, lifeEvents),
    [lifeEvents, scheduledAt]
  );
  const suggestedHistoryMatch = useMemo(
    () => getSuggestedDraftHistoryMatch(suggestedDraft, activityHistory),
    [activityHistory, suggestedDraft]
  );
  const suggestedScheduledAt = useMemo(
    () => getSuggestedDraftScheduledAt(suggestedDraft, activityHistory),
    [activityHistory, suggestedDraft]
  );
  const suggestedScheduledAtValue = suggestedScheduledAt
    ? format(suggestedScheduledAt, "yyyy-MM-dd'T'HH:mm")
    : null;
  const nextOpenSlotValue = useMemo(() => getNextOpenSlotValue(), []);
  const isRetrospective = mode === "retrospective";
  const isTemplateLocked = Boolean(selectedHistory);
  const isSuggestedDraft = Boolean(suggestedDraft && !activity && !isRetrospective);
  const isRecurringSuggestedDraft = Boolean(isSuggestedDraft && suggestedDraft?.recurring);
  const isUsingSuggestedSlot = Boolean(
    suggestedScheduledAtValue && scheduledAt === suggestedScheduledAtValue
  );

  useEffect(() => {
    form.reset(getActivityDefaults(activity, mode, suggestedDraft));
  }, [activity, form, mode, open, suggestedDraft]);

  useEffect(() => {
    if (!selectedHistory) {
      return;
    }

    form.setValue("title", selectedHistory.title, { shouldDirty: true });
    form.setValue("category", selectedHistory.category, { shouldDirty: true });
    form.setValue("notes", selectedHistory.notes ?? "", { shouldDirty: true });
    form.setValue(
      "durationMinutes",
      selectedHistory.defaultDurationMinutes
        ? String(selectedHistory.defaultDurationMinutes)
        : "",
      { shouldDirty: true }
    );
  }, [form, selectedHistory]);

  const handleSubmit = (values: ActivityFormValues) => {
    startTransition(async () => {
      try {
        const result = await upsertActivityAction({
          ...values,
          entryMode: isRetrospective ? "RETROSPECTIVE" : "PLANNED",
          id: activity?.id,
        });

        toast.success(
          result.mode === "created"
            ? "Activity added to your week."
            : "Activity updated."
        );
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to save activity."
        );
      }
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full border-border/40 bg-card/95 sm:max-w-xl">
        <form
          className="flex h-full flex-col"
          onSubmit={form.handleSubmit(handleSubmit)}
        >
          <SheetHeader>
            <SheetTitle>
              {activity
                ? "Edit activity"
                : isRetrospective
                  ? "Add retrospective activity"
                  : "Add an activity"}
            </SheetTitle>
            <SheetDescription>
              {isRetrospective
                ? "Log something you already completed and attach the mood score directly to the finished activity."
                : "Schedule the activity first. Mood gets captured when you complete it."}
            </SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
            {isSuggestedDraft ? (
              <div className="rounded-[24px] border border-primary/30 bg-primary/10 px-4 py-4 text-sm leading-6 text-foreground">
                <p className="text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
                  Weekly review draft
                </p>
                <p className="mt-2">
                  This activity is prefilled from your weekly review so you can turn the carry-forward insight into an actual experiment on the calendar.
                </p>
                {suggestedHistoryMatch?.lastCompletedAtIso && suggestedScheduledAtValue ? (
                  <div className="mt-2 space-y-3 text-muted-foreground">
                    <p>
                      Suggested slot from your recent {suggestedHistoryMatch.title.toLowerCase()} rhythm: {format(new Date(suggestedHistoryMatch.lastCompletedAtIso), "EEEE h:mm a")}.
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant={isUsingSuggestedSlot ? "default" : "outline"}
                        className="rounded-full"
                        onClick={() => {
                          form.setValue("scheduledAt", suggestedScheduledAtValue, {
                            shouldDirty: true,
                          });
                        }}
                      >
                        Use last successful slot
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant={!isUsingSuggestedSlot ? "outline" : "secondary"}
                        className="rounded-full"
                        onClick={() => {
                          form.setValue("scheduledAt", nextOpenSlotValue, {
                            shouldDirty: true,
                          });
                        }}
                      >
                        Use next open slot
                      </Button>
                    </div>
                  </div>
                ) : null}
                {isRecurringSuggestedDraft ? (
                  <p className="mt-2 text-muted-foreground">
                    Recurring weekly cadence is already prefilled because this looks like a repeatable support habit rather than a one-off adjustment.
                  </p>
                ) : null}
              </div>
            ) : null}

            <div className="space-y-2">
              <Label htmlFor="templateId">Reuse a previous activity</Label>
              <select
                id="templateId"
                className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                value={selectedTemplateId}
                onChange={(event) => {
                  form.setValue("templateId", event.target.value, { shouldDirty: true });
                }}
              >
                <option value="" className="bg-card text-foreground">
                  Create a new activity
                </option>
                {activityHistory.map((item) => (
                  <option
                    key={item.templateId}
                    value={item.templateId}
                    className="bg-card text-foreground"
                  >
                    {item.title}
                    {item.averageMoodScore != null
                      ? ` · avg mood ${item.averageMoodScore}`
                      : ""}
                  </option>
                ))}
              </select>
              <p className="text-sm leading-6 text-muted-foreground">
                Choose an existing activity template to keep mood history attached to the same activity over time.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" disabled={isTemplateLocked} {...form.register("title")} />
              {form.formState.errors.title ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.title.message}
                </p>
              ) : null}
              {selectedHistory ? (
                <div className="rounded-[24px] border border-border/40 bg-background/35 px-4 py-3 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">Previous activity history</p>
                  <p className="mt-1 leading-6">
                    {selectedHistory.totalCount} logged {selectedHistory.totalCount === 1 ? "time" : "times"}
                    {selectedHistory.averageMoodScore != null
                      ? ` · average mood ${selectedHistory.averageMoodScore}`
                      : " · no mood scores yet"}
                  </p>
                </div>
              ) : (
                <p className="text-sm leading-6 text-muted-foreground">
                  Leave the template blank to create a new activity identity.
                </p>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  disabled={isTemplateLocked}
                  className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                  {...form.register("category")}
                >
                  {activityCategoryValues.map((category) => (
                    <option key={category} value={category} className="bg-card text-foreground">
                      {category.toLowerCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="scheduledAt">
                  {isRetrospective ? "Completed at" : "Scheduled for"}
                </Label>
                <Input
                  id="scheduledAt"
                  type="datetime-local"
                  {...form.register("scheduledAt")}
                />
                {form.formState.errors.scheduledAt ? (
                  <p className="text-sm text-destructive">
                    {form.formState.errors.scheduledAt.message}
                  </p>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="durationMinutes">Duration in minutes</Label>
                <Input
                  id="durationMinutes"
                  inputMode="numeric"
                  placeholder="45"
                  {...form.register("durationMinutes")}
                />
              </div>
            </div>

            <div className="rounded-[24px] border border-border/40 bg-background/35 px-4 py-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Same-day context</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Check what is already shaping this day before you read the activity as a clean behavioural signal.
                  </p>
                </div>
                <Button type="button" variant="outline" className="rounded-full" onClick={() => router.push("/life-events")}>
                  Manage context
                </Button>
              </div>
              {draftLifeEvents.length ? (
                <div className="mt-4 space-y-3">
                  {draftLifeEvents.map((lifeEvent) => (
                    <div key={lifeEvent.id} className="rounded-[20px] border border-border/40 bg-background/40 p-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{lifeEvent.title}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">{lifeEvent.windowLabel}</p>
                        </div>
                        <Badge variant="outline" className={cn("capitalize", getContextToneClassName(lifeEvent.sentiment))}>
                          {lifeEvent.sentimentLabel}
                        </Badge>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-[11px] tracking-[0.08em]">
                          {lifeEvent.categoryLabel}
                        </Badge>
                        <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-[11px] tracking-[0.08em]">
                          {lifeEvent.severityLabel}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-[20px] border border-dashed border-border/40 bg-background/40 p-4 text-sm leading-6 text-muted-foreground">
                  No life context overlaps the currently selected activity day.
                </div>
              )}
            </div>

            {isRetrospective ? (
              <div className="space-y-2">
                <Label htmlFor="completionMoodScore">Mood after completion</Label>
                <Input
                  id="completionMoodScore"
                  inputMode="numeric"
                  placeholder="78"
                  {...form.register("completionMoodScore")}
                />
                <p className="text-sm leading-6 text-muted-foreground">
                  This score is stored against this completed activity and contributes to future averages for the same title.
                </p>
              </div>
            ) : null}

            <div className="space-y-4 rounded-[24px] border border-border/40 bg-background/40 px-4 py-4">
              <div className="flex items-center gap-3">
                <input
                  id="recurring"
                  type="checkbox"
                  className="size-4 rounded border border-input bg-transparent"
                  checked={recurring}
                  onChange={(event) => form.setValue("recurring", event.target.checked)}
                />
                <Label htmlFor="recurring" className="cursor-pointer">
                  Keep this activity recurring
                </Label>
              </div>

              {recurring ? (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="recurrencePattern">Repeats</Label>
                    <select
                      id="recurrencePattern"
                      className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                      {...form.register("recurrencePattern")}
                    >
                      <option value="" className="bg-card text-foreground">
                        Select a cadence
                      </option>
                      {recurrencePatternValues.map((pattern) => (
                        <option key={pattern} value={pattern} className="bg-card text-foreground">
                          {formatEnumLabel(pattern)}
                        </option>
                      ))}
                    </select>
                    {form.formState.errors.recurrencePattern ? (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.recurrencePattern.message}
                      </p>
                    ) : null}
                  </div>

                  {recurrencePattern === "CUSTOM" ? (
                    <div className="space-y-2">
                      <Label htmlFor="recurrenceCustom">Custom rule</Label>
                      <Input
                        id="recurrenceCustom"
                        placeholder="Every second Tuesday"
                        {...form.register("recurrenceCustom")}
                      />
                      {form.formState.errors.recurrenceCustom ? (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.recurrenceCustom.message}
                        </p>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={5} {...form.register("notes")} />
              {form.formState.errors.notes ? (
                <p className="text-sm text-destructive">
                  {form.formState.errors.notes.message}
                </p>
              ) : null}
            </div>
          </div>

          <SheetFooter className="border-t border-border/40 bg-background/40">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" className="rounded-full" disabled={isPending}>
              {activity
                ? "Save changes"
                : isRetrospective
                  ? "Save retrospective activity"
                  : "Create activity"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function CompletionDialog({
  open,
  onOpenChange,
  activity,
  historyItem,
  moodScore,
  onMoodScoreChange,
}: CompletionDialogProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  if (!open || !activity) {
    return null;
  }

  const handleComplete = () => {
    startTransition(async () => {
      try {
        await updateActivityStatusAction({
          id: activity.id,
          status: "COMPLETED",
          completionMoodScore: moodScore,
        });

        toast.success("Activity marked complete.");
        onOpenChange(false);
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to complete activity."
        );
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4 py-8 backdrop-blur-sm">
      <Card className="glass-card w-full max-w-md rounded-[28px] border-border/40">
        <CardHeader className="space-y-2">
          <CardDescription>Complete activity</CardDescription>
          <CardTitle className="text-2xl text-foreground">{activity.title}</CardTitle>
          <p className="text-sm leading-6 text-muted-foreground">
            Capture the mood after finishing this activity so repeated entries become more useful for future insights.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {historyItem ? (
            <div className="rounded-[22px] border border-border/40 bg-background/35 px-4 py-3 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Previous history</p>
              <p className="mt-1 leading-6">
                {historyItem.averageMoodScore != null
                  ? `Average mood ${historyItem.averageMoodScore} across ${historyItem.completionCount} completions.`
                  : `Logged ${historyItem.totalCount} time${historyItem.totalCount === 1 ? "" : "s"} so far.`}
              </p>
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="completionMoodScoreDialog">Mood score</Label>
            <Input
              id="completionMoodScoreDialog"
              inputMode="numeric"
              placeholder="78"
              value={moodScore}
              onChange={(event) => onMoodScoreChange(event.target.value)}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={isPending}
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={isPending}
              onClick={handleComplete}
            >
              <Save className="size-4" />
              Save completion
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ActivityCardActions({
  activity,
  onOpenCompletion,
  onEdit,
}: {
  activity: PlannerActivityItem;
  onOpenCompletion: () => void;
  onEdit: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (status: PlannerActivityItem["status"]) => {
    startTransition(async () => {
      try {
        await updateActivityStatusAction({
          id: activity.id,
          status,
        });

        toast.success(
          status === "COMPLETED"
            ? "Activity marked complete."
            : status === "SKIPPED"
              ? "Activity skipped."
              : "Activity reset to scheduled."
        );
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to update activity."
        );
      }
    });
  };

  const handleDelete = () => {
    if (!window.confirm(`Delete "${activity.title}"?`)) {
      return;
    }

    startTransition(async () => {
      try {
        await deleteActivityAction(activity.id);
        toast.success("Activity deleted.");
        router.refresh();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Unable to delete activity."
        );
      }
    });
  };

  return (
    <div className="mt-4 space-y-3 border-t border-border/40 pt-4">
      {activity.completionMoodScore != null ? (
        <div className="rounded-full border border-border/40 bg-background/35 px-3 py-2 text-xs text-muted-foreground">
          Mood score: {activity.completionMoodScore}
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {activity.status === "COMPLETED" ? (
          <Button
            type="button"
            size="xs"
            className="rounded-full"
            disabled={isPending}
            onClick={onOpenCompletion}
          >
            <Check className="size-4" />
            Update mood
          </Button>
        ) : !activity.isFuture ? (
          <Button
            type="button"
            size="xs"
            className="rounded-full"
            disabled={isPending}
            onClick={onOpenCompletion}
          >
            <Check className="size-4" />
            Complete
          </Button>
        ) : null}

        {activity.status !== "SKIPPED" ? (
          <Button
            type="button"
            size="xs"
            variant="outline"
            className="rounded-full"
            disabled={isPending}
            onClick={() => handleStatusChange("SKIPPED")}
          >
            <X className="size-4" />
            Skip
          </Button>
        ) : null}

        {activity.status !== "SCHEDULED" ? (
          <Button
            type="button"
            size="xs"
            variant="ghost"
            className="rounded-full"
            disabled={isPending}
            onClick={() => handleStatusChange("SCHEDULED")}
          >
            <CircleDashed className="size-4" />
            Reset
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="rounded-full"
          disabled={isPending}
          onClick={onEdit}
        >
          <Pencil className="size-4" />
          Edit
        </Button>
        <Button
          type="button"
          size="xs"
          variant="ghost"
          className="rounded-full text-destructive hover:text-destructive"
          disabled={isPending}
          onClick={handleDelete}
        >
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>
    </div>
  );
}

export function PlannerWorkspace({
  data,
  insightHighlights = [],
  insightState,
  suggestedActivityDraft = null,
  openSuggestedDraftOnLoad = false,
}: PlannerWorkspaceProps) {
  const [isSheetOpen, setIsSheetOpen] = useState(openSuggestedDraftOnLoad && Boolean(suggestedActivityDraft));
  const [sheetMode, setSheetMode] = useState<ActivitySheetMode>("planned");
  const [selectedActivity, setSelectedActivity] = useState<PlannerActivityItem | null>(null);
  const [sheetDraft, setSheetDraft] = useState<PlannerSuggestedActivityDraft | null>(
    openSuggestedDraftOnLoad ? suggestedActivityDraft : null
  );
  const [completionTarget, setCompletionTarget] = useState<PlannerActivityItem | null>(null);
  const [completionMoodScore, setCompletionMoodScore] = useState("");
  const insightSurfacePresentation = getInsightSurfacePresentation({
    surface: "planner",
    mode: insightState?.mode ?? "EMPTY",
    nullState: insightState?.nullState ?? null,
  });

  const activityHistoryMap = useMemo(
    () =>
      new Map(
        data.activityHistory.map((item) => [item.templateId, item])
      ),
    [data.activityHistory]
  );

  const openCreateSheet = () => {
    setSheetMode("planned");
    setSelectedActivity(null);
    setSheetDraft(null);
    setIsSheetOpen(true);
  };

  const openSuggestedDraftSheet = () => {
    if (!suggestedActivityDraft) {
      return;
    }

    setSheetMode("planned");
    setSelectedActivity(null);
    setSheetDraft(suggestedActivityDraft);
    setIsSheetOpen(true);
  };

  const openRetrospectiveSheet = () => {
    setSheetMode("retrospective");
    setSelectedActivity(null);
    setSheetDraft(null);
    setIsSheetOpen(true);
  };

  const openEditSheet = (activity: PlannerActivityItem) => {
    setSheetMode("edit");
    setSelectedActivity(activity);
    setSheetDraft(null);
    setIsSheetOpen(true);
  };

  const openCompletionDialog = (activity: PlannerActivityItem) => {
    setCompletionTarget(activity);
    setCompletionMoodScore(
      activity.completionMoodScore ? String(activity.completionMoodScore) : ""
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <PageIntro
          eyebrow="Weekly planner"
          title="Shape the week before it shapes you."
          description="Place activities into the week, update completion state in context, and log the mood shift that follows a finished block."
        />

        <div className="flex flex-wrap items-center gap-3">
          <Badge
            variant="secondary"
            className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.22em]"
          >
            {data.dataSource === "database" ? "Database connected" : "Mock preview"}
          </Badge>
          <Button className="rounded-full" onClick={openCreateSheet}>
            <Plus className="size-4" />
            Add activity
          </Button>
          {suggestedActivityDraft ? (
            <Button className="rounded-full" variant="outline" onClick={openSuggestedDraftSheet}>
              <Pencil className="size-4" />
              Use weekly review draft
            </Button>
          ) : null}
          <Button className="rounded-full" variant="outline" onClick={openRetrospectiveSheet}>
            <History className="size-4" />
            Add retrospective
          </Button>
        </div>
      </div>

      <Card className="glass-card rounded-[32px]">
        <CardHeader className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardDescription>This week</CardDescription>
              <CardTitle className="text-2xl text-foreground">
                {data.weekLabel}
              </CardTitle>
            </div>
            <Badge
              variant="outline"
              className="rounded-full border-border/40 px-3 py-1 text-[11px] uppercase tracking-[0.22em]"
            >
              {data.summary.completionRate}% complete
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {data.days.map((day) => (
              <div
                key={day.dateKey}
                className={cn(
                  "rounded-[28px] border border-border/40 bg-background/35 p-5",
                  day.isToday && "border-primary/40 bg-primary/8"
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-mono text-[11px] uppercase tracking-[0.26em] text-muted-foreground">
                      {day.shortLabel}
                    </p>
                    <p className="mt-2 text-lg font-semibold text-foreground">
                      {day.dayNumber}
                    </p>
                  </div>
                  {day.isToday ? (
                    <Badge className="rounded-full px-3 py-1 text-[11px]">Today</Badge>
                  ) : null}
                </div>

                <p className="mt-2 text-xs leading-6 text-muted-foreground">
                  {day.fullLabel}
                </p>

                {day.context.activeCount ? (
                  <div className={cn("mt-4 rounded-[20px] border px-3 py-3", getContextToneClassName(day.context.dominantSentiment))}>
                    <p className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                      {day.context.activeCount} life context marker{day.context.activeCount === 1 ? "" : "s"}
                    </p>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {day.context.dominantTitle ?? "Meaningful context logged"}
                    </p>
                    {day.context.categories.length ? (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {day.context.categories.map((category) => (
                          <Badge key={`${day.dateKey}-${category}`} variant="outline" className="border-border/40 bg-transparent text-[11px]">
                            {category}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}

                <div className="mt-4 space-y-3">
                  {day.items.length ? (
                    day.items.map((activity) => {
                      const recurrenceLabel = getRecurrenceLabel(activity);

                      return (
                        <div
                          key={activity.id}
                          data-testid={`planner-activity-${activity.id}`}
                          className="rounded-[24px] border border-border/40 bg-card/70 p-5"
                        >
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-start gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-medium leading-6 text-foreground">
                                  {activity.title}
                                </p>
                                <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                  {activity.scheduledTimeLabel}
                                  {activity.durationMinutes
                                    ? ` · ${activity.durationMinutes} min`
                                    : ""}
                                </p>
                              </div>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "shrink-0 rounded-full px-3 py-1 text-[11px] tracking-[0.08em]",
                                  getStatusBadgeClassName(activity.status)
                                )}
                              >
                                {getStatusLabel(activity.status)}
                              </Badge>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <Badge
                                variant="outline"
                                className={cn(
                                  "rounded-full px-3 py-1 text-[11px] tracking-[0.08em]",
                                  getCategoryBadgeClassName(activity.category)
                                )}
                              >
                                {formatEnumLabel(activity.category)}
                              </Badge>
                              {recurrenceLabel ? (
                                <Badge
                                  variant="outline"
                                  className="rounded-full border-border/40 px-3 py-1 text-[11px] tracking-[0.08em]"
                                >
                                  {recurrenceLabel}
                                </Badge>
                              ) : null}
                            </div>
                          </div>

                          {activity.notes ? (
                            <p className="mt-3 text-sm leading-6 text-muted-foreground">
                              {activity.notes}
                            </p>
                          ) : null}

                          {activity.isFuture && activity.status === "SCHEDULED" ? (
                            <div className="mt-3 rounded-[18px] border border-border/40 bg-background/35 px-3 py-2 text-xs text-muted-foreground">
                              Completion becomes available when the scheduled time arrives.
                            </div>
                          ) : null}

                          <ActivityCardActions
                            activity={activity}
                            onOpenCompletion={() => openCompletionDialog(activity)}
                            onEdit={() => openEditSheet(activity)}
                          />
                        </div>
                      );
                    })
                  ) : (
                    <button
                      type="button"
                      className="w-full rounded-[24px] border border-dashed border-border/40 bg-white/4 px-4 py-8 text-left transition hover:bg-white/6"
                      onClick={openCreateSheet}
                    >
                      <p className="text-sm font-medium text-foreground">No activities yet</p>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">
                        Add a block here to give the day more structure.
                      </p>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[0.85fr_1.1fr_0.85fr]">
        <Card className="glass-card rounded-[32px]">
          <CardHeader>
            <CardDescription>Weekly summary</CardDescription>
            <CardTitle className="text-2xl text-foreground">
              Completion rhythm
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              { label: "Total activities", value: data.summary.total },
              { label: "Completed", value: data.summary.completed },
              { label: "Scheduled", value: data.summary.scheduled },
              { label: "Skipped", value: data.summary.skipped },
              { label: "Recurring", value: data.summary.recurring },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between rounded-[22px] border border-border/40 bg-background/35 px-4 py-3"
              >
                <span className="text-sm text-muted-foreground">{item.label}</span>
                <span className="text-lg font-semibold text-foreground">{item.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="glass-card rounded-[32px]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CalendarClock className="size-5 text-primary" />
              <div>
                <CardDescription>Activity library</CardDescription>
                <CardTitle className="text-2xl text-foreground">
                  Previously logged activities
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.activityHistory.length ? (
              data.activityHistory.slice(0, 6).map((item) => (
                <div
                  key={item.templateId}
                  className="rounded-[22px] border border-border/40 bg-background/35 px-4 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        {formatEnumLabel(item.category)}
                      </p>
                    </div>
                    <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-[11px] tracking-[0.08em]">
                      {item.totalCount} logged
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {item.averageMoodScore != null
                      ? `Average mood ${item.averageMoodScore} across ${item.completionCount} completions.`
                      : "No completion mood scores yet."}
                  </p>
                  {item.notes ? (
                    <p className="mt-2 text-sm leading-6 text-muted-foreground/80">
                      {item.notes}
                    </p>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="text-sm leading-7 text-muted-foreground">
                As you log activities, Cadence will surface them here so they can be reused with richer historical context.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="glass-card rounded-[32px]">
          <CardHeader>
            <div className="flex items-center gap-3">
              <CalendarDays className="size-5 text-primary" />
              <div>
                <CardDescription>Planner rhythm</CardDescription>
                <CardTitle className="text-2xl text-foreground">
                  Work the week with feedback
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-7 text-muted-foreground">
            <p>Use Add activity for future plans and Add retrospective when something already happened.</p>
            <p>Completion now opens a small mood dialog instead of writing directly into the card.</p>
            <p>Recurring activities can now store daily, weekly, or custom cadence details.</p>
            {insightHighlights.length ? (
              <div className="space-y-3 border-t border-border/40 pt-4">
                {insightHighlights.map((insight) => (
                  <div key={insight.id} className="rounded-[22px] border border-border/40 bg-background/35 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-[11px] tracking-[0.08em]">
                        {insight.lagDays === 0 ? "Same day" : `${insight.lagDays}-day lag`}
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-[11px] tracking-[0.08em] text-muted-foreground">
                        {Math.round(insight.confidence * 100)}% confidence
                      </Badge>
                      <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-[11px] tracking-[0.08em] text-muted-foreground">
                        {insight.evidenceLabel}
                      </Badge>
                      {insightSurfacePresentation.exploratoryBadgeLabel ? (
                        <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-[11px] tracking-[0.08em] text-muted-foreground">
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
                ))}
              </div>
            ) : insightState?.nullState ? (
              <div className="rounded-[22px] border border-border/40 bg-background/35 p-4 text-sm leading-6 text-muted-foreground">
                <p>{insightSurfacePresentation.emptyDescription}</p>
                {insightSurfacePresentation.emptyRecommendation ? (
                  <p className="mt-2 text-xs leading-5 text-muted-foreground">{insightSurfacePresentation.emptyRecommendation}</p>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <ActivitySheet
        open={isSheetOpen}
        onOpenChange={setIsSheetOpen}
        mode={sheetMode}
        activity={selectedActivity}
        activityHistory={data.activityHistory}
        lifeEvents={data.lifeEvents}
        suggestedDraft={sheetDraft}
      />

      <CompletionDialog
        open={Boolean(completionTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setCompletionTarget(null);
            setCompletionMoodScore("");
          }
        }}
        activity={completionTarget}
        historyItem={
          completionTarget
            ? activityHistoryMap.get(completionTarget.templateId ?? "")
            : undefined
        }
        moodScore={completionMoodScore}
        onMoodScoreChange={setCompletionMoodScore}
      />
    </div>
  );
}