"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertWritableDemoSession } from "@/lib/auth/read-only-demo";
import { db, hasDatabaseUrl } from "@/lib/db";
import {
  ensureActivityTemplatesForUser,
  extendRecurringSeries,
  pruneFutureGeneratedOccurrences,
  resolveActivityTemplate,
} from "@/server/planner/automation";
import { deleteActivity, updateActivityStatus, upsertActivity } from "./mutations";

type PlannerActionDependencies = {
  getSession: typeof auth;
  hasDatabase: boolean;
  dbClient: typeof db;
  ensureActivityTemplatesForUserImpl: typeof ensureActivityTemplatesForUser;
  resolveActivityTemplateImpl: typeof resolveActivityTemplate;
  extendRecurringSeriesImpl: typeof extendRecurringSeries;
  pruneFutureGeneratedOccurrencesImpl: typeof pruneFutureGeneratedOccurrences;
  revalidatePath: typeof revalidatePath;
  upsertActivityImpl: typeof upsertActivity;
  updateActivityStatusImpl: typeof updateActivityStatus;
  deleteActivityImpl: typeof deleteActivity;
};

function createPlannerRevalidateSurfaces(revalidatePathImpl: typeof revalidatePath) {
  return function revalidatePlannerSurfaces() {
    revalidatePathImpl("/planner");
    revalidatePathImpl("/dashboard");
  };
}

function buildPlannerActionHandlers(dependencies: PlannerActionDependencies) {
  const revalidateSurfaces = createPlannerRevalidateSurfaces(dependencies.revalidatePath);

  const sharedDependencies = {
    getSession: dependencies.getSession,
    hasDatabase: dependencies.hasDatabase,
    dbClient: dependencies.dbClient,
    ensureActivityTemplatesForUser: dependencies.ensureActivityTemplatesForUserImpl,
    resolveActivityTemplate: dependencies.resolveActivityTemplateImpl,
    extendRecurringSeries: dependencies.extendRecurringSeriesImpl,
    pruneFutureGeneratedOccurrences: dependencies.pruneFutureGeneratedOccurrencesImpl,
    revalidateSurfaces,
  };

  return {
    async upsertActivityAction(values: unknown) {
      await assertWritableDemoSession(dependencies.getSession);
      return dependencies.upsertActivityImpl(values, sharedDependencies);
    },

    async updateActivityStatusAction(values: unknown) {
      await assertWritableDemoSession(dependencies.getSession);
      return dependencies.updateActivityStatusImpl(values, sharedDependencies);
    },

    async deleteActivityAction(activityId: string) {
      await assertWritableDemoSession(dependencies.getSession);
      return dependencies.deleteActivityImpl(activityId, sharedDependencies);
    },
  };
}

export async function createPlannerActionHandlers(dependencies: PlannerActionDependencies) {
  return buildPlannerActionHandlers(dependencies);
}

const plannerActionHandlers = buildPlannerActionHandlers({
  getSession: auth,
  hasDatabase: hasDatabaseUrl,
  dbClient: db,
  ensureActivityTemplatesForUserImpl: ensureActivityTemplatesForUser,
  resolveActivityTemplateImpl: resolveActivityTemplate,
  extendRecurringSeriesImpl: extendRecurringSeries,
  pruneFutureGeneratedOccurrencesImpl: pruneFutureGeneratedOccurrences,
  revalidatePath,
  upsertActivityImpl: upsertActivity,
  updateActivityStatusImpl: updateActivityStatus,
  deleteActivityImpl: deleteActivity,
});

export const upsertActivityAction = plannerActionHandlers.upsertActivityAction;
export const updateActivityStatusAction = plannerActionHandlers.updateActivityStatusAction;
export const deleteActivityAction = plannerActionHandlers.deleteActivityAction;