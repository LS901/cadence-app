"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { db, hasDatabaseUrl } from "@/lib/db";
import { updateSettingsProfile } from "./mutations";

function revalidateSettingsSurfaces() {
  revalidatePath("/settings");
}

export async function updateSettingsProfileAction(values: unknown) {
  return updateSettingsProfile(values, {
    getSession: auth,
    hasDatabase: hasDatabaseUrl,
    dbClient: db,
    revalidateSurfaces: revalidateSettingsSurfaces,
  });
}