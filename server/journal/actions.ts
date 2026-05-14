"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertWritableDemoSession } from "@/lib/auth/read-only-demo";
import { db, hasDatabaseUrl } from "@/lib/db";
import { deleteJournalEntry, upsertJournalEntry } from "./mutations";

type JournalMutationDependencies = Parameters<typeof upsertJournalEntry>[1];

type JournalActionDependencies = {
  getSession: JournalMutationDependencies["getSession"];
  hasDatabase: JournalMutationDependencies["hasDatabase"];
  journalEntry: JournalMutationDependencies["journalEntry"];
  revalidatePath: typeof revalidatePath;
  upsertJournalEntryImpl: (
    values: unknown,
    dependencies: JournalMutationDependencies
  ) => Promise<unknown>;
  deleteJournalEntryImpl: (
    values: unknown,
    dependencies: JournalMutationDependencies
  ) => Promise<unknown>;
};

function createJournalRevalidateSurfaces(revalidatePathImpl: typeof revalidatePath) {
  return function revalidateJournalSurfaces() {
    revalidatePathImpl("/journal");
    revalidatePathImpl("/dashboard");
    revalidatePathImpl("/insights");
  };
}

function buildJournalActionHandlers(dependencies: JournalActionDependencies) {
  const revalidateSurfaces = createJournalRevalidateSurfaces(dependencies.revalidatePath);

  return {
    async upsertJournalEntryAction(values: unknown) {
      await assertWritableDemoSession(dependencies.getSession);
      return dependencies.upsertJournalEntryImpl(values, {
        getSession: dependencies.getSession,
        hasDatabase: dependencies.hasDatabase,
        journalEntry: dependencies.journalEntry,
        revalidateSurfaces,
      });
    },

    async deleteJournalEntryAction(values: unknown) {
      await assertWritableDemoSession(dependencies.getSession);
      return dependencies.deleteJournalEntryImpl(values, {
        getSession: dependencies.getSession,
        hasDatabase: dependencies.hasDatabase,
        journalEntry: dependencies.journalEntry,
        revalidateSurfaces,
      });
    },
  };
}

export async function createJournalActionHandlers(dependencies: JournalActionDependencies) {
  return buildJournalActionHandlers(dependencies);
}

const journalActionHandlers = buildJournalActionHandlers({
  getSession: auth,
  hasDatabase: hasDatabaseUrl,
  journalEntry: db?.journalEntry,
  revalidatePath,
  upsertJournalEntryImpl: upsertJournalEntry,
  deleteJournalEntryImpl: deleteJournalEntry,
});

export const upsertJournalEntryAction = journalActionHandlers.upsertJournalEntryAction;
export const deleteJournalEntryAction = journalActionHandlers.deleteJournalEntryAction;