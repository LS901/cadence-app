import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMockLifeEventRecords,
  getAnalyticsLifeEventDayExposuresWithDependencies,
  getLifeEventsContextDataWithDependencies,
  getLifeEventsPageDataWithDependencies,
  type LifeEventDayExposureRecord,
  type LifeEventRecord,
} from "./query-service";
import { demoUser } from "@/lib/data/mock-cadence";

function createRecord(overrides: Partial<LifeEventRecord> = {}): LifeEventRecord {
  return {
    id: overrides.id ?? "life-event-test",
    userId: overrides.userId ?? demoUser.id,
    recurrenceSeriesId: overrides.recurrenceSeriesId ?? null,
    title: overrides.title ?? "Life event",
    category: overrides.category ?? "ILLNESS",
    customCategoryLabel: overrides.customCategoryLabel ?? null,
    description: overrides.description ?? null,
    severityScore: overrides.severityScore ?? 3,
    sentiment: overrides.sentiment ?? "NEGATIVE",
    startAt: overrides.startAt ?? new Date("2026-05-10T08:00:00.000Z"),
    endAt: overrides.endAt ?? new Date("2026-05-10T18:00:00.000Z"),
    isOngoing: overrides.isOngoing ?? false,
    source: overrides.source ?? "MANUAL",
    tags: overrides.tags ?? ["test"],
    recurrenceSeries: overrides.recurrenceSeries ?? null,
  };
}

test("getLifeEventsContextDataWithDependencies uses mock records when the database is unavailable", async () => {
  const result = await getLifeEventsContextDataWithDependencies(demoUser.id, {
    hasLifeEventDatabase: false,
    hasExposureDatabase: false,
    buildMockLifeEventRecords,
    findLifeEventRecords: async () => {
      throw new Error("should not run");
    },
    findLifeEventDayExposureRecords: async () => {
      throw new Error("should not run");
    },
  });

  assert.equal(result.dataSource, "mock");
  assert.ok(result.lifeEvents.length > 0);
  assert.ok(result.summary.totalEvents > 0);
});

test("getLifeEventsPageDataWithDependencies separates active and recent records", async () => {
  const now = new Date("2026-05-10T12:00:00.000Z");
  const records = [
    createRecord({
      id: "active-ongoing",
      title: "Active ongoing",
      severityScore: 4,
      startAt: new Date("2026-05-09T09:00:00.000Z"),
      endAt: null,
      isOngoing: true,
    }),
    createRecord({
      id: "active-bounded",
      title: "Active bounded",
      severityScore: 5,
      sentiment: "POSITIVE",
      startAt: new Date("2026-05-10T06:00:00.000Z"),
      endAt: new Date("2026-05-10T16:00:00.000Z"),
    }),
    createRecord({
      id: "recent-ended",
      title: "Recent ended",
      severityScore: 2,
      startAt: new Date("2026-05-07T10:00:00.000Z"),
      endAt: new Date("2026-05-07T12:00:00.000Z"),
      isOngoing: false,
    }),
  ];

  const result = await getLifeEventsPageDataWithDependencies(demoUser.id, {
    hasLifeEventDatabase: true,
    hasExposureDatabase: false,
    buildMockLifeEventRecords,
    findLifeEventRecords: async () => records,
    findLifeEventDayExposureRecords: async () => [],
    now: () => now,
  });

  assert.equal(result.dataSource, "database");
  assert.equal(result.activeLifeEvents.length, 2);
  assert.equal(result.recentLifeEvents.length, 1);
  assert.equal(result.summary.activeEvents, 2);
  assert.equal(result.summary.highSeverityEvents, 2);
  assert.equal(result.allLifeEvents[0]?.id, "active-bounded");
});

test("getAnalyticsLifeEventDayExposuresWithDependencies synthesizes ids for fallback exposure rows", async () => {
  const mockRecords = [
    createRecord({
      id: "life-event-fallback",
      startAt: new Date("2026-05-10T08:00:00.000Z"),
      endAt: new Date("2026-05-10T18:00:00.000Z"),
    }),
  ];

  const result = await getAnalyticsLifeEventDayExposuresWithDependencies(demoUser.id, {
    hasLifeEventDatabase: false,
    hasExposureDatabase: false,
    buildMockLifeEventRecords: () => mockRecords,
    findLifeEventRecords: async () => [],
    findLifeEventDayExposureRecords: async () => [] as LifeEventDayExposureRecord[],
  });

  assert.equal(result.length, 1);
  assert.equal(
    result[0]?.id,
    `life-event-fallback-${result[0]?.day.toISOString().slice(0, 10)}`
  );
  assert.equal(result[0]?.lifeEventId, "life-event-fallback");
});