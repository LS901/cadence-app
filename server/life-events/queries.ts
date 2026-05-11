import type { LifeEventsContextData, LifeEventItem, LifeEventsPageData } from "@/features/life-events/types";
import { demoUser } from "@/lib/data/mock-cadence";
import { db, hasDatabaseUrl } from "@/lib/db";
import type { AnalyticsLifeEvent, AnalyticsLifeEventDayExposure } from "@/server/insights/types";
import {
  buildMockLifeEventRecords,
  getAnalyticsLifeEventsWithDependencies,
  getAnalyticsLifeEventDayExposuresWithDependencies,
  getLifeEventItemsWithDependencies,
  getLifeEventsContextDataWithDependencies,
  getLifeEventsPageDataWithDependencies,
  type LifeEventDayExposureRecord,
  type LifeEventRecord,
} from "./query-service";

export async function getLifeEventsContextData(userId = demoUser.id): Promise<LifeEventsContextData> {
  return getLifeEventsContextDataWithDependencies(userId, {
    hasLifeEventDatabase: hasDatabaseUrl && Boolean(db?.lifeEvent),
    hasExposureDatabase: hasDatabaseUrl && Boolean(db?.lifeEventDayExposure),
    buildMockLifeEventRecords,
    findLifeEventRecords: async (currentUserId) => {
      return (await db!.lifeEvent.findMany({
        where: { userId: currentUserId },
        include: {
          recurrenceSeries: {
            select: {
              title: true,
              recurrencePattern: true,
              recurrenceInterval: true,
              recurrenceRule: true,
            },
          },
        },
        orderBy: [{ startAt: "desc" }, { updatedAt: "desc" }],
        take: 40,
      })) as LifeEventRecord[];
    },
    findLifeEventDayExposureRecords: async (currentUserId) => {
      return (await db!.lifeEventDayExposure.findMany({
        where: { userId: currentUserId },
        orderBy: [{ day: "asc" }],
        take: 180,
      })) as LifeEventDayExposureRecord[];
    },
  });
}

export async function getLifeEventItems(userId = demoUser.id, limit = 40): Promise<LifeEventItem[]> {
  return getLifeEventItemsWithDependencies(userId, limit, {
    hasLifeEventDatabase: hasDatabaseUrl && Boolean(db?.lifeEvent),
    hasExposureDatabase: hasDatabaseUrl && Boolean(db?.lifeEventDayExposure),
    buildMockLifeEventRecords,
    findLifeEventRecords: async (currentUserId) => {
      return (await db!.lifeEvent.findMany({
        where: { userId: currentUserId },
        include: {
          recurrenceSeries: {
            select: {
              title: true,
              recurrencePattern: true,
              recurrenceInterval: true,
              recurrenceRule: true,
            },
          },
        },
        orderBy: [{ startAt: "desc" }, { updatedAt: "desc" }],
        take: 40,
      })) as LifeEventRecord[];
    },
    findLifeEventDayExposureRecords: async (currentUserId) => {
      return (await db!.lifeEventDayExposure.findMany({
        where: { userId: currentUserId },
        orderBy: [{ day: "asc" }],
        take: 180,
      })) as LifeEventDayExposureRecord[];
    },
  });
}

export async function getLifeEventsPageData(userId = demoUser.id): Promise<LifeEventsPageData> {
  return getLifeEventsPageDataWithDependencies(userId, {
    hasLifeEventDatabase: hasDatabaseUrl && Boolean(db?.lifeEvent),
    hasExposureDatabase: hasDatabaseUrl && Boolean(db?.lifeEventDayExposure),
    buildMockLifeEventRecords,
    findLifeEventRecords: async (currentUserId) => {
      return (await db!.lifeEvent.findMany({
        where: { userId: currentUserId },
        include: {
          recurrenceSeries: {
            select: {
              title: true,
              recurrencePattern: true,
              recurrenceInterval: true,
              recurrenceRule: true,
            },
          },
        },
        orderBy: [{ startAt: "desc" }, { updatedAt: "desc" }],
        take: 40,
      })) as LifeEventRecord[];
    },
    findLifeEventDayExposureRecords: async (currentUserId) => {
      return (await db!.lifeEventDayExposure.findMany({
        where: { userId: currentUserId },
        orderBy: [{ day: "asc" }],
        take: 180,
      })) as LifeEventDayExposureRecord[];
    },
  });
}

export async function getAnalyticsLifeEvents(userId = demoUser.id): Promise<AnalyticsLifeEvent[]> {
  return getAnalyticsLifeEventsWithDependencies(userId, {
    hasLifeEventDatabase: hasDatabaseUrl && Boolean(db?.lifeEvent),
    hasExposureDatabase: hasDatabaseUrl && Boolean(db?.lifeEventDayExposure),
    buildMockLifeEventRecords,
    findLifeEventRecords: async (currentUserId) => {
      return (await db!.lifeEvent.findMany({
        where: { userId: currentUserId },
        include: {
          recurrenceSeries: {
            select: {
              title: true,
              recurrencePattern: true,
              recurrenceInterval: true,
              recurrenceRule: true,
            },
          },
        },
        orderBy: [{ startAt: "desc" }, { updatedAt: "desc" }],
        take: 40,
      })) as LifeEventRecord[];
    },
    findLifeEventDayExposureRecords: async (currentUserId) => {
      return (await db!.lifeEventDayExposure.findMany({
        where: { userId: currentUserId },
        orderBy: [{ day: "asc" }],
        take: 180,
      })) as LifeEventDayExposureRecord[];
    },
  });
}

export async function getAnalyticsLifeEventDayExposures(
  userId = demoUser.id
): Promise<AnalyticsLifeEventDayExposure[]> {
  return getAnalyticsLifeEventDayExposuresWithDependencies(userId, {
    hasLifeEventDatabase: hasDatabaseUrl && Boolean(db?.lifeEvent),
    hasExposureDatabase: hasDatabaseUrl && Boolean(db?.lifeEventDayExposure),
    buildMockLifeEventRecords,
    findLifeEventRecords: async (currentUserId) => {
      return (await db!.lifeEvent.findMany({
        where: { userId: currentUserId },
        include: {
          recurrenceSeries: {
            select: {
              title: true,
              recurrencePattern: true,
              recurrenceInterval: true,
              recurrenceRule: true,
            },
          },
        },
        orderBy: [{ startAt: "desc" }, { updatedAt: "desc" }],
        take: 40,
      })) as LifeEventRecord[];
    },
    findLifeEventDayExposureRecords: async (currentUserId) => {
      return (await db!.lifeEventDayExposure.findMany({
        where: { userId: currentUserId },
        orderBy: [{ day: "asc" }],
        take: 180,
      })) as LifeEventDayExposureRecord[];
    },
  });
}