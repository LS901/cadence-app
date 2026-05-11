import type { Activity, ActivityCategory, Prisma, PrismaClient } from "@prisma/client";
import {
  activityMutationSchema,
  activityStatusSchema,
  normalizeActivityFormValues,
  normalizeActivityStatusMutation,
} from "@/lib/validation/activity";

type SessionResult =
  | {
      user?: {
        id?: string | null;
      } | null;
    }
  | null
  | undefined;

type PlannerActivityRecord = Activity;

type PlannerDbClient = PrismaClient | Prisma.TransactionClient;

type PlannerMutationDependencies = {
  getSession: () => Promise<SessionResult>;
  hasDatabase: boolean;
  dbClient: PlannerDbClient | null | undefined;
  ensureActivityTemplatesForUser: (client: PlannerDbClient, userId: string) => Promise<void>;
  resolveActivityTemplate: (
    client: PlannerDbClient,
    userId: string,
    input: {
      templateId?: string | null;
      title: string;
      category: ActivityCategory;
      notes?: string;
      durationMinutes?: number;
    }
  ) => Promise<string>;
  extendRecurringSeries: (
    client: PlannerDbClient,
    activity: PlannerActivityRecord & { recurrenceGroupId: string | null }
  ) => Promise<void>;
  pruneFutureGeneratedOccurrences: (
    client: PlannerDbClient,
    activity: Pick<PlannerActivityRecord, "id" | "userId" | "recurrenceGroupId">
  ) => Promise<void>;
  revalidateSurfaces: () => void;
  now?: () => Date;
};

async function requirePlannerAccess(dependencies: PlannerMutationDependencies) {
  const session = await dependencies.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (!dependencies.hasDatabase || !dependencies.dbClient) {
    throw new Error("Planner editing requires a configured database connection.");
  }

  return {
    userId,
    dbClient: dependencies.dbClient,
  };
}

export async function upsertActivity(values: unknown, dependencies: PlannerMutationDependencies) {
  const { userId, dbClient } = await requirePlannerAccess(dependencies);
  const parsedValues = activityMutationSchema.parse(values);
  const normalizedValues = normalizeActivityFormValues(parsedValues);

  await dependencies.ensureActivityTemplatesForUser(dbClient, userId);

  const templateId = await dependencies.resolveActivityTemplate(dbClient, userId, {
    templateId: parsedValues.templateId || null,
    title: normalizedValues.title,
    category: normalizedValues.category,
    notes: normalizedValues.notes,
    durationMinutes: normalizedValues.durationMinutes,
  });

  if (parsedValues.id) {
    const existingActivity = await dbClient.activity.findFirst({
      where: {
        id: parsedValues.id,
        userId,
      },
      select: {
        id: true,
        recurrenceGroupId: true,
        isRecurringGenerated: true,
      },
    });

    if (!existingActivity) {
      throw new Error("Activity not found.");
    }

    await dbClient.activity.update({
      where: {
        id: parsedValues.id,
      },
      data: {
        ...normalizedValues,
        templateId,
        recurrenceGroupId:
          normalizedValues.recurring && !existingActivity.isRecurringGenerated
            ? existingActivity.recurrenceGroupId ?? existingActivity.id
            : existingActivity.recurrenceGroupId,
      },
    });

    const updatedActivity = await dbClient.activity.findUniqueOrThrow({
      where: {
        id: parsedValues.id,
      },
    });

    if (updatedActivity.isRecurringGenerated) {
      dependencies.revalidateSurfaces();

      return {
        ok: true,
        mode: "updated" as const,
      };
    }

    if (
      updatedActivity.recurring &&
      updatedActivity.recurrencePattern &&
      updatedActivity.recurrencePattern !== "CUSTOM"
    ) {
      await dependencies.extendRecurringSeries(dbClient, {
        ...updatedActivity,
        recurrenceGroupId: updatedActivity.recurrenceGroupId ?? updatedActivity.id,
      });
    } else {
      await dependencies.pruneFutureGeneratedOccurrences(dbClient, updatedActivity);
    }

    dependencies.revalidateSurfaces();

    return {
      ok: true,
      mode: "updated" as const,
    };
  }

  const createdActivity = await dbClient.activity.create({
    data: {
      ...normalizedValues,
      userId,
      templateId,
      status: parsedValues.entryMode === "RETROSPECTIVE" ? "COMPLETED" : "SCHEDULED",
      completedAt:
        parsedValues.entryMode === "RETROSPECTIVE" ? normalizedValues.scheduledAt : null,
      skippedAt: null,
      completionMoodScore:
        parsedValues.entryMode === "RETROSPECTIVE"
          ? normalizedValues.completionMoodScore ?? null
          : null,
    },
  });

  if (
    parsedValues.entryMode === "PLANNED" &&
    normalizedValues.recurring &&
    normalizedValues.recurrencePattern &&
    normalizedValues.recurrencePattern !== "CUSTOM"
  ) {
    const recurringRoot = await dbClient.activity.update({
      where: { id: createdActivity.id },
      data: {
        recurrenceGroupId: createdActivity.id,
      },
    });

    await dependencies.extendRecurringSeries(dbClient, {
      ...recurringRoot,
      recurrenceGroupId: recurringRoot.id,
    });
  }

  dependencies.revalidateSurfaces();

  return {
    ok: true,
    mode: "created" as const,
  };
}

