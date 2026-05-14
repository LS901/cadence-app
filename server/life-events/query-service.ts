import { Prisma } from "@prisma/client";
import type {
  LifeEventsContextData,
  LifeEventItem,
  LifeEventsPageData,
} from "@/features/life-events/types";
import {
  formatLifeEventWindow,
  getLifeEventCategoryLabel,
  getLifeEventRecurrenceLabel,
  getLifeEventSentimentLabel,
  getLifeEventSeverityLabel,
  isLifeEventActive,
} from "@/lib/life-events";
import { mockLifeEvents, type MockLifeEvent } from "@/lib/data/mock-cadence";
import { buildLifeEventDayExposureRows } from "@/server/life-events/day-exposures";
import type {
  AnalyticsLifeEvent,
  AnalyticsLifeEventDayExposure,
} from "@/server/insights/types";

export type LifeEventRecord = {
  id: string;
  userId: string;
  recurrenceSeriesId: string | null;
  title: string;
  category: string;
  customCategoryLabel: string | null;
  description: string | null;
  severityScore: number;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED" | null;
  startAt: Date;
  endAt: Date | null;
  isOngoing: boolean;
  source: "MANUAL" | "RECURRING_GENERATED" | "IMPORTED";
  tags: string[];
  recurrenceSeries: {
    title: string;
    recurrencePattern: "DAILY" | "WEEKLY" | "MONTHLY" | "CUSTOM";
    recurrenceInterval: number | null;
    recurrenceRule: string | null;
  } | null;
};

export type LifeEventDayExposureRecord = {
  id?: string;
  userId: string;
  lifeEventId: string;
  day: Date;
  overlapMinutes: number;
  overlapRatio: number;
  severityScore: number;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED" | null;
  weightedImpact: number;
  category: string;
  tags: string[];
};

type LifeEventQueryDependencies = {
  hasLifeEventDatabase: boolean;
  hasExposureDatabase: boolean;
  buildMockLifeEventRecords: () => LifeEventRecord[];
  findLifeEventRecords: (userId: string) => Promise<LifeEventRecord[]>;
  findLifeEventDayExposureRecords: (userId: string) => Promise<LifeEventDayExposureRecord[]>;
  now?: () => Date;
};

function mapLifeEvent(record: LifeEventRecord): LifeEventItem {
  return {
    id: record.id,
    title: record.title,
    category: record.category as LifeEventItem["category"],
    categoryLabel:
      record.category === "CUSTOM" && record.customCategoryLabel
        ? record.customCategoryLabel
        : getLifeEventCategoryLabel(record.category),
    customCategoryLabel: record.customCategoryLabel,
    description: record.description,
    severityScore: record.severityScore,
    severityLabel: getLifeEventSeverityLabel(record.severityScore),
    sentiment: record.sentiment,
    sentimentLabel: getLifeEventSentimentLabel(record.sentiment),
    startAtIso: record.startAt.toISOString(),
    endAtIso: record.endAt?.toISOString() ?? null,
    isOngoing: record.isOngoing,
    source: record.source,
    isRecurring: Boolean(record.recurrenceSeriesId),
    recurrencePattern: record.recurrenceSeries?.recurrencePattern ?? null,
    recurrenceInterval: record.recurrenceSeries?.recurrenceInterval ?? null,
    recurrenceRule: record.recurrenceSeries?.recurrenceRule ?? null,
    recurrenceLabel: getLifeEventRecurrenceLabel(
      record.recurrenceSeries?.recurrencePattern,
      record.recurrenceSeries?.recurrenceInterval,
      record.recurrenceSeries?.recurrenceRule
    ),
    seriesTitle: record.recurrenceSeries?.title ?? null,
    tags: record.tags,
    windowLabel: formatLifeEventWindow(record),
  };
}

function mapAnalyticsLifeEvent(record: LifeEventRecord): AnalyticsLifeEvent {
  return {
    id: record.id,
    userId: record.userId,
    title: record.title,
    category: record.category,
    severityScore: record.severityScore,
    sentiment: record.sentiment,
    startAt: record.startAt,
    endAt: record.endAt,
    isOngoing: record.isOngoing,
    tags: record.tags,
  };
}

function sortLifeEventRecords(records: LifeEventRecord[]) {
  return [...records].sort((left, right) => right.startAt.getTime() - left.startAt.getTime());
}

function isRecoverablePrismaError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  );
}

export function buildMockLifeEventRecordsFromEvents(events: MockLifeEvent[]): LifeEventRecord[] {
  return events.map((event) => ({
    ...event,
    customCategoryLabel: event.customCategoryLabel ?? null,
    description: event.description ?? null,
    sentiment: event.sentiment ?? null,
    endAt: event.endAt ?? null,
    recurrenceSeriesId: null,
    source: "MANUAL" as const,
    recurrenceSeries: null,
  }));
}

