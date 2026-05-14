import assert from "node:assert/strict";
import test from "node:test";
import { demoWorkspaceReadOnlyMessage } from "@/lib/auth/read-only-demo";
import { createJournalActionHandlers } from "./actions";

test("upsertJournalEntryAction forwards auth, db state, and journal revalidation wiring", async () => {
  const revalidatedPaths: string[] = [];
  const sessionLoader = async () => ({ user: { id: "user-1" } });
  const journalEntryDelegate = { create: async () => ({ id: "entry-1" }) };

  const handlers = await createJournalActionHandlers({
    getSession: sessionLoader,
    hasDatabase: true,
    journalEntry: journalEntryDelegate as never,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    upsertJournalEntryImpl: async (values, dependencies) => {
      assert.deepEqual(values, { id: "entry-1", content: "Updated" });
      assert.equal(dependencies.getSession, sessionLoader);
      assert.equal(dependencies.hasDatabase, true);
      assert.equal(dependencies.journalEntry, journalEntryDelegate);

      dependencies.revalidateSurfaces();

      return { ok: true, mode: "updated", id: "entry-1" };
    },
    deleteJournalEntryImpl: async () => {
      throw new Error("delete should not run in this test");
    },
  });

  const result = await handlers.upsertJournalEntryAction({ id: "entry-1", content: "Updated" });

  assert.deepEqual(result, { ok: true, mode: "updated", id: "entry-1" });
  assert.deepEqual(revalidatedPaths, ["/journal", "/dashboard", "/insights"]);
});

test("deleteJournalEntryAction reuses the same journal surface revalidation set", async () => {
  const revalidatedPaths: string[] = [];
  const sessionLoader = async () => ({ user: { id: "user-2" } });
  const journalEntryDelegate = { delete: async () => undefined };

  const handlers = await createJournalActionHandlers({
    getSession: sessionLoader,
    hasDatabase: false,
    journalEntry: journalEntryDelegate as never,
    revalidatePath: (path) => {
      revalidatedPaths.push(path);
    },
    upsertJournalEntryImpl: async () => {
      throw new Error("upsert should not run in this test");
    },
    deleteJournalEntryImpl: async (values, dependencies) => {
      assert.deepEqual(values, { id: "entry-delete" });
      assert.equal(dependencies.getSession, sessionLoader);
      assert.equal(dependencies.hasDatabase, false);
      assert.equal(dependencies.journalEntry, journalEntryDelegate);

      dependencies.revalidateSurfaces();

      return { ok: true };
    },
  });

  const result = await handlers.deleteJournalEntryAction({ id: "entry-delete" });

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(revalidatedPaths, ["/journal", "/dashboard", "/insights"]);
});

test("journal actions reject writes for the shared demo workspace", async () => {
  const handlers = await createJournalActionHandlers({
    getSession: async () => ({ user: { id: "demo-user", email: "demo@cadence.app" } }),
    hasDatabase: true,
    journalEntry: { create: async () => ({ id: "entry-demo" }) } as never,
    revalidatePath: () => undefined,
    upsertJournalEntryImpl: async () => {
      throw new Error("upsert should not run in this test");
    },
    deleteJournalEntryImpl: async () => {
      throw new Error("delete should not run in this test");
    },
  });

  await assert.rejects(
    handlers.upsertJournalEntryAction({ content: "Blocked" }),
    new Error(demoWorkspaceReadOnlyMessage)
  );
});