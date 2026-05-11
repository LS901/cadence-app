import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import { archiveHabit, upsertHabit, upsertHabitLog } from "./mutations";

type HabitDependencies = Parameters<typeof upsertHabit>[1];

type Operation = {
  type: string;
  payload?: unknown;
};

function createDependencies(options?: {
  userId?: string | null;
  hasDatabase?: boolean;
  existingHabit?: { id: string } | null;
  createdId?: string;
}) {
  const operations: Operation[] = [];
  const hasDatabase = options?.hasDatabase ?? true;

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
      habit: hasDatabase
        ? {
            findFirst: async (payload: unknown) => {
              operations.push({ type: "findFirst", payload });
              return options?.existingHabit ?? null;
            },
            create: async (payload: unknown) => {
              operations.push({ type: "create", payload });
              return { id: options?.createdId ?? "habit-1" };
            },
            update: async (payload: unknown) => {
              operations.push({ type: "update", payload });
            },
          } as unknown as HabitDependencies["habit"]
        : null,
      habitLog: hasDatabase
        ? {
            deleteMany: async (payload: unknown) => {
              operations.push({ type: "deleteMany", payload });
            },
            upsert: async (payload: unknown) => {
              operations.push({ type: "logUpsert", payload });
            },
          } as unknown as HabitDependencies["habitLog"]
        : null,
      revalidateSurfaces: () => {
        operations.push({ type: "revalidate" });
      },
    } satisfies HabitDependencies,
  };
}

test("upsertHabit creates a trimmed habit and revalidates surfaces", async () => {
  const { dependencies, operations } = createDependencies({ createdId: "habit-created" });

  const result = await upsertHabit(
    {
      name: "  Morning walk  ",
      category: "MOVEMENT",
      type: "POSITIVE",
      notes: "  Reset before work.  ",
      targetPerWeek: 5,
    },
    dependencies
  );

  assert.deepEqual(result, {
    ok: true,
    mode: "created",
    id: "habit-created",
  });
  assert.deepEqual(operations.map((operation) => operation.type), ["create", "revalidate"]);

  const createPayload = operations[0]?.payload as {
    data: {
      userId: string;
      name: string;
      notes: string | null;
      targetPerWeek: number;
    };
  };

  assert.equal(createPayload.data.userId, "user-1");
  assert.equal(createPayload.data.name, "Morning walk");
  assert.equal(createPayload.data.notes, "Reset before work.");
  assert.equal(createPayload.data.targetPerWeek, 5);
});

test("upsertHabit updates an owned habit and preserves the existing id", async () => {
  const { dependencies, operations } = createDependencies({
    existingHabit: { id: "habit-existing" },
  });

  const result = await upsertHabit(
    {
      id: "habit-existing",
      name: "  Evening stretch  ",
      category: "MINDFULNESS",
      type: "POSITIVE",
      notes: "  Wind down before bed.  ",
      targetPerWeek: 6,
    },
    dependencies
  );

  assert.deepEqual(result, {
    ok: true,
    mode: "updated",
    id: "habit-existing",
  });
  assert.deepEqual(operations.map((operation) => operation.type), [
    "findFirst",
    "update",
    "revalidate",
  ]);
});

test("archiveHabit marks an owned habit as archived and revalidates", async () => {
  const { dependencies, operations } = createDependencies({
    existingHabit: { id: "habit-archive" },
  });

  const result = await archiveHabit({ id: "habit-archive" }, dependencies);

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(operations.map((operation) => operation.type), [
    "findFirst",
    "update",
    "revalidate",
  ]);

  const updatePayload = operations[1]?.payload as {
    where: { id: string };
    data: { isArchived: true };
  };

  assert.deepEqual(updatePayload, {
    where: { id: "habit-archive" },
    data: { isArchived: true },
  });
});

test("upsertHabitLog deletes the log when status is cleared", async () => {
  const { dependencies, operations } = createDependencies({
    existingHabit: { id: "habit-log" },
  });

  const result = await upsertHabitLog(
    {
      habitId: "habit-log",
      day: "2030-05-10T18:45:00.000Z",
      status: null,
    },
    dependencies
  );

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(operations.map((operation) => operation.type), [
    "findFirst",
    "deleteMany",
    "revalidate",
  ]);

  const deletePayload = operations[1]?.payload as {
    where: {
      userId: string;
      habitId: string;
      day: Date;
    };
  };

  assert.equal(deletePayload.where.userId, "user-1");
  assert.equal(deletePayload.where.habitId, "habit-log");
  assert.equal(deletePayload.where.day.getHours(), 0);
  assert.equal(deletePayload.where.day.getMinutes(), 0);
});

test("upsertHabitLog upserts the log when a status is provided", async () => {
  const { dependencies, operations } = createDependencies({
    existingHabit: { id: "habit-log" },
  });

  const result = await upsertHabitLog(
    {
      habitId: "habit-log",
      day: "2030-05-10T18:45:00.000Z",
      status: "COMPLETED",
    },
    dependencies
  );

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(operations.map((operation) => operation.type), [
    "findFirst",
    "logUpsert",
    "revalidate",
  ]);

  const logUpsertPayload = operations[1]?.payload as {
    create: {
      userId: string;
      habitId: string;
      day: Date;
      status: "COMPLETED" | "SKIPPED";
    };
    update: {
      status: "COMPLETED" | "SKIPPED";
    };
  };

  assert.equal(logUpsertPayload.create.userId, "user-1");
  assert.equal(logUpsertPayload.create.habitId, "habit-log");
  assert.equal(logUpsertPayload.create.status, "COMPLETED");
  assert.equal(logUpsertPayload.update.status, "COMPLETED");
  assert.equal(logUpsertPayload.create.day.getHours(), 0);
  assert.equal(logUpsertPayload.create.day.getMinutes(), 0);
});

test("upsertHabit rejects invalid payloads before touching persistence", async () => {
  const { dependencies, operations } = createDependencies();

  await assert.rejects(
    () =>
      upsertHabit(
        {
          name: "A",
          category: "MOVEMENT",
          type: "POSITIVE",
          targetPerWeek: 5,
        },
        dependencies
      ),
    ZodError
  );

  assert.deepEqual(operations, []);
});

test("upsertHabitLog rejects unauthorized access before touching persistence", async () => {
  const { dependencies, operations } = createDependencies({ userId: null });

  await assert.rejects(
    () =>
      upsertHabitLog(
        {
          habitId: "habit-log",
          status: "COMPLETED",
        },
        dependencies
      ),
    /Unauthorized/
  );

  assert.deepEqual(operations, []);
});