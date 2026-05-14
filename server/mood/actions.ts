"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { assertWritableDemoSession } from "@/lib/auth/read-only-demo";
import { db, hasDatabaseUrl } from "@/lib/db";
import { upsertCompleteDayReflection, upsertQuickMoodCapture } from "./mutations";

type MoodMutationDependencies = Parameters<typeof upsertCompleteDayReflection>[1];

type MoodActionDependencies = {
  getSession: MoodMutationDependencies["getSession"];
  hasDatabase: MoodMutationDependencies["hasDatabase"];
  moodEntry: MoodMutationDependencies["moodEntry"];
  revalidatePath: typeof revalidatePath;
  upsertCompleteDayReflectionImpl: (
    values: unknown,
    dependencies: MoodMutationDependencies
  ) => Promise<unknown>;
  upsertQuickMoodCaptureImpl: (
    values: unknown,
    dependencies: MoodMutationDependencies
  ) => Promise<unknown>;
};

function createMoodRevalidateSurfaces(revalidatePathImpl: typeof revalidatePath) {
  return function revalidateMoodSurfaces() {
    revalidatePathImpl("/mood");
    revalidatePathImpl("/insights");
    revalidatePathImpl("/dashboard");
    revalidatePathImpl("/planner");
  };
}

function buildMoodActionHandlers(dependencies: MoodActionDependencies) {
  const revalidateSurfaces = createMoodRevalidateSurfaces(dependencies.revalidatePath);

  return {
    async upsertCompleteDayReflectionAction(values: unknown) {
      await assertWritableDemoSession(dependencies.getSession);
      return dependencies.upsertCompleteDayReflectionImpl(values, {
        getSession: dependencies.getSession,
        hasDatabase: dependencies.hasDatabase,
        moodEntry: dependencies.moodEntry,
        revalidateSurfaces,
      });
    },

    async upsertQuickMoodCaptureAction(values: unknown) {
      await assertWritableDemoSession(dependencies.getSession);
      return dependencies.upsertQuickMoodCaptureImpl(values, {
        getSession: dependencies.getSession,
        hasDatabase: dependencies.hasDatabase,
        moodEntry: dependencies.moodEntry,
        revalidateSurfaces,
      });
    },
  };
}

export async function createMoodActionHandlers(dependencies: MoodActionDependencies) {
  return buildMoodActionHandlers(dependencies);
}

const moodActionHandlers = buildMoodActionHandlers({
  getSession: auth,
  hasDatabase: hasDatabaseUrl,
  moodEntry: db?.moodEntry,
  revalidatePath,
  upsertCompleteDayReflectionImpl: upsertCompleteDayReflection,
  upsertQuickMoodCaptureImpl: upsertQuickMoodCapture,
});

export const upsertCompleteDayReflectionAction = moodActionHandlers.upsertCompleteDayReflectionAction;
export const upsertQuickMoodCaptureAction = moodActionHandlers.upsertQuickMoodCaptureAction;