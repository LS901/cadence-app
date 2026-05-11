"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import {
  Archive,
  Check,
  Pencil,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  X,
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
import { PageIntro } from "@/features/shared/components/page-intro";
import type {
  HabitCategoryValue,
  HabitDayCell,
  HabitItem,
  HabitLogStatusValue,
  HabitsPageData,
  HabitTypeValue,
} from "@/features/habits/types";
import { cn } from "@/lib/utils";
import {
  archiveHabitAction,
  upsertHabitAction,
  upsertHabitLogAction,
} from "@/server/habits/actions";

const CATEGORY_OPTIONS: HabitCategoryValue[] = [
  "MOVEMENT",
  "SLEEP",
  "NOURISHMENT",
  "MINDFULNESS",
  "SOCIAL",
  "DIGITAL",
  "WORK",
  "OTHER",
];

type HabitFormState = {
  id?: string;
  name: string;
  category: HabitCategoryValue;
  type: HabitTypeValue;
  targetPerWeek: string;
  notes: string;
};

type HabitsWorkspaceProps = {
  data: HabitsPageData;
};

function formatCategoryLabel(category: HabitCategoryValue) {
  return category.toLowerCase().replace(/_/g, " ");
}

function createHabitFormState(habit?: HabitItem | null): HabitFormState {
  return {
    id: habit?.id,
    name: habit?.name ?? "",
    category: habit?.category ?? "MOVEMENT",
    type: habit?.type ?? "POSITIVE",
    targetPerWeek: String(habit?.targetPerWeek ?? 5),
    notes: habit?.notes ?? "",
  };
}

function getAlignedStatus(type: HabitTypeValue): HabitLogStatusValue {
  return type === "POSITIVE" ? "COMPLETED" : "SKIPPED";
}

function getTargetProgress(targetPerWeek: number, alignedDays: number) {
  return Math.min(100, Math.round((alignedDays / Math.max(targetPerWeek, 1)) * 100));
}

function buildRecentDays(historyDays: HabitDayCell[]) {
  return historyDays.slice(-7);
}

function getStreak(type: HabitTypeValue, historyDays: HabitDayCell[]) {
  const alignedStatus = getAlignedStatus(type);
  let streak = 0;

  for (let index = historyDays.length - 1; index >= 0; index -= 1) {
    if (historyDays[index]?.status !== alignedStatus) {
      break;
    }

    streak += 1;
  }

  return streak;
}

function buildTrendWeeks(
  historyDays: HabitDayCell[],
  type: HabitTypeValue,
  targetPerWeek: number
) {
  const alignedStatus = getAlignedStatus(type);

  return Array.from({ length: 4 }, (_, index) => {
    const weekDays = historyDays.slice(index * 7, (index + 1) * 7);
    const alignedDays = weekDays.filter((day) => day.status === alignedStatus).length;
    const loggedDays = weekDays.filter((day) => day.status !== "PENDING").length;

    return {
      label: weekDays[0]?.label ?? `Week ${index + 1}`,
      alignedDays,
      loggedDays,
      progress: getTargetProgress(targetPerWeek, alignedDays),
      targetHit: alignedDays >= targetPerWeek,
    };
  });
}

function recalculateHabit(habit: HabitItem): HabitItem {
  const alignedStatus = getAlignedStatus(habit.type);
  const recentDays = buildRecentDays(habit.historyDays);
  const alignedDays = recentDays.filter((day) => day.status === alignedStatus).length;
  const todayStatus = recentDays.find((day) => day.isToday)?.status;

  return {
    ...habit,
    recentDays,
    alignedDays,
    targetProgress: getTargetProgress(habit.targetPerWeek, alignedDays),
    streak: getStreak(habit.type, habit.historyDays),
    todayStatus:
      todayStatus === "COMPLETED" || todayStatus === "SKIPPED"
        ? todayStatus
        : null,
    trendWeeks: buildTrendWeeks(habit.historyDays, habit.type, habit.targetPerWeek),
  };
}

