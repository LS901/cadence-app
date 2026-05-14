import assert from "node:assert/strict";
import test from "node:test";
import { demoWorkspaceReadOnlyMessage } from "@/lib/auth/read-only-demo";
import { createLifeEventActionHandlers } from "./actions";

test("upsertLifeEventAction forwards life-event dependencies and revalidates linked surfaces", async () => {
  const revalidatedPaths: string[] = [];
  const sessionLoader = async () => ({ user: { id: "user-1" } });
  const dbClient = { lifeEvent: {} };
  const syncDayExposures = async () => undefined;

  const handlers = await createLifeEventActionHandlers({
    getSession: sessionLoader,
    hasDatabase: true,
    dbClient: dbClient as never,
    syncDayExposuresImpl: syncDayExposures,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    upsertLifeEventImpl: async (values, dependencies) => {
      assert.deepEqual(values, { title: "Travel", category: "TRAVEL" });
      assert.equal(dependencies.getSession, sessionLoader);
      assert.equal(dependencies.hasDatabase, true);
      assert.equal(dependencies.dbClient, dbClient);
      assert.equal(dependencies.syncDayExposures, syncDayExposures);

      dependencies.revalidateSurfaces();

      return { ok: true, mode: "created", id: "life-event-1" };
    },
    deleteLifeEventImpl: async () => {
      throw new Error("delete should not run in this test");
    },
  });

  const result = await handlers.upsertLifeEventAction({
    title: "Travel",
    category: "TRAVEL",
  });

  assert.deepEqual(result, { ok: true, mode: "created", id: "life-event-1" });
  assert.deepEqual(revalidatedPaths, ["/life-events", "/insights", "/dashboard", "/mood", "/journal"]);
});

test("deleteLifeEventAction reuses the same life-event surface revalidation set", async () => {
  const revalidatedPaths: string[] = [];
  const syncDayExposures = async () => undefined;

  const handlers = await createLifeEventActionHandlers({
    getSession: async () => ({ user: { id: "user-2" } }),
    hasDatabase: false,
    dbClient: { lifeEvent: {} } as never,
    syncDayExposuresImpl: syncDayExposures,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    upsertLifeEventImpl: async () => {
      throw new Error("upsert should not run in this test");
    },
    deleteLifeEventImpl: async (values, dependencies) => {
      assert.deepEqual(values, { id: "life-event-delete" });
      assert.equal(dependencies.hasDatabase, false);
      assert.equal(dependencies.syncDayExposures, syncDayExposures);

      dependencies.revalidateSurfaces();

      return { ok: true };
    },
  });

  const result = await handlers.deleteLifeEventAction({ id: "life-event-delete" });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(revalidatedPaths, ["/life-events", "/insights", "/dashboard", "/mood", "/journal"]);
});

test("life-event actions reject writes for the shared demo workspace", async () => {
  const handlers = await createLifeEventActionHandlers({
    getSession: async () => ({ user: { id: "demo-user", email: "demo@cadence.app" } }),
    hasDatabase: true,
    dbClient: { lifeEvent: {} } as never,
    syncDayExposuresImpl: async () => undefined,
    revalidatePath: () => undefined,
    upsertLifeEventImpl: async () => {
      throw new Error("upsert should not run in this test");
    },
    deleteLifeEventImpl: async () => {
      throw new Error("delete should not run in this test");
    },
  });

  await assert.rejects(
    handlers.upsertLifeEventAction({ title: "Blocked" }),
    new Error(demoWorkspaceReadOnlyMessage)
  );
});