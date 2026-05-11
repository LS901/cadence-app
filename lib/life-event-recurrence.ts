import { addDays, addMonths, addWeeks } from "date-fns";
import type {
  LifeEventCategoryValue,
  LifeEventRecurrencePatternValue,
  LifeEventSentimentValue,
} from "@/lib/life-events";

export const RECURRING_HORIZON_DAYS = 120;
export const RECURRING_OCCURRENCE_LIMIT = 16;

export type LifeEventRecurrencePayload = {
  title: string;
  category: LifeEventCategoryValue;
  customCategoryLabel: string | null;
  description: string | null;
  severityScore: number;
  sentiment: LifeEventSentimentValue | null;
  startAt: Date;
  endAt: Date | null;
  isOngoing: boolean;
  tags: string[];
};

export type RecurrenceConfig = {
  pattern: LifeEventRecurrencePatternValue;
  interval: number;
  rule: string | null;
};

export function getNextOccurrenceStart(startAt: Date, recurrenceConfig: RecurrenceConfig) {
  if (recurrenceConfig.pattern === "DAILY") {
    return addDays(startAt, recurrenceConfig.interval);
  }

  if (recurrenceConfig.pattern === "WEEKLY") {
    return addWeeks(startAt, recurrenceConfig.interval);
  }

  if (recurrenceConfig.pattern === "MONTHLY") {
    return addMonths(startAt, recurrenceConfig.interval);
  }

  return null;
}

export function buildRecurringOccurrences(options: {
  userId: string;
  recurrenceSeriesId: string;
  payload: LifeEventRecurrencePayload;
  recurrenceConfig: RecurrenceConfig;
  horizonDays?: number;
  limit?: number;
}) {
  if (options.recurrenceConfig.pattern === "CUSTOM") {
    return [];
  }

  const durationMilliseconds =
    options.payload.endAt != null
      ? options.payload.endAt.getTime() - options.payload.startAt.getTime()
      : 0;
  const horizonDate = addDays(options.payload.startAt, options.horizonDays ?? RECURRING_HORIZON_DAYS);
  const generatedOccurrences: Array<LifeEventRecurrencePayload & {
    userId: string;
    recurrenceSeriesId: string;
    source: "RECURRING_GENERATED";
  }> = [];
  let cursorStart = options.payload.startAt;

  while (generatedOccurrences.length < (options.limit ?? RECURRING_OCCURRENCE_LIMIT)) {
    const nextStart = getNextOccurrenceStart(cursorStart, options.recurrenceConfig);

    if (!nextStart || nextStart > horizonDate) {
      break;
    }

    generatedOccurrences.push({
      userId: options.userId,
      recurrenceSeriesId: options.recurrenceSeriesId,
      source: "RECURRING_GENERATED",
      ...options.payload,
      startAt: nextStart,
      endAt: options.payload.endAt ? new Date(nextStart.getTime() + durationMilliseconds) : null,
      isOngoing: false,
    });

    cursorStart = nextStart;
  }

  return generatedOccurrences;
}