function buildSummary(habits: HabitItem[]) {
  const onTrackToday = habits.filter((habit) => {
    if (!habit.todayStatus) {
      return false;
    }

    return habit.todayStatus === getAlignedStatus(habit.type);
  }).length;

  const totalAlignedDays = habits.reduce((sum, habit) => sum + habit.alignedDays, 0);
  const totalPossibleDays = habits.length * 7;

  return {
    activeHabits: habits.length,
    onTrackToday,
    weeklyConsistencyRate: totalPossibleDays
      ? Math.round((totalAlignedDays / totalPossibleDays) * 100)
      : 0,
    bestStreak: habits.reduce((best, habit) => Math.max(best, habit.streak), 0),
  };
}

function applyOptimisticLog(
  data: HabitsPageData,
  habitId: string,
  status: HabitLogStatusValue | null
) {
  const updateHabit = (habit: HabitItem) => {
    if (habit.id !== habitId) {
      return habit;
    }

    return recalculateHabit({
      ...habit,
      historyDays: habit.historyDays.map((day) =>
        day.isToday ? { ...day, status: status ?? "PENDING" } : day
      ),
    });
  };

  const positiveHabits = data.positiveHabits.map(updateHabit);
  const negativeHabits = data.negativeHabits.map(updateHabit);

  return {
    ...data,
    positiveHabits,
    negativeHabits,
    summary: buildSummary([...positiveHabits, ...negativeHabits]),
  };
}

function getPrimaryActionLabel(type: HabitTypeValue) {
  return type === "POSITIVE" ? "Completed" : "Occurred";
}

function getSecondaryActionLabel(type: HabitTypeValue) {
  return type === "POSITIVE" ? "Skipped" : "Avoided";
}

function getTargetLabel(type: HabitTypeValue) {
  return type === "POSITIVE" ? "Completion target" : "Avoidance target";
}

function getTargetValueLabel(habit: HabitItem) {
  return habit.type === "POSITIVE"
    ? `${habit.targetPerWeek} completed days`
    : `${habit.targetPerWeek} avoided days`;
}

function getTodayStatusLabel(habit: HabitItem) {
  if (!habit.todayStatus) {
    return "Not logged today";
  }

  if (habit.type === "POSITIVE") {
    return habit.todayStatus === "COMPLETED" ? "Completed today" : "Skipped today";
  }

  return habit.todayStatus === "SKIPPED" ? "Avoided today" : "Occurred today";
}

function getAlignmentCopy(type: HabitTypeValue, alignedDays: number) {
  return type === "POSITIVE"
    ? `${alignedDays} completed day${alignedDays === 1 ? "" : "s"} this week`
    : `${alignedDays} avoided day${alignedDays === 1 ? "" : "s"} this week`;
}

function getDayCellClassName(type: HabitTypeValue, day: HabitDayCell) {
  const aligned = day.status === getAlignedStatus(type);

  return cn(
    "flex h-12 flex-col items-center justify-center rounded-[16px] border text-[11px] font-medium transition",
    day.status === "PENDING" && "border-border/40 bg-background/35 text-muted-foreground",
    day.status !== "PENDING" && aligned && "border-primary/30 bg-primary/12 text-foreground",
    day.status !== "PENDING" && !aligned && "border-border/50 bg-card/80 text-muted-foreground",
    day.isToday && "ring-1 ring-primary/30"
  );
}

