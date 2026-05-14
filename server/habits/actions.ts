"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertWritableDemoSession } from "@/lib/auth/read-only-demo";
import { db, hasDatabaseUrl } from "@/lib/db";
import { archiveHabit, upsertHabit, upsertHabitLog } from "./mutations";

type HabitMutationDependencies = Parameters<typeof upsertHabit>[1];

type HabitActionDependencies = {
  getSession: HabitMutationDependencies["getSession"];
  hasDatabase: HabitMutationDependencies["hasDatabase"];
  habit: HabitMutationDependencies["habit"];
  habitLog: HabitMutationDependencies["habitLog"];
  revalidatePath: typeof revalidatePath;
  upsertHabitImpl: (
    values: unknown,
    dependencies: HabitMutationDependencies
  ) => Promise<unknown>;
  archiveHabitImpl: (
    values: unknown,
    dependencies: HabitMutationDependencies
  ) => Promise<unknown>;
  upsertHabitLogImpl: (
    values: unknown,
    dependencies: HabitMutationDependencies
  ) => Promise<unknown>;
};

function createHabitRevalidateSurfaces(revalidatePathImpl: typeof revalidatePath) {
  return function revalidateHabitSurfaces() {
    revalidatePathImpl("/habits");
    revalidatePathImpl("/dashboard");
    revalidatePathImpl("/insights");
  };
}

function buildHabitActionHandlers(dependencies: HabitActionDependencies) {
  const revalidateSurfaces = createHabitRevalidateSurfaces(dependencies.revalidatePath);

  const sharedDependencies = {
    getSession: dependencies.getSession,
    hasDatabase: dependencies.hasDatabase,
    habit: dependencies.habit,
    habitLog: dependencies.habitLog,
    revalidateSurfaces,
  };

  return {
    async upsertHabitAction(values: unknown) {
      await assertWritableDemoSession(dependencies.getSession);
      return dependencies.upsertHabitImpl(values, sharedDependencies);
    },

    async archiveHabitAction(values: unknown) {
      await assertWritableDemoSession(dependencies.getSession);
      return dependencies.archiveHabitImpl(values, sharedDependencies);
    },

    async upsertHabitLogAction(values: unknown) {
      await assertWritableDemoSession(dependencies.getSession);
      return dependencies.upsertHabitLogImpl(values, sharedDependencies);
    },
  };
}

export async function createHabitActionHandlers(dependencies: HabitActionDependencies) {
  return buildHabitActionHandlers(dependencies);
}

const habitActionHandlers = buildHabitActionHandlers({
  getSession: auth,
  hasDatabase: hasDatabaseUrl,
  habit: db?.habit,
  habitLog: db?.habitLog,
  revalidatePath,
  upsertHabitImpl: upsertHabit,
  archiveHabitImpl: archiveHabit,
  upsertHabitLogImpl: upsertHabitLog,
});

export const upsertHabitAction = habitActionHandlers.upsertHabitAction;
export const archiveHabitAction = habitActionHandlers.archiveHabitAction;
export const upsertHabitLogAction = habitActionHandlers.upsertHabitLogAction;