export function buildMockLifeEventRecords(): LifeEventRecord[] {
  return buildMockLifeEventRecordsFromEvents(mockLifeEvents);
}

export function buildLifeEventsContextData(
  source: "mock" | "database",
  records: LifeEventRecord[],
  now = new Date()
): LifeEventsContextData {
  const lifeEvents = sortLifeEventRecords(records).slice(0, 12).map(mapLifeEvent);

  return {
    dataSource: source,
    lifeEvents,
    summary: {
      totalEvents: records.length,
      activeEvents: records.filter((record) => isLifeEventActive(record, now)).length,
      ongoingEvents: records.filter((record) => record.isOngoing).length,
      highSeverityEvents: records.filter((record) => record.severityScore >= 4).length,
      negativeEvents: records.filter((record) => record.sentiment === "NEGATIVE").length,
    },
  };
}

async function loadLifeEventRecordsWithDependencies(
  userId: string,
  dependencies: LifeEventQueryDependencies
) {
  if (!dependencies.hasLifeEventDatabase) {
    return {
      dataSource: "mock" as const,
      records: dependencies.buildMockLifeEventRecords(),
    };
  }

  try {
    return {
      dataSource: "database" as const,
      records: await dependencies.findLifeEventRecords(userId),
    };
  } catch (error) {
    if (isRecoverablePrismaError(error)) {
      return {
        dataSource: "mock" as const,
        records: dependencies.buildMockLifeEventRecords(),
      };
    }

    throw error;
  }
}

async function loadLifeEventDayExposureRecordsWithDependencies(
  userId: string,
  dependencies: LifeEventQueryDependencies
) {
  if (!dependencies.hasExposureDatabase) {
    return {
      dataSource: "mock" as const,
      records: buildLifeEventDayExposureRows(dependencies.buildMockLifeEventRecords()),
    };
  }

  try {
    return {
      dataSource: "database" as const,
      records: await dependencies.findLifeEventDayExposureRecords(userId),
    };
  } catch (error) {
    if (isRecoverablePrismaError(error)) {
      return {
        dataSource: "mock" as const,
        records: buildLifeEventDayExposureRows(dependencies.buildMockLifeEventRecords()),
      };
    }

    throw error;
  }
}

export async function getLifeEventsContextDataWithDependencies(
  userId: string,
  dependencies: LifeEventQueryDependencies
): Promise<LifeEventsContextData> {
  const { dataSource, records } = await loadLifeEventRecordsWithDependencies(userId, dependencies);
  return buildLifeEventsContextData(dataSource, records, dependencies.now?.());
}

export async function getLifeEventItemsWithDependencies(
  userId: string,
  limit: number,
  dependencies: LifeEventQueryDependencies
): Promise<LifeEventItem[]> {
  const { records } = await loadLifeEventRecordsWithDependencies(userId, dependencies);

  return sortLifeEventRecords(records).slice(0, limit).map(mapLifeEvent);
}

export async function getLifeEventsPageDataWithDependencies(
  userId: string,
  dependencies: LifeEventQueryDependencies
): Promise<LifeEventsPageData> {
  const { dataSource, records } = await loadLifeEventRecordsWithDependencies(userId, dependencies);
  const now = dependencies.now?.() ?? new Date();
  const sortedRecords = sortLifeEventRecords(records);
  const activeLifeEvents = sortedRecords.filter((record) => isLifeEventActive(record, now)).map(mapLifeEvent);
  const recentLifeEvents = sortedRecords
    .filter((record) => !isLifeEventActive(record, now))
    .slice(0, 16)
    .map(mapLifeEvent);

  return {
    dataSource,
    summary: buildLifeEventsContextData(dataSource, records, now).summary,
    activeLifeEvents,
    recentLifeEvents,
    allLifeEvents: sortedRecords.map(mapLifeEvent),
  };
}

export async function getAnalyticsLifeEventsWithDependencies(
  userId: string,
  dependencies: LifeEventQueryDependencies
): Promise<AnalyticsLifeEvent[]> {
  const { records } = await loadLifeEventRecordsWithDependencies(userId, dependencies);
  return records.map(mapAnalyticsLifeEvent);
}

export async function getAnalyticsLifeEventDayExposuresWithDependencies(
  userId: string,
  dependencies: LifeEventQueryDependencies
): Promise<AnalyticsLifeEventDayExposure[]> {
  const { records } = await loadLifeEventDayExposureRecordsWithDependencies(userId, dependencies);

  return records.map((record) => ({
    id: "id" in record && record.id ? record.id : `${record.lifeEventId}-${record.day.toISOString().slice(0, 10)}`,
    userId: record.userId,
    lifeEventId: record.lifeEventId,
    day: record.day,
    overlapMinutes: record.overlapMinutes,
    overlapRatio: record.overlapRatio,
    severityScore: record.severityScore,
    sentiment: record.sentiment,
    weightedImpact: record.weightedImpact,
    category: record.category,
    tags: record.tags,
  }));
}