"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db, hasDatabaseUrl } from "@/lib/db";
import { syncLifeEventDayExposuresForUser } from "@/server/life-events/day-exposures";
import { deleteLifeEvent, upsertLifeEvent } from "./mutations";

function revalidateLifeEventSurfaces() {
  revalidatePath("/life-events");
  revalidatePath("/insights");
  revalidatePath("/dashboard");
  revalidatePath("/mood");
  revalidatePath("/journal");
}

export async function upsertLifeEventAction(values: unknown) {
  return upsertLifeEvent(values, {
    getSession: auth,
    hasDatabase: hasDatabaseUrl,
    dbClient: db,
    syncDayExposures: syncLifeEventDayExposuresForUser,
    revalidateSurfaces: revalidateLifeEventSurfaces,
  });
}

export async function deleteLifeEventAction(values: unknown) {
  return deleteLifeEvent(values, {
    getSession: auth,
    hasDatabase: hasDatabaseUrl,
    dbClient: db,
    syncDayExposures: syncLifeEventDayExposuresForUser,
    revalidateSurfaces: revalidateLifeEventSurfaces,
  });
}