export async function updateActivityStatus(
  values: unknown,
  dependencies: PlannerMutationDependencies
) {
  const { userId, dbClient } = await requirePlannerAccess(dependencies);
  const normalizedValues = normalizeActivityStatusMutation(values);

  const existingActivity = await dbClient.activity.findFirst({
    where: {
      id: normalizedValues.id,
      userId,
    },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      completedAt: true,
      completionMoodScore: true,
      recurrenceGroupId: true,
      isRecurringGenerated: true,
    },
  });

  if (!existingActivity) {
    throw new Error("Activity not found.");
  }

  const nextStatus = activityStatusSchema.parse(normalizedValues.status);
  const now = dependencies.now?.() ?? new Date();

  if (nextStatus === "COMPLETED" && existingActivity.scheduledAt > now) {
    throw new Error("You can only complete activities once their scheduled time has arrived.");
  }

  await dbClient.activity.update({
    where: {
      id: normalizedValues.id,
    },
    data:
      nextStatus === "COMPLETED"
        ? {
            status: nextStatus,
            completedAt: existingActivity.completedAt ?? now,
            skippedAt: null,
            completionMoodScore:
              normalizedValues.completionMoodScore ??
              existingActivity.completionMoodScore ??
              null,
          }
        : nextStatus === "SKIPPED"
          ? {
              status: nextStatus,
              skippedAt: now,
              completedAt: null,
              completionMoodScore: null,
            }
          : {
              status: nextStatus,
              completedAt: null,
              skippedAt: null,
              completionMoodScore: null,
            },
  });

  dependencies.revalidateSurfaces();

  return {
    ok: true,
    status: nextStatus,
  };
}

export async function deleteActivity(activityId: string, dependencies: PlannerMutationDependencies) {
  const { userId, dbClient } = await requirePlannerAccess(dependencies);

  const activity = await dbClient.activity.findFirst({
    where: {
      id: activityId,
      userId,
    },
    select: {
      id: true,
      recurrenceGroupId: true,
      isRecurringGenerated: true,
    },
  });

  if (!activity) {
    throw new Error("Activity not found.");
  }

  if (!activity.isRecurringGenerated && activity.recurrenceGroupId) {
    await dependencies.pruneFutureGeneratedOccurrences(dbClient, {
      id: activity.id,
      userId,
      recurrenceGroupId: activity.recurrenceGroupId,
    });
  }

  await dbClient.activity.deleteMany({
    where: {
      id: activityId,
      userId,
    },
  });

  dependencies.revalidateSurfaces();

  return {
    ok: true,
  };
}