"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db, hasDatabaseUrl } from "@/lib/db";
import { upsertCompleteDayReflection, upsertQuickMoodCapture } from "./mutations";

function revalidateMoodSurfaces() {
  revalidatePath("/mood");
  revalidatePath("/insights");
  revalidatePath("/dashboard");
  revalidatePath("/planner");
}

export async function upsertCompleteDayReflectionAction(values: unknown) {
  return upsertCompleteDayReflection(values, {
    getSession: auth,
    hasDatabase: hasDatabaseUrl,
    moodEntry: db?.moodEntry,
    revalidateSurfaces: revalidateMoodSurfaces,
  });
}

export async function upsertQuickMoodCaptureAction(values: unknown) {
  return upsertQuickMoodCapture(values, {
    getSession: auth,
    hasDatabase: hasDatabaseUrl,
    moodEntry: db?.moodEntry,
    revalidateSurfaces: revalidateMoodSurfaces,
  });
}