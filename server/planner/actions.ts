"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db, hasDatabaseUrl } from "@/lib/db";
import {
  ensureActivityTemplatesForUser,
  extendRecurringSeries,
  pruneFutureGeneratedOccurrences,
  resolveActivityTemplate,
} from "@/server/planner/automation";
import { deleteActivity, updateActivityStatus, upsertActivity } from "./mutations";

function revalidatePlannerSurfaces() {
  revalidatePath("/planner");
  revalidatePath("/dashboard");
}

export async function upsertActivityAction(values: unknown) {
  return upsertActivity(values, {
    getSession: auth,
    hasDatabase: hasDatabaseUrl,
    dbClient: db,
    ensureActivityTemplatesForUser,
    resolveActivityTemplate,
    extendRecurringSeries,
    pruneFutureGeneratedOccurrences,
    revalidateSurfaces: revalidatePlannerSurfaces,
  });
}

export async function updateActivityStatusAction(values: unknown) {
  return updateActivityStatus(values, {
    getSession: auth,
    hasDatabase: hasDatabaseUrl,
    dbClient: db,
    ensureActivityTemplatesForUser,
    resolveActivityTemplate,
    extendRecurringSeries,
    pruneFutureGeneratedOccurrences,
    revalidateSurfaces: revalidatePlannerSurfaces,
  });
}

export async function deleteActivityAction(activityId: string) {
  return deleteActivity(activityId, {
    getSession: auth,
    hasDatabase: hasDatabaseUrl,
    dbClient: db,
    ensureActivityTemplatesForUser,
    resolveActivityTemplate,
    extendRecurringSeries,
    pruneFutureGeneratedOccurrences,
    revalidateSurfaces: revalidatePlannerSurfaces,
  });
}