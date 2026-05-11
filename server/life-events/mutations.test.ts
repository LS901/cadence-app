import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import { deleteLifeEvent, upsertLifeEvent } from "./mutations";

type LifeEventDependencies = Parameters<typeof upsertLifeEvent>[1];

type Operation = {
  type: string;
  payload?: unknown;
};

function createDependencies(options?: {
  userId?: string | null;
  hasDatabase?: boolean;
  existingEvent?: {
    id: string;
    recurrenceSeriesId: string | null;
    source: string;
  } | null;
}) {
  const operations: Operation[] = [];
  const hasDatabase = options?.hasDatabase ?? true;

  const transaction = {
    lifeEvent: {
      update: async (payload: { where: { id: string }; data: Record<string, unknown> }) => {
        operations.push({ type: "tx.lifeEvent.update", payload });
        return {
          id: payload.where.id,
          startAt: payload.data.startAt as Date,
          endAt: (payload.data.endAt as Date | null | undefined) ?? null,
        };
      },
      create: async (payload: { data: Record<string, unknown> }) => {
        operations.push({ type: "tx.lifeEvent.create", payload });
        return {
          id: "event-created",
          startAt: payload.data.startAt as Date,
          endAt: (payload.data.endAt as Date | null | undefined) ?? null,
        };
      },
      createMany: async (payload: { data: Record<string, unknown>[] }) => {
        operations.push({ type: "tx.lifeEvent.createMany", payload });
      },
      deleteMany: async (payload: { where: Record<string, unknown> }) => {
        operations.push({ type: "tx.lifeEvent.deleteMany", payload });
      },
      delete: async (payload: { where: { id: string } }) => {
        operations.push({ type: "tx.lifeEvent.delete", payload });
      },
    },
    lifeEventSeries: {
      create: async (payload: { data: Record<string, unknown>; select: { id: true } }) => {
        operations.push({ type: "tx.lifeEventSeries.create", payload });
        return { id: "series-1" };
      },
      update: async (payload: { where: { id: string }; data: Record<string, unknown> }) => {
        operations.push({ type: "tx.lifeEventSeries.update", payload });
      },
      delete: async (payload: { where: { id: string } }) => {
        operations.push({ type: "tx.lifeEventSeries.delete", payload });
      },
    },
  };

  return {
    operations,
    dependencies: {
      getSession: async () =>
        options?.userId === null
          ? null
          : {
              user: {
                id: options?.userId ?? "user-1",
              },
            },
      hasDatabase,
      dbClient: hasDatabase
        ? {
            lifeEvent: {
              findFirst: async (payload: unknown) => {
                operations.push({ type: "lifeEvent.findFirst", payload });
                return options?.existingEvent ?? null;
              },
            },
            lifeEventSeries: transaction.lifeEventSeries,
            $transaction: async <T>(callback: (client: typeof transaction) => Promise<T>) => {
              operations.push({ type: "db.$transaction.start" });
              const result = await callback(transaction);
              operations.push({ type: "db.$transaction.end" });
              return result;
            },
          } as unknown as LifeEventDependencies["dbClient"]
        : null,
      syncDayExposures: async (userId: string) => {
        operations.push({ type: "syncDayExposures", payload: userId });
      },
      revalidateSurfaces: () => {
        operations.push({ type: "revalidate" });
      },
    } satisfies LifeEventDependencies,
  };
}

function createBaseEventInput() {
  return {
    title: "  Unexpected family logistics  ",
    category: "FAMILY_STRESS",
    severityScore: 3,
    sentiment: "MIXED",
    startAt: new Date("2030-05-10T09:00:00.000Z"),
    endAt: new Date("2030-05-10T17:00:00.000Z"),
    isOngoing: false,
    tags: [" Family ", "travel", "family"],
  };
}

