import assert from "node:assert/strict";
import test from "node:test";
import { demoWorkspaceReadOnlyMessage } from "@/lib/auth/read-only-demo";
import { createPlannerActionHandlers } from "./actions";

test("upsertActivityAction forwards planner dependencies and revalidates planner surfaces", async () => {
  const revalidatedPaths: string[] = [];
  const sessionLoader = async () => ({ user: { id: "user-1" } });
  const dbClient = { activity: {} };
  const ensureTemplates = async () => undefined;
  const resolveTemplate = async () => ({ id: "template-1" });
  const extendSeries = async () => undefined;
  const pruneGenerated = async () => undefined;

  const handlers = await createPlannerActionHandlers({
    getSession: sessionLoader,
    hasDatabase: true,
    dbClient: dbClient as never,
    ensureActivityTemplatesForUserImpl: ensureTemplates,
    resolveActivityTemplateImpl: resolveTemplate,
    extendRecurringSeriesImpl: extendSeries,
    pruneFutureGeneratedOccurrencesImpl: pruneGenerated,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    upsertActivityImpl: async (values, dependencies) => {
      assert.deepEqual(values, { title: "Walk", scheduledAt: "2030-05-10T12:00:00.000Z" });
      assert.equal(dependencies.getSession, sessionLoader);
      assert.equal(dependencies.hasDatabase, true);
      assert.equal(dependencies.dbClient, dbClient);
      assert.equal(dependencies.ensureActivityTemplatesForUser, ensureTemplates);
      assert.equal(dependencies.resolveActivityTemplate, resolveTemplate);
      assert.equal(dependencies.extendRecurringSeries, extendSeries);
      assert.equal(dependencies.pruneFutureGeneratedOccurrences, pruneGenerated);

      dependencies.revalidateSurfaces();

      return { ok: true, mode: "created", id: "activity-1" };
    },
    updateActivityStatusImpl: async () => {
      throw new Error("update should not run in this test");
    },
    deleteActivityImpl: async () => {
      throw new Error("delete should not run in this test");
    },
  });

  const result = await handlers.upsertActivityAction({ title: "Walk", scheduledAt: "2030-05-10T12:00:00.000Z" });

  assert.deepEqual(result, { ok: true, mode: "created", id: "activity-1" });
  assert.deepEqual(revalidatedPaths, ["/planner", "/dashboard"]);
});

test("updateActivityStatusAction reuses the same planner dependency set", async () => {
  const revalidatedPaths: string[] = [];
  const sessionLoader = async () => ({ user: { id: "user-2" } });
  const dbClient = { activity: {} };
  const ensureTemplates = async () => undefined;
  const resolveTemplate = async () => ({ id: "template-2" });
  const extendSeries = async () => undefined;
  const pruneGenerated = async () => undefined;

  const handlers = await createPlannerActionHandlers({
    getSession: sessionLoader,
    hasDatabase: false,
    dbClient: dbClient as never,
    ensureActivityTemplatesForUserImpl: ensureTemplates,
    resolveActivityTemplateImpl: resolveTemplate,
    extendRecurringSeriesImpl: extendSeries,
    pruneFutureGeneratedOccurrencesImpl: pruneGenerated,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    upsertActivityImpl: async () => {
      throw new Error("upsert should not run in this test");
    },
    updateActivityStatusImpl: async (values, dependencies) => {
      assert.deepEqual(values, { id: "activity-2", status: "COMPLETED" });
      assert.equal(dependencies.getSession, sessionLoader);
      assert.equal(dependencies.hasDatabase, false);
      assert.equal(dependencies.dbClient, dbClient);
      assert.equal(dependencies.ensureActivityTemplatesForUser, ensureTemplates);
      assert.equal(dependencies.resolveActivityTemplate, resolveTemplate);
      assert.equal(dependencies.extendRecurringSeries, extendSeries);
      assert.equal(dependencies.pruneFutureGeneratedOccurrences, pruneGenerated);

      dependencies.revalidateSurfaces();

      return { ok: true, mode: "updated", id: "activity-2" };
    },
    deleteActivityImpl: async () => {
      throw new Error("delete should not run in this test");
    },
  });

  const result = await handlers.updateActivityStatusAction({ id: "activity-2", status: "COMPLETED" });

  assert.deepEqual(result, { ok: true, mode: "updated", id: "activity-2" });
  assert.deepEqual(revalidatedPaths, ["/planner", "/dashboard"]);
});

test("deleteActivityAction reuses the same planner surface revalidation set", async () => {
  const revalidatedPaths: string[] = [];

  const handlers = await createPlannerActionHandlers({
    getSession: async () => ({ user: { id: "user-3" } }),
    hasDatabase: true,
    dbClient: { activity: {} } as never,
    ensureActivityTemplatesForUserImpl: async () => undefined,
    resolveActivityTemplateImpl: async () => ({ id: "template-3" }) as never,
    extendRecurringSeriesImpl: async () => undefined,
    pruneFutureGeneratedOccurrencesImpl: async () => undefined,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    upsertActivityImpl: async () => {
      throw new Error("upsert should not run in this test");
    },
    updateActivityStatusImpl: async () => {
      throw new Error("update should not run in this test");
    },
    deleteActivityImpl: async (activityId, dependencies) => {
      assert.equal(activityId, "activity-delete");
      dependencies.revalidateSurfaces();
      return { ok: true };
    },
  });

  const result = await handlers.deleteActivityAction("activity-delete");

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(revalidatedPaths, ["/planner", "/dashboard"]);
});

test("planner actions reject writes for the shared demo workspace", async () => {
  const handlers = await createPlannerActionHandlers({
    getSession: async () => ({ user: { id: "demo-user", email: "demo@cadence.app" } }),
    hasDatabase: true,
    dbClient: { activity: {} } as never,
    ensureActivityTemplatesForUserImpl: async () => undefined,
    resolveActivityTemplateImpl: async () => ({ id: "template-demo" }) as never,
    extendRecurringSeriesImpl: async () => undefined,
    pruneFutureGeneratedOccurrencesImpl: async () => undefined,
    revalidatePath: () => undefined,
    upsertActivityImpl: async () => {
      throw new Error("upsert should not run in this test");
    },
    updateActivityStatusImpl: async () => {
      throw new Error("update should not run in this test");
    },
    deleteActivityImpl: async () => {
      throw new Error("delete should not run in this test");
    },
  });

  await assert.rejects(
    handlers.upsertActivityAction({ title: "Walk" }),
    new Error(demoWorkspaceReadOnlyMessage)
  );
});