function HabitSection({
  title,
  description,
  habits,
  onEdit,
  onArchive,
  onLog,
  isPending,
}: {
  title: string;
  description: string;
  habits: HabitItem[];
  onEdit: (habit: HabitItem) => void;
  onArchive: (habit: HabitItem) => void;
  onLog: (habit: HabitItem, status: HabitLogStatusValue | null) => void;
  isPending: boolean;
}) {
  return (
    <Card className="rounded-[32px] border-border/40 bg-card/70">
      <CardHeader>
        <CardDescription>{title}</CardDescription>
        <CardTitle className="text-2xl text-foreground">{description}</CardTitle>
      </CardHeader>
      <CardContent>
        {habits.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {habits.map((habit) => {
              const completedLabel = getPrimaryActionLabel(habit.type);
              const skippedLabel = getSecondaryActionLabel(habit.type);

              return (
                <div
                  key={habit.id}
                  data-testid={`habit-card-${habit.id}`}
                  className="rounded-[28px] border border-border/40 bg-background/35 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold tracking-tight text-foreground">
                          {habit.name}
                        </p>
                        <Badge variant="outline" className="border-border/40 bg-transparent capitalize">
                          {formatCategoryLabel(habit.category)}
                        </Badge>
                        <Badge
                          variant="outline"
                          className={cn(
                            "border-border/40 bg-transparent",
                            habit.type === "POSITIVE" && "text-foreground",
                            habit.type === "NEGATIVE" && "text-muted-foreground"
                          )}
                        >
                          {getTodayStatusLabel(habit)}
                        </Badge>
                      </div>
                      {habit.notes ? (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">{habit.notes}</p>
                      ) : (
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                          {habit.type === "POSITIVE"
                            ? "Track the habits that create steadier, more supportive days."
                            : "Track the destabilizing patterns you want to interrupt earlier."}
                        </p>
                      )}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-2xl font-semibold tracking-tight text-foreground">
                        {habit.targetProgress}%
                      </p>
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        toward weekly target
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-[22px] border border-border/40 bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        {getTargetLabel(habit.type)}
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {getTargetValueLabel(habit)}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-border/40 bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        Momentum
                      </p>
                      <p className="mt-2 text-xl font-semibold text-foreground">
                        {habit.streak} day{habit.streak === 1 ? "" : "s"}
                      </p>
                    </div>
                    <div className="rounded-[22px] border border-border/40 bg-card/70 p-4">
                      <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">
                        This week
                      </p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        {getAlignmentCopy(habit.type, habit.alignedDays)}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">Recent days</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        Last 7 days
                      </p>
                    </div>
                    <div className="grid grid-cols-7 gap-2">
                      {habit.recentDays.map((day) => (
                        <div key={day.dayIso} className={getDayCellClassName(habit.type, day)} title={day.label}>
                          <span className="text-[10px] uppercase tracking-[0.18em]">{day.shortLabel}</span>
                          <span className="mt-1 text-[10px] text-muted-foreground">
                            {day.status === "PENDING" ? "-" : day.status === "COMPLETED" ? "C" : "S"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">Monthly rhythm</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                        4-week target trend
                      </p>
                    </div>
                    <div className="grid gap-3 sm:grid-cols-4">
                      {habit.trendWeeks.map((week) => (
                        <div
                          key={`${habit.id}-${week.label}`}
                          className="rounded-[18px] border border-border/40 bg-card/70 p-3"
                        >
                          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                            {week.label}
                          </p>
                          <div className="mt-3 h-2 rounded-full bg-background/55">
                            <div
                              className={cn(
                                "h-2 rounded-full transition-all",
                                week.targetHit ? "bg-primary" : "bg-primary/45"
                              )}
                              style={{ width: `${week.progress}%` }}
                            />
                          </div>
                          <p className="mt-3 text-sm font-medium text-foreground">
                            {week.alignedDays}/{habit.targetPerWeek}
                          </p>
                          <p className="mt-1 text-xs leading-5 text-muted-foreground">
                            {habit.type === "POSITIVE"
                              ? `${week.loggedDays} logged, ${week.alignedDays} completed`
                              : `${week.loggedDays} logged, ${week.alignedDays} avoided`}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="rounded-full"
                      variant={habit.todayStatus === "COMPLETED" ? "default" : "outline"}
                      disabled={isPending}
                      onClick={() => onLog(habit, "COMPLETED")}
                    >
                      <Check className="size-4" />
                      {completedLabel}
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full"
                      variant={habit.todayStatus === "SKIPPED" ? "default" : "outline"}
                      disabled={isPending}
                      onClick={() => onLog(habit, "SKIPPED")}
                    >
                      <X className="size-4" />
                      {skippedLabel}
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => onLog(habit, null)}
                    >
                      Clear
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => onEdit(habit)}
                    >
                      <Pencil className="size-4" />
                      Edit
                    </Button>
                    <Button
                      type="button"
                      className="rounded-full text-muted-foreground"
                      variant="ghost"
                      disabled={isPending}
                      onClick={() => onArchive(habit)}
                    >
                      <Archive className="size-4" />
                      Archive
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-border/40 bg-background/35 p-5 text-sm leading-6 text-muted-foreground">
            No habits in this section yet. Add one and start logging today to build consistency data.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function HabitsWorkspace({ data }: HabitsWorkspaceProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [formState, setFormState] = useState<HabitFormState>(() => createHabitFormState());
  const [optimisticData, setOptimisticData] = useOptimistic(data);

  const allHabits = [...optimisticData.positiveHabits, ...optimisticData.negativeHabits];

  function openCreateSheet(type: HabitTypeValue = "POSITIVE") {
    setFormState({
      ...createHabitFormState(),
      type,
    });
    setIsSheetOpen(true);
  }

  function openEditSheet(habit: HabitItem) {
    setFormState(createHabitFormState(habit));
    setIsSheetOpen(true);
  }

  function closeSheet(open: boolean) {
    setIsSheetOpen(open);

    if (!open) {
      setFormState(createHabitFormState());
    }
  }

  function handleSubmitHabit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    startTransition(async () => {
      try {
        await upsertHabitAction({
          id: formState.id,
          name: formState.name,
          category: formState.category,
          type: formState.type,
          targetPerWeek: Number(formState.targetPerWeek),
          notes: formState.notes,
        });

        toast.success(formState.id ? "Habit updated." : "Habit created.");
        closeSheet(false);
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to save habit.");
      }
    });
  }

  function handleArchiveHabit(habit: HabitItem) {
    startTransition(async () => {
      try {
        await archiveHabitAction({ id: habit.id });
        toast.success("Habit archived.");
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Unable to archive habit.");
      }
    });
  }

  function handleLogHabit(habit: HabitItem, status: HabitLogStatusValue | null) {
    const previousData = optimisticData;

    startTransition(async () => {
      setOptimisticData((current) => applyOptimisticLog(current, habit.id, status));

      try {
        await upsertHabitLogAction({
          habitId: habit.id,
          status,
        });

        toast.success(status == null ? "Habit log cleared." : "Habit log updated.");
        router.refresh();
      } catch (error) {
        setOptimisticData(previousData);
        toast.error(error instanceof Error ? error.message : "Unable to update habit log.");
      }
    });
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
        <PageIntro
          eyebrow="Habit tracking"
          title="Build what steadies you, interrupt what drains you."
          description="Cadence separates supportive and destabilizing habits so daily logging stays fast while the insight layer can distinguish what helps from what lingers underneath the surface."
        />
        <div className="flex flex-wrap gap-3">
          <Badge variant="outline" className="rounded-full border-border/40 px-3 py-1 text-[11px] uppercase tracking-[0.22em]">
            {optimisticData.dataSource === "mock" ? "Mock preview" : "Database connected"}
          </Badge>
          <Button type="button" className="rounded-full" onClick={() => openCreateSheet("POSITIVE")}>
            <Plus className="size-4" />
            Add habit
          </Button>
          <Button type="button" variant="outline" className="rounded-full" onClick={() => openCreateSheet("NEGATIVE")}>
            <Plus className="size-4" />
            Add limiting habit
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card className="rounded-[28px] border-border/40 bg-card/70">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-border/40 bg-background/45 p-2.5">
                <Target className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Active habits</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{optimisticData.summary.activeHabits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-border/40 bg-card/70">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-border/40 bg-background/45 p-2.5">
                <Check className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">On track today</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{optimisticData.summary.onTrackToday}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-border/40 bg-card/70">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-border/40 bg-background/45 p-2.5">
                <TrendingUp className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Weekly consistency</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {optimisticData.summary.weeklyConsistencyRate}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="rounded-[28px] border-border/40 bg-card/70">
          <CardContent className="p-5">
            <div className="flex items-center gap-3">
              <div className="rounded-full border border-border/40 bg-background/45 p-2.5">
                <Sparkles className="size-4 text-primary" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.22em] text-muted-foreground">Best streak</p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">{optimisticData.summary.bestStreak}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <HabitSection
        title="Supportive habits"
        description="The rituals that usually make the day steadier."
        habits={optimisticData.positiveHabits}
        onEdit={openEditSheet}
        onArchive={handleArchiveHabit}
        onLog={handleLogHabit}
        isPending={isPending}
      />

      <HabitSection
        title="Limiting habits"
        description="The patterns you want to interrupt before they spill into mood."
        habits={optimisticData.negativeHabits}
        onEdit={openEditSheet}
        onArchive={handleArchiveHabit}
        onLog={handleLogHabit}
        isPending={isPending}
      />

      {!allHabits.length ? (
        <Card className="rounded-[32px] border-border/40 bg-card/70">
          <CardContent className="p-6 text-sm leading-6 text-muted-foreground">
            You do not have any habits yet. Start with one supportive ritual and one limiting pattern so Cadence can begin to compare behavior against mood.
          </CardContent>
        </Card>
      ) : null}

      <Sheet open={isSheetOpen} onOpenChange={closeSheet}>
        <SheetContent className="w-full border-border/40 bg-card/95 sm:max-w-xl">
          <form className="flex h-full flex-col" onSubmit={handleSubmitHabit}>
            <SheetHeader>
              <SheetTitle>{formState.id ? "Edit habit" : "Add a habit"}</SheetTitle>
              <SheetDescription>
                Define the habit once, then log it daily without rebuilding the context every time.
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 space-y-5 overflow-y-auto px-4 pb-4">
              <div className="space-y-2">
                <Label htmlFor="habitName">Name</Label>
                <Input
                  id="habitName"
                  value={formState.name}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, name: event.target.value }))
                  }
                  placeholder="Morning walk"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="habitCategory">Category</Label>
                  <select
                    id="habitCategory"
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={formState.category}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        category: event.target.value as HabitCategoryValue,
                      }))
                    }
                  >
                    {CATEGORY_OPTIONS.map((category) => (
                      <option key={category} value={category} className="bg-card text-foreground">
                        {formatCategoryLabel(category)}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="habitType">Type</Label>
                  <select
                    id="habitType"
                    className="h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
                    value={formState.type}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        type: event.target.value as HabitTypeValue,
                      }))
                    }
                  >
                    <option value="POSITIVE" className="bg-card text-foreground">
                      Supportive
                    </option>
                    <option value="NEGATIVE" className="bg-card text-foreground">
                      Limiting
                    </option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="habitTarget">
                  {formState.type === "POSITIVE"
                    ? "Target completed days per week"
                    : "Target avoided days per week"}
                </Label>
                <Input
                  id="habitTarget"
                  type="number"
                  min={1}
                  max={14}
                  value={formState.targetPerWeek}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      targetPerWeek: event.target.value,
                    }))
                  }
                />
                <p className="text-xs leading-5 text-muted-foreground">
                  {formState.type === "POSITIVE"
                    ? "Use the number of days you want to actively complete this habit each week."
                    : "Use the number of days you want to successfully avoid this habit each week."}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="habitNotes">Notes</Label>
                <Textarea
                  id="habitNotes"
                  className="min-h-28"
                  value={formState.notes}
                  onChange={(event) =>
                    setFormState((current) => ({ ...current, notes: event.target.value }))
                  }
                  placeholder="Why this habit matters, or what tends to derail it."
                />
              </div>
            </div>

            <SheetFooter className="border-t border-border/40 bg-background/40">
              <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-muted-foreground">
                    {formState.type === "POSITIVE"
                      ? "Supportive habits count as aligned when completed."
                      : "Limiting habits count as aligned when avoided rather than when they occur."}
                </div>
                <div className="flex flex-wrap justify-end gap-3">
                  <Button type="button" variant="outline" className="rounded-full" onClick={() => closeSheet(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" className="rounded-full" disabled={isPending}>
                    {formState.id ? "Save changes" : "Create habit"}
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