test("upsertLifeEvent creates a recurring root event, generated occurrences, then syncs and revalidates", async () => {
  const { dependencies, operations } = createDependencies();

  const result = await upsertLifeEvent(
    {
      ...createBaseEventInput(),
      recurrencePattern: "WEEKLY",
      recurrenceInterval: 2,
    },
    dependencies
  );

  assert.deepEqual(result, {
    ok: true,
    mode: "created",
    id: "event-created",
  });
  assert.equal(operations[0]?.type, "db.$transaction.start");
  assert.equal(operations.at(-2)?.type, "syncDayExposures");
  assert.equal(operations.at(-1)?.type, "revalidate");

  const seriesCreatePayload = operations.find((operation) => operation.type === "tx.lifeEventSeries.create")
    ?.payload as { data: Record<string, unknown> };
  const rootCreatePayload = operations.find((operation) => operation.type === "tx.lifeEvent.create")
    ?.payload as { data: Record<string, unknown> };
  const generatedPayload = operations.find((operation) => operation.type === "tx.lifeEvent.createMany")
    ?.payload as { data: Array<Record<string, unknown>> };

  assert.equal(seriesCreatePayload.data.userId, "user-1");
  assert.equal(seriesCreatePayload.data.recurrencePattern, "WEEKLY");
  assert.equal(seriesCreatePayload.data.recurrenceInterval, 2);
  assert.equal(rootCreatePayload.data.source, "MANUAL");
  assert.equal(rootCreatePayload.data.recurrenceSeriesId, "series-1");
  assert.deepEqual(rootCreatePayload.data.tags, ["family", "travel"]);
  assert.ok(generatedPayload.data.length > 0);
  assert.equal(generatedPayload.data[0]?.source, "RECURRING_GENERATED");
  assert.equal(generatedPayload.data[0]?.recurrenceSeriesId, "series-1");
});

test("upsertLifeEvent removes recurrence metadata when an existing recurring root becomes manual", async () => {
  const { dependencies, operations } = createDependencies({
    existingEvent: {
      id: "event-existing",
      recurrenceSeriesId: "series-existing",
      source: "MANUAL",
    },
  });

  const result = await upsertLifeEvent(
    {
      ...createBaseEventInput(),
      id: "event-existing",
    },
    dependencies
  );

  assert.deepEqual(result, {
    ok: true,
    mode: "updated",
    id: "event-existing",
  });
  assert.deepEqual(operations.map((operation) => operation.type), [
    "lifeEvent.findFirst",
    "db.$transaction.start",
    "tx.lifeEvent.deleteMany",
    "tx.lifeEvent.update",
    "tx.lifeEventSeries.delete",
    "db.$transaction.end",
    "syncDayExposures",
    "revalidate",
  ]);

  const updatePayload = operations.find((operation) => operation.type === "tx.lifeEvent.update")?.payload as {
    data: Record<string, unknown>;
  };

  assert.equal(updatePayload.data.recurrenceSeriesId, null);
  assert.equal(updatePayload.data.source, "MANUAL");
});

test("deleteLifeEvent deletes a recurring root by removing the whole series, then syncs and revalidates", async () => {
  const { dependencies, operations } = createDependencies({
    existingEvent: {
      id: "event-delete",
      recurrenceSeriesId: "series-delete",
      source: "MANUAL",
    },
  });

  const result = await deleteLifeEvent({ id: "event-delete" }, dependencies);

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(operations.map((operation) => operation.type), [
    "lifeEvent.findFirst",
    "db.$transaction.start",
    "tx.lifeEvent.deleteMany",
    "tx.lifeEventSeries.delete",
    "db.$transaction.end",
    "syncDayExposures",
    "revalidate",
  ]);
});

test("upsertLifeEvent rejects editing an auto-generated recurring occurrence", async () => {
  const { dependencies, operations } = createDependencies({
    existingEvent: {
      id: "event-generated",
      recurrenceSeriesId: "series-generated",
      source: "RECURRING_GENERATED",
    },
  });

  await assert.rejects(
    () =>
      upsertLifeEvent(
        {
          ...createBaseEventInput(),
          id: "event-generated",
        },
        dependencies
      ),
    /Edit the original recurring context event instead of an auto-generated occurrence\./
  );

  assert.deepEqual(operations.map((operation) => operation.type), ["lifeEvent.findFirst"]);
});

test("upsertLifeEvent rejects invalid payloads before touching persistence", async () => {
  const { dependencies, operations } = createDependencies();

  await assert.rejects(
    () =>
      upsertLifeEvent(
        {
          title: "A",
          category: "FAMILY_STRESS",
          severityScore: 3,
          startAt: new Date("2030-05-10T09:00:00.000Z"),
          endAt: new Date("2030-05-10T17:00:00.000Z"),
          isOngoing: false,
          tags: [],
        },
        dependencies
      ),
    ZodError
  );

  assert.deepEqual(operations, []);
});

test("deleteLifeEvent rejects unauthorized access before touching persistence", async () => {
  const { dependencies, operations } = createDependencies({ userId: null });

  await assert.rejects(() => deleteLifeEvent({ id: "event-delete" }, dependencies), /Unauthorized/);

  assert.deepEqual(operations, []);
});