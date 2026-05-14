import assert from "node:assert/strict";
import test from "node:test";
import { demoWorkspaceReadOnlyMessage } from "@/lib/auth/read-only-demo";
import { createMoodActionHandlers } from "./actions";

test("upsertCompleteDayReflectionAction forwards auth, db state, and mood revalidation wiring", async () => {
  const revalidatedPaths: string[] = [];
  const sessionLoader = async () => ({ user: { id: "user-1" } });
  const moodEntryDelegate = { create: async () => ({ id: "mood-1" }) };

  const handlers = await createMoodActionHandlers({
    getSession: sessionLoader,
    hasDatabase: true,
    moodEntry: moodEntryDelegate as never,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    upsertCompleteDayReflectionImpl: async (values, dependencies) => {
      assert.deepEqual(values, { score: 72, periods: [] });
      assert.equal(dependencies.getSession, sessionLoader);
      assert.equal(dependencies.hasDatabase, true);
      assert.equal(dependencies.moodEntry, moodEntryDelegate);

      dependencies.revalidateSurfaces();

      return { ok: true, mode: "updated", id: "mood-1" };
    },
    upsertQuickMoodCaptureImpl: async () => {
      throw new Error("quick capture should not run in this test");
    },
  });

  const result = await handlers.upsertCompleteDayReflectionAction({ score: 72, periods: [] });

  assert.deepEqual(result, { ok: true, mode: "updated", id: "mood-1" });
  assert.deepEqual(revalidatedPaths, ["/mood", "/insights", "/dashboard", "/planner"]);
});

test("upsertQuickMoodCaptureAction reuses the same mood surface revalidation set", async () => {
  const revalidatedPaths: string[] = [];
  const sessionLoader = async () => ({ user: { id: "user-2" } });
  const moodEntryDelegate = { update: async () => ({ id: "mood-2" }) };

  const handlers = await createMoodActionHandlers({
    getSession: sessionLoader,
    hasDatabase: false,
    moodEntry: moodEntryDelegate as never,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    upsertCompleteDayReflectionImpl: async () => {
      throw new Error("complete reflection should not run in this test");
    },
    upsertQuickMoodCaptureImpl: async (values, dependencies) => {
      assert.deepEqual(values, { score: 64 });
      assert.equal(dependencies.getSession, sessionLoader);
      assert.equal(dependencies.hasDatabase, false);
      assert.equal(dependencies.moodEntry, moodEntryDelegate);

      dependencies.revalidateSurfaces();

      return { ok: true, mode: "updated", id: "mood-2" };
    },
  });

  const result = await handlers.upsertQuickMoodCaptureAction({ score: 64 });

  assert.deepEqual(result, { ok: true, mode: "updated", id: "mood-2" });
  assert.deepEqual(revalidatedPaths, ["/mood", "/insights", "/dashboard", "/planner"]);
});

test("mood actions reject writes for the shared demo workspace", async () => {
  const handlers = await createMoodActionHandlers({
    getSession: async () => ({ user: { id: "demo-user", email: "demo@cadence.app" } }),
    hasDatabase: true,
    moodEntry: { create: async () => ({ id: "mood-demo" }) } as never,
    revalidatePath: () => undefined,
    upsertCompleteDayReflectionImpl: async () => {
      throw new Error("complete reflection should not run in this test");
    },
    upsertQuickMoodCaptureImpl: async () => {
      throw new Error("quick capture should not run in this test");
    },
  });

  await assert.rejects(
    handlers.upsertQuickMoodCaptureAction({ score: 50 }),
    new Error(demoWorkspaceReadOnlyMessage)
  );
});