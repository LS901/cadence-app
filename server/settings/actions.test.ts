import assert from "node:assert/strict";
import test from "node:test";
import { demoWorkspaceReadOnlyMessage } from "@/lib/auth/read-only-demo";
import { createSettingsActionHandlers } from "./actions";

test("updateSettingsProfileAction forwards settings dependencies and revalidates settings surfaces", async () => {
  const revalidatedPaths: string[] = [];
  const sessionLoader = async () => ({ user: { id: "user-1" } });
  const dbClient = { user: {} };

  const handlers = await createSettingsActionHandlers({
    getSession: sessionLoader,
    hasDatabase: true,
    dbClient: dbClient as never,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    updateSettingsProfileImpl: async (values, dependencies) => {
      assert.deepEqual(values, { name: "Demo", timezone: "UTC" });
      assert.equal(dependencies.getSession, sessionLoader);
      assert.equal(dependencies.hasDatabase, true);
      assert.equal(dependencies.dbClient, dbClient);

      dependencies.revalidateSurfaces();

      return { ok: true };
    },
  });

  const result = await handlers.updateSettingsProfileAction({
    name: "Demo",
    timezone: "UTC",
  });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(revalidatedPaths, ["/settings"]);
});

test("settings actions reject writes for the shared demo workspace", async () => {
  const handlers = await createSettingsActionHandlers({
    getSession: async () => ({ user: { id: "demo-user", email: "demo@cadence.app" } }),
    hasDatabase: true,
    dbClient: { user: {} } as never,
    revalidatePath: () => undefined,
    updateSettingsProfileImpl: async () => {
      throw new Error("settings update should not run in this test");
    },
  });

  await assert.rejects(
    handlers.updateSettingsProfileAction({ name: "Blocked" }),
    new Error(demoWorkspaceReadOnlyMessage)
  );
});