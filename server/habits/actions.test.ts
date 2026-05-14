import assert from "node:assert/strict";
import test from "node:test";
import { demoWorkspaceReadOnlyMessage } from "@/lib/auth/read-only-demo";
import { createHabitActionHandlers } from "./actions";

test("upsertHabitAction forwards habit delegates and revalidates habit surfaces", async () => {
  const revalidatedPaths: string[] = [];
  const sessionLoader = async () => ({ user: { id: "user-1" } });
  const habitDelegate = { create: async () => ({ id: "habit-1" }) };
  const habitLogDelegate = { upsert: async () => ({ id: "habit-log-1" }) };

  const handlers = await createHabitActionHandlers({
    getSession: sessionLoader,
    hasDatabase: true,
    habit: habitDelegate as never,
    habitLog: habitLogDelegate as never,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    upsertHabitImpl: async (values, dependencies) => {
      assert.deepEqual(values, { name: "Morning walk" });
      assert.equal(dependencies.getSession, sessionLoader);
      assert.equal(dependencies.hasDatabase, true);
      assert.equal(dependencies.habit, habitDelegate);
      assert.equal(dependencies.habitLog, habitLogDelegate);

      dependencies.revalidateSurfaces();

      return { ok: true, mode: "created", id: "habit-1" };
    },
    archiveHabitImpl: async () => {
      throw new Error("archive should not run in this test");
    },
    upsertHabitLogImpl: async () => {
      throw new Error("log should not run in this test");
    },
  });

  const result = await handlers.upsertHabitAction({ name: "Morning walk" });

  assert.deepEqual(result, { ok: true, mode: "created", id: "habit-1" });
  assert.deepEqual(revalidatedPaths, ["/habits", "/dashboard", "/insights"]);
});

test("archiveHabitAction reuses the same habit dependency set", async () => {
  const revalidatedPaths: string[] = [];
  const sessionLoader = async () => ({ user: { id: "user-2" } });
  const habitDelegate = { update: async () => ({ id: "habit-2" }) };
  const habitLogDelegate = { deleteMany: async () => ({ count: 1 }) };

  const handlers = await createHabitActionHandlers({
    getSession: sessionLoader,
    hasDatabase: false,
    habit: habitDelegate as never,
    habitLog: habitLogDelegate as never,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    upsertHabitImpl: async () => {
      throw new Error("upsert should not run in this test");
    },
    archiveHabitImpl: async (values, dependencies) => {
      assert.deepEqual(values, { id: "habit-2" });
      assert.equal(dependencies.getSession, sessionLoader);
      assert.equal(dependencies.hasDatabase, false);
      assert.equal(dependencies.habit, habitDelegate);
      assert.equal(dependencies.habitLog, habitLogDelegate);

      dependencies.revalidateSurfaces();

      return { ok: true };
    },
    upsertHabitLogImpl: async () => {
      throw new Error("log should not run in this test");
    },
  });

  const result = await handlers.archiveHabitAction({ id: "habit-2" });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(revalidatedPaths, ["/habits", "/dashboard", "/insights"]);
});

test("upsertHabitLogAction reuses the same habit surface revalidation set", async () => {
  const revalidatedPaths: string[] = [];

  const handlers = await createHabitActionHandlers({
    getSession: async () => ({ user: { id: "user-3" } }),
    hasDatabase: true,
    habit: { findFirst: async () => ({ id: "habit-3" }) } as never,
    habitLog: { upsert: async () => ({ id: "habit-log-3" }) } as never,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    upsertHabitImpl: async () => {
      throw new Error("upsert should not run in this test");
    },
    archiveHabitImpl: async () => {
      throw new Error("archive should not run in this test");
    },
    upsertHabitLogImpl: async (values, dependencies) => {
      assert.deepEqual(values, { habitId: "habit-3", day: "2030-05-11", status: "COMPLETED" });
      dependencies.revalidateSurfaces();
      return { ok: true };
    },
  });

  const result = await handlers.upsertHabitLogAction({ habitId: "habit-3", day: "2030-05-11", status: "COMPLETED" });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(revalidatedPaths, ["/habits", "/dashboard", "/insights"]);
});

test("habit actions reject writes for the shared demo workspace", async () => {
  const handlers = await createHabitActionHandlers({
    getSession: async () => ({ user: { id: "demo-user", email: "demo@cadence.app" } }),
    hasDatabase: true,
    habit: { create: async () => ({ id: "habit-demo" }) } as never,
    habitLog: { upsert: async () => ({ id: "habit-log-demo" }) } as never,
    revalidatePath: () => undefined,
    upsertHabitImpl: async () => {
      throw new Error("upsert should not run in this test");
    },
    archiveHabitImpl: async () => {
      throw new Error("archive should not run in this test");
    },
    upsertHabitLogImpl: async () => {
      throw new Error("log upsert should not run in this test");
    },
  });

  await assert.rejects(
    handlers.upsertHabitAction({ name: "Blocked" }),
    new Error(demoWorkspaceReadOnlyMessage)
  );
});