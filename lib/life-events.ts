import { endOfDay, format, isSameDay, startOfDay } from "date-fns";

export const LIFE_EVENT_CATEGORY_OPTIONS = [
  { value: "ILLNESS", label: "Illness" },
  { value: "GRIEF_LOSS", label: "Grief or loss" },
  { value: "FAMILY_STRESS", label: "Family stress" },
  { value: "RELATIONSHIP_STRESS", label: "Relationship stress" },
  { value: "FINANCIAL_STRESS", label: "Financial stress" },
  { value: "BURNOUT", label: "Burnout" },
  { value: "TRAVEL", label: "Travel" },
  { value: "HORMONAL_HEALTH", label: "Hormonal or health fluctuation" },
  { value: "MAJOR_POSITIVE", label: "Major positive event" },
  { value: "TRANSITION", label: "Life transition" },
  { value: "CUSTOM", label: "Custom" },
  { value: "OTHER", label: "Other" },
] as const;

export const LIFE_EVENT_SENTIMENT_OPTIONS = [
  { value: "NEGATIVE", label: "Weighting the day" },
  { value: "NEUTRAL", label: "Context only" },
  { value: "POSITIVE", label: "Supportive or uplifting" },
  { value: "MIXED", label: "Mixed" },
] as const;

export const LIFE_EVENT_SEVERITY_OPTIONS = [
  { value: 1, label: "Light" },
  { value: 2, label: "Noticeable" },
  { value: 3, label: "Heavy" },
  { value: 4, label: "Dominant" },
  { value: 5, label: "All-day overriding" },
] as const;

export const LIFE_EVENT_RECURRENCE_OPTIONS = [
  { value: "DAILY", label: "Daily" },
  { value: "WEEKLY", label: "Weekly" },
  { value: "MONTHLY", label: "Monthly" },
  { value: "CUSTOM", label: "Custom" },
] as const;

export type LifeEventCategoryValue = (typeof LIFE_EVENT_CATEGORY_OPTIONS)[number]["value"];
export type LifeEventSentimentValue = (typeof LIFE_EVENT_SENTIMENT_OPTIONS)[number]["value"];
export type LifeEventRecurrencePatternValue = (typeof LIFE_EVENT_RECURRENCE_OPTIONS)[number]["value"];
export type LifeEventSourceValue = "MANUAL" | "RECURRING_GENERATED" | "IMPORTED";

export type LifeEventTimelinePoint = {
  day: string;
  dateIso: string;
  activeCount: number;
  totalSeverity: number;
  dominantTitle: string | null;
  dominantSentiment: LifeEventSentimentValue | null;
};

type LifeEventWindowLike = {
  startAt: Date;
  endAt: Date | null;
  isOngoing: boolean;
};

type LifeEventTimelineEventLike = LifeEventWindowLike & {
  title: string;
  severityScore: number;
  sentiment: LifeEventSentimentValue | null;
};

export function getLifeEventCategoryLabel(value: string) {
  return LIFE_EVENT_CATEGORY_OPTIONS.find((option) => option.value === value)?.label ?? "Other";
}

export function getLifeEventSentimentLabel(value: string | null | undefined) {
  return LIFE_EVENT_SENTIMENT_OPTIONS.find((option) => option.value === value)?.label ?? "Unspecified";
}

export function getLifeEventSeverityLabel(value: number) {
  return LIFE_EVENT_SEVERITY_OPTIONS.find((option) => option.value === value)?.label ?? "Context";
}

export function getLifeEventRecurrenceLabel(
  value: string | null | undefined,
  interval?: number | null,
  rule?: string | null
) {
  if (value === "CUSTOM") {
    return rule?.trim() || "Custom cadence";
  }

  const label = LIFE_EVENT_RECURRENCE_OPTIONS.find((option) => option.value === value)?.label;

  if (!label) {
    return null;
  }

  if (!interval || interval <= 1) {
    return label;
  }

  const unit = value === "DAILY" ? "day" : value === "WEEKLY" ? "week" : "month";
  return `Every ${interval} ${unit}s`;
}

export function isLifeEventActive(event: LifeEventWindowLike, at = new Date()) {
  if (event.isOngoing) {
    return event.startAt <= at;
  }

  const eventEnd = event.endAt ?? event.startAt;

  return event.startAt <= at && eventEnd >= at;
}

export function formatLifeEventWindow(event: LifeEventWindowLike) {
  if (event.isOngoing) {
    return `Ongoing since ${format(event.startAt, "MMM d, yyyy")}`;
  }

  if (!event.endAt) {
    return format(event.startAt, "MMM d, yyyy · h:mm a");
  }

  if (isSameDay(event.startAt, event.endAt)) {
    return `${format(event.startAt, "MMM d, yyyy")} · ${format(event.startAt, "h:mm a")} to ${format(event.endAt, "h:mm a")}`;
  }

  return `${format(event.startAt, "MMM d")} to ${format(event.endAt, "MMM d, yyyy")}`;
}

export function lifeEventOverlapsDay(event: LifeEventWindowLike, day: Date) {
  const dayStart = startOfDay(day);
  const dayEnd = endOfDay(day);
  const eventEnd = event.isOngoing ? new Date(8640000000000000) : event.endAt ?? event.startAt;

  return event.startAt <= dayEnd && eventEnd >= dayStart;
}

export function buildLifeEventTimeline(
  days: Array<{ day: string; date: Date }>,
  events: LifeEventTimelineEventLike[]
): LifeEventTimelinePoint[] {
  return days.map(({ day, date }) => {
    const overlappingEvents = events.filter((event) => lifeEventOverlapsDay(event, date));
    const dominantEvent = [...overlappingEvents].sort((left, right) => right.severityScore - left.severityScore)[0] ?? null;

    return {
      day,
      dateIso: date.toISOString(),
      activeCount: overlappingEvents.length,
      totalSeverity: overlappingEvents.reduce((sum, event) => sum + event.severityScore, 0),
      dominantTitle: dominantEvent?.title ?? null,
      dominantSentiment: dominantEvent?.sentiment ?? null,
    };
  });
}