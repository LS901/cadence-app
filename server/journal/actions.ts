"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db, hasDatabaseUrl } from "@/lib/db";
import { deleteJournalEntry, upsertJournalEntry } from "./mutations";

function revalidateJournalSurfaces() {
  revalidatePath("/journal");
  revalidatePath("/dashboard");
  revalidatePath("/insights");
}

export async function upsertJournalEntryAction(values: unknown) {
  return upsertJournalEntry(values, {
    getSession: auth,
    hasDatabase: hasDatabaseUrl,
    journalEntry: db?.journalEntry,
    revalidateSurfaces: revalidateJournalSurfaces,
  });
}

export async function deleteJournalEntryAction(values: unknown) {
  return deleteJournalEntry(values, {
    getSession: auth,
    hasDatabase: hasDatabaseUrl,
    journalEntry: db?.journalEntry,
    revalidateSurfaces: revalidateJournalSurfaces,
  });
}