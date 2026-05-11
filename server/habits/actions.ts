"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db, hasDatabaseUrl } from "@/lib/db";
import { archiveHabit, upsertHabit, upsertHabitLog } from "./mutations";

function revalidateHabitSurfaces() {
  revalidatePath("/habits");
  revalidatePath("/dashboard");
  revalidatePath("/insights");
}

export async function upsertHabitAction(values: unknown) {
  return upsertHabit(values, {
    getSession: auth,
    hasDatabase: hasDatabaseUrl,
    habit: db?.habit,
    habitLog: db?.habitLog,
    revalidateSurfaces: revalidateHabitSurfaces,
  });
}

export async function archiveHabitAction(values: unknown) {
  return archiveHabit(values, {
    getSession: auth,
    hasDatabase: hasDatabaseUrl,
    habit: db?.habit,
    habitLog: db?.habitLog,
    revalidateSurfaces: revalidateHabitSurfaces,
  });
}

export async function upsertHabitLogAction(values: unknown) {
  return upsertHabitLog(values, {
    getSession: auth,
    hasDatabase: hasDatabaseUrl,
    habit: db?.habit,
    habitLog: db?.habitLog,
    revalidateSurfaces: revalidateHabitSurfaces,
  });
}