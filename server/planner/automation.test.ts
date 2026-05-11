import assert from "node:assert/strict";
import test from "node:test";
import {
  ensureRecurringSeriesCoverage,
  extendRecurringSeries,
  pruneFutureGeneratedOccurrences,
  resolveActivityTemplate,
} from "./automation";

test("resolveActivityTemplate normalizes titles before upserting the template record", async () => {
  const upsertCalls: unknown[] = [];

  const templateId = await resolveActivityTemplate(
    {
      activityTemplate: {
        upsert: async (input: unknown) => {
          upsertCalls.push(input);
          return { id: "template-1" };
        },
      },
    } as never,
    "user-1",
    {
      title: "  Deep   Work Block  ",
      category: "FOCUS",
      notes: "Protect the morning.",
      durationMinutes: 90,
    }
  );

  assert.equal(templateId, "template-1");
  assert.equal(upsertCalls.length, 1);
  assert.deepEqual(upsertCalls[0], {
    where: {
      userId_normalizedTitle_category: {
        userId: "user-1",
        normalizedTitle: "deep work block",
        category: "FOCUS",
      },
    },
    update: {
      title: "  Deep   Work Block  ",
      notes: "Protect the morning.",
      defaultDurationMinutes: 90,
    },
    create: {
      userId: "user-1",
      title: "  Deep   Work Block  ",
      normalizedTitle: "deep work block",
      category: "FOCUS",
      notes: "Protect the morning.",
      defaultDurationMinutes: 90,
    },
    select: {
      id: true,
    },
  });
});

test("extendRecurringSeries generates daily occurrences through the future horizon for a recurring source activity", async () => {
  const createdActivities: Array<{ scheduledAt: Date; recurrenceGroupId: string | null }> = [];

  await extendRecurringSeries(
    {
      activity: {
        findFirst: async () => null,
        create: async ({ data }: { data: { scheduledAt: Date; recurrenceGroupId: string | null } }) => {
          createdActivities.push(data);
          return data;
        },
      },
    } as never,
    {
      id: "activity-1",
      userId: "user-1",
      templateId: "template-1",
      title: "Morning walk",
      category: "EXERCISE",
      notes: "Short walk before work.",
      recurring: true,
      recurrencePattern: "DAILY",
      recurrenceCustom: null,
      recurrenceGroupId: "series-1",
      isRecurringGenerated: false,
      scheduledAt: new Date("2030-01-01T08:00:00.000Z"),
      durationMinutes: 30,
    } as never
  );

  assert.equal(createdActivities.length, 21);
  assert.equal(createdActivities[0]?.scheduledAt.toISOString(), "2030-01-02T08:00:00.000Z");
  assert.equal(createdActivities[20]?.scheduledAt.toISOString(), "2030-01-22T08:00:00.000Z");
  assert.ok(createdActivities.every((activity) => activity.recurrenceGroupId === "series-1"));
});

test("extendRecurringSeries generates weekly occurrences through the weekly horizon", async () => {
  const createdActivities: Array<{ scheduledAt: Date; recurrenceGroupId: string | null }> = [];

  await extendRecurringSeries(
    {
      activity: {
        findFirst: async () => null,
        create: async ({ data }: { data: { scheduledAt: Date; recurrenceGroupId: string | null } }) => {
          createdActivities.push(data);
          return data;
        },
      },
    } as never,
    {
      id: "activity-2",
      userId: "user-1",
      templateId: "template-2",
      title: "Weekly review",
      category: "FOCUS",
      notes: "Reflect every Tuesday.",
      recurring: true,
      recurrencePattern: "WEEKLY",
      recurrenceCustom: null,
      recurrenceGroupId: "series-2",
      isRecurringGenerated: false,
      scheduledAt: new Date("2030-01-01T18:00:00.000Z"),
      durationMinutes: 45,
    } as never
  );

  assert.equal(createdActivities.length, 12);
  assert.equal(createdActivities[0]?.scheduledAt.toISOString(), "2030-01-08T18:00:00.000Z");
  assert.equal(createdActivities[11]?.scheduledAt.toISOString(), "2030-03-26T18:00:00.000Z");
});

test("ensureRecurringSeriesCoverage assigns a recurrence group id before extending uncovered recurring roots", async () => {
  const updatedActivities: unknown[] = [];
  const createdActivities: Array<{ recurrenceGroupId: string | null }> = [];

  await ensureRecurringSeriesCoverage(
    {
      activity: {
        findMany: async () => [
          {
            id: "activity-root",
            userId: "user-1",
            templateId: "template-1",
            title: "Morning walk",
            category: "EXERCISE",
            notes: "Short walk before work.",
            recurring: true,
            recurrencePattern: "DAILY",
            recurrenceCustom: null,
            recurrenceGroupId: null,
            isRecurringGenerated: false,
            scheduledAt: new Date("2030-01-01T08:00:00.000Z"),
            durationMinutes: 30,
          },
        ],
        update: async (input: unknown) => {
          updatedActivities.push(input);
          return input;
        },
        findFirst: async () => null,
        create: async ({ data }: { data: { recurrenceGroupId: string | null } }) => {
          createdActivities.push(data);
          return data;
        },
      },
    } as never,
    "user-1"
  );

  assert.deepEqual(updatedActivities, [
    {
      where: { id: "activity-root" },
      data: { recurrenceGroupId: "activity-root" },
    },
  ]);
  assert.equal(createdActivities.length, 21);
  assert.ok(createdActivities.every((activity) => activity.recurrenceGroupId === "activity-root"));
});

test("pruneFutureGeneratedOccurrences applies the exclude id when removing future generated activities", async () => {
  const deleteManyCalls: unknown[] = [];

  await pruneFutureGeneratedOccurrences(
    {
      activity: {
        deleteMany: async (input: unknown) => {
          deleteManyCalls.push(input);
          return { count: 2 };
        },
      },
    } as never,
    {
      id: "activity-1",
      userId: "user-1",
      recurrenceGroupId: "series-1",
    },
    "activity-keep"
  );

  assert.equal(deleteManyCalls.length, 1);
  assert.deepEqual(deleteManyCalls[0], {
    where: {
      userId: "user-1",
      recurrenceGroupId: "series-1",
      isRecurringGenerated: true,
      status: "SCHEDULED",
      scheduledAt: {
        gt: deleteManyCalls[0] && (deleteManyCalls[0] as { where: { scheduledAt: { gt: Date } } }).where.scheduledAt.gt,
      },
      id: {
        not: "activity-keep",
      },
    },
  });
});