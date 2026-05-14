"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertWritableDemoSession } from "@/lib/auth/read-only-demo";
import { db, hasDatabaseUrl } from "@/lib/db";
import { syncLifeEventDayExposuresForUser } from "@/server/life-events/day-exposures";
import { deleteLifeEvent, upsertLifeEvent } from "./mutations";

type LifeEventActionDependencies = {
  getSession: typeof auth;
  hasDatabase: boolean;
  dbClient: typeof db;
  syncDayExposuresImpl: typeof syncLifeEventDayExposuresForUser;
  revalidatePath: typeof revalidatePath;
  upsertLifeEventImpl: typeof upsertLifeEvent;
  deleteLifeEventImpl: typeof deleteLifeEvent;
};

function createLifeEventRevalidateSurfaces(revalidatePathImpl: typeof revalidatePath) {
  return function revalidateLifeEventSurfaces() {
    revalidatePathImpl("/life-events");
    revalidatePathImpl("/insights");
    revalidatePathImpl("/dashboard");
    revalidatePathImpl("/mood");
    revalidatePathImpl("/journal");
  };
}

function buildLifeEventActionHandlers(dependencies: LifeEventActionDependencies) {
  const revalidateSurfaces = createLifeEventRevalidateSurfaces(dependencies.revalidatePath);

  const sharedDependencies = {
    getSession: dependencies.getSession,
    hasDatabase: dependencies.hasDatabase,
    dbClient: dependencies.dbClient,
    syncDayExposures: dependencies.syncDayExposuresImpl,
    revalidateSurfaces,
  };

  return {
    async upsertLifeEventAction(values: unknown) {
      await assertWritableDemoSession(dependencies.getSession);
      return dependencies.upsertLifeEventImpl(values, sharedDependencies);
    },

    async deleteLifeEventAction(values: unknown) {
      await assertWritableDemoSession(dependencies.getSession);
      return dependencies.deleteLifeEventImpl(values, sharedDependencies);
    },
  };
}

export async function createLifeEventActionHandlers(dependencies: LifeEventActionDependencies) {
  return buildLifeEventActionHandlers(dependencies);
}

const lifeEventActionHandlers = buildLifeEventActionHandlers({
  getSession: auth,
  hasDatabase: hasDatabaseUrl,
  dbClient: db,
  syncDayExposuresImpl: syncLifeEventDayExposuresForUser,
  revalidatePath,
  upsertLifeEventImpl: upsertLifeEvent,
  deleteLifeEventImpl: deleteLifeEvent,
});

export const upsertLifeEventAction = lifeEventActionHandlers.upsertLifeEventAction;
export const deleteLifeEventAction = lifeEventActionHandlers.deleteLifeEventAction;