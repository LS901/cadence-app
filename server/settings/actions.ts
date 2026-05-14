"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertWritableDemoSession } from "@/lib/auth/read-only-demo";
import { db, hasDatabaseUrl } from "@/lib/db";
import { updateSettingsProfile } from "./mutations";

type SettingsActionDependencies = {
  getSession: typeof auth;
  hasDatabase: boolean;
  dbClient: typeof db;
  revalidatePath: typeof revalidatePath;
  updateSettingsProfileImpl: typeof updateSettingsProfile;
};

function createSettingsRevalidateSurfaces(revalidatePathImpl: typeof revalidatePath) {
  return function revalidateSettingsSurfaces() {
    revalidatePathImpl("/settings");
  };
}

function buildSettingsActionHandlers(dependencies: SettingsActionDependencies) {
  const revalidateSurfaces = createSettingsRevalidateSurfaces(dependencies.revalidatePath);

  return {
    async updateSettingsProfileAction(values: unknown) {
      await assertWritableDemoSession(dependencies.getSession);
      return dependencies.updateSettingsProfileImpl(values, {
        getSession: dependencies.getSession,
        hasDatabase: dependencies.hasDatabase,
        dbClient: dependencies.dbClient,
        revalidateSurfaces,
      });
    },
  };
}

export async function createSettingsActionHandlers(dependencies: SettingsActionDependencies) {
  return buildSettingsActionHandlers(dependencies);
}

const settingsActionHandlers = buildSettingsActionHandlers({
  getSession: auth,
  hasDatabase: hasDatabaseUrl,
  dbClient: db,
  revalidatePath,
  updateSettingsProfileImpl: updateSettingsProfile,
});

export const updateSettingsProfileAction =
  settingsActionHandlers.updateSettingsProfileAction;