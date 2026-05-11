import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLifeEventDayExposureRows,
  syncLifeEventDayExposuresForEvent,
  syncLifeEventDayExposuresForUser,
} from "./day-exposures";

function createEvent(overrides: Partial<Parameters<typeof buildLifeEventDayExposureRows>[0][number]>) {
  return {
    id: "event-1",
    userId: "user-1",
    category: "WORK",
    severityScore: 4,
    sentiment: "NEGATIVE" as const,
    startAt: new Date(2030, 4, 1, 9, 0, 0),
    endAt: new Date(2030, 4, 1, 15, 0, 0),
    isOngoing: false,
    tags: ["deadline"],
    ...overrides,
  };
}

function assertLocalDayParts(day: Date, year: number, monthIndex: number, date: number) {
  assert.equal(day.getFullYear(), year);
  assert.equal(day.getMonth(), monthIndex);
  assert.equal(day.getDate(), date);
}

test("buildLifeEventDayExposureRows creates a partial-day row with clamped ratio and weighted impact", () => {
  const rows = buildLifeEventDayExposureRows([
    createEvent({
      startAt: new Date(2030, 4, 1, 9, 0, 0),
      endAt: new Date(2030, 4, 1, 15, 0, 0),
      severityScore: 4,
    }),
  ]);

  assert.equal(rows.length, 1);
  assertLocalDayParts(rows[0]!.day, 2030, 4, 1);
  assert.equal(rows[0]?.overlapMinutes, 360);
  assert.equal(rows[0]?.overlapRatio, 0.25);
  assert.equal(rows[0]?.weightedImpact, 0.2);
});

test("buildLifeEventDayExposureRows expands ongoing events through the reference date", () => {
  const rows = buildLifeEventDayExposureRows(
    [
      createEvent({
        id: "event-ongoing",
        startAt: new Date(2030, 4, 1, 12, 0, 0),
        endAt: null,
        isOngoing: true,
        severityScore: 5,
        sentiment: "MIXED",
        tags: ["travel"],
      }),
    ],
    new Date(2030, 4, 3, 10, 30, 0)
  );

  assert.equal(rows.length, 3);
  assertLocalDayParts(rows[0]!.day, 2030, 4, 1);
  assert.equal(rows[0]?.overlapMinutes, 720);
  assert.equal(rows[1]?.overlapMinutes, 1440);
  assertLocalDayParts(rows[2]!.day, 2030, 4, 3);
  assert.equal(rows[2]?.overlapMinutes, 1440);
  assert.equal(rows[2]?.weightedImpact, 1);
});

test("syncLifeEventDayExposuresForEvent deletes old rows and writes regenerated rows", async () => {
  const operations: Array<{ type: string; payload: unknown }> = [];
  const event = createEvent({
    id: "event-sync",
    startAt: new Date(2030, 4, 1, 9, 0, 0),
    endAt: new Date(2030, 4, 2, 9, 0, 0),
  });

  await syncLifeEventDayExposuresForEvent(
    event,
    {
      lifeEvent: {
        findMany: async () => [],
      },
      lifeEventDayExposure: {
        deleteMany: async (payload) => {
          operations.push({ type: "delete", payload });
          return { count: 2 };
        },
        createMany: async (payload) => {
          operations.push({ type: "create", payload });
          return { count: 2 };
        },
      },
    },
    new Date(2030, 4, 2, 12, 0, 0)
  );

  assert.equal(operations.length, 2);
  assert.deepEqual(operations[0], {
    type: "delete",
    payload: { where: { lifeEventId: "event-sync" } },
  });
  assert.equal(operations[1]?.type, "create");
  assert.deepEqual((operations[1]?.payload as { data: unknown[] }).data.length, 2);
});

test("syncLifeEventDayExposuresForUser deletes by user and writes aggregated rows from fetched events", async () => {
  const operations: Array<{ type: string; payload: unknown }> = [];

  await syncLifeEventDayExposuresForUser(
    "user-1",
    {
      lifeEvent: {
        findMany: async () => [
          createEvent({
            id: "event-user-1",
            startAt: new Date(2030, 4, 1, 9, 0, 0),
            endAt: new Date(2030, 4, 1, 15, 0, 0),
          }),
          createEvent({
            id: "event-user-2",
            category: "FAMILY",
            severityScore: 5,
            sentiment: "MIXED",
            startAt: new Date(2030, 4, 2, 12, 0, 0),
            endAt: new Date(2030, 4, 3, 12, 0, 0),
            tags: ["caregiving"],
          }),
        ],
      },
      lifeEventDayExposure: {
        deleteMany: async (payload) => {
          operations.push({ type: "delete", payload });
          return { count: 4 };
        },
        createMany: async (payload) => {
          operations.push({ type: "create", payload });
          return { count: 3 };
        },
      },
    },
    new Date(2030, 4, 3, 12, 0, 0)
  );

  assert.equal(operations.length, 2);
  assert.deepEqual(operations[0], {
    type: "delete",
    payload: { where: { userId: "user-1" } },
  });
  assert.equal(operations[1]?.type, "create");
  assert.equal((operations[1]?.payload as { data: unknown[] }).data.length, 3);
});

test("syncLifeEventDayExposuresForUser skips createMany when fetched events produce no exposure rows", async () => {
  const operations: Array<{ type: string; payload: unknown }> = [];

  await syncLifeEventDayExposuresForUser(
    "user-1",
    {
      lifeEvent: {
        findMany: async () => [
          createEvent({
            id: "event-empty",
            startAt: new Date(2030, 4, 3, 12, 0, 0),
            endAt: new Date(2030, 4, 2, 12, 0, 0),
          }),
        ],
      },
      lifeEventDayExposure: {
        deleteMany: async (payload) => {
          operations.push({ type: "delete", payload });
          return { count: 1 };
        },
        createMany: async (payload) => {
          operations.push({ type: "create", payload });
          return { count: 0 };
        },
      },
    },
    new Date(2030, 4, 3, 12, 0, 0)
  );

  assert.deepEqual(operations, [
    {
      type: "delete",
      payload: { where: { userId: "user-1" } },
    },
  ]);
});