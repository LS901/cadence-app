import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import { deleteActivity, updateActivityStatus, upsertActivity } from "./mutations";

type PlannerDependencies = Parameters<typeof upsertActivity>[1];

type Operation = {
  type: string;
  payload?: unknown;
};

function createActivityRecord(overrides?: Partial<{
  id: string;
  userId: string;
  templateId: string | null;
  title: string;
  category: string;
  notes: string | null;
  recurring: boolean;
  recurrencePattern: string | null;
  recurrenceCustom: string | null;
  recurrenceGroupId: string | null;
  isRecurringGenerated: boolean;
  scheduledAt: Date;
  status: string;
  durationMinutes: number | null;
  completedAt: Date | null;
  skippedAt: Date | null;
  completionMoodScore: number | null;
}>) {
  return {
    id: overrides?.id ?? "activity-1",
    userId: overrides?.userId ?? "user-1",
    templateId: overrides?.templateId ?? "template-1",
    title: overrides?.title ?? "Evening walk",
    category: overrides?.category ?? "EXERCISE",
    notes: overrides?.notes ?? "Reset after work.",
    recurring: overrides?.recurring ?? false,
    recurrencePattern: overrides?.recurrencePattern ?? null,
    recurrenceCustom: overrides?.recurrenceCustom ?? null,
    recurrenceGroupId: overrides?.recurrenceGroupId ?? null,
    isRecurringGenerated: overrides?.isRecurringGenerated ?? false,
    scheduledAt: overrides?.scheduledAt ?? new Date("2030-05-10T18:30:00.000Z"),
    status: overrides?.status ?? "SCHEDULED",
    durationMinutes: overrides?.durationMinutes ?? 45,
    completedAt: overrides?.completedAt ?? null,
    skippedAt: overrides?.skippedAt ?? null,
    completionMoodScore: overrides?.completionMoodScore ?? null,
  };
}

function createDependencies(options?: {
  userId?: string | null;
  hasDatabase?: boolean;
  findFirstResults?: Array<ReturnType<typeof createActivityRecord> | null>;
  findUniqueResult?: ReturnType<typeof createActivityRecord>;
  resolvedTemplateId?: string;
  now?: Date;
}) {
  const operations: Operation[] = [];
  const hasDatabase = options?.hasDatabase ?? true;
  const findFirstQueue = [...(options?.findFirstResults ?? [])];

  const activity = {
    findFirst: async (payload: unknown) => {
      operations.push({ type: "activity.findFirst", payload });
      return findFirstQueue.shift() ?? null;
    },
    findUniqueOrThrow: async (payload: unknown) => {
      operations.push({ type: "activity.findUniqueOrThrow", payload });
      return options?.findUniqueResult ?? createActivityRecord();
    },
    create: async (payload: { data: Record<string, unknown> }) => {
      operations.push({ type: "activity.create", payload });
      return createActivityRecord({
        id: "activity-created",
        userId: payload.data.userId as string,
        templateId: (payload.data.templateId as string | null | undefined) ?? null,
        title: payload.data.title as string,
        category: payload.data.category as string,
        notes: (payload.data.notes as string | null | undefined) ?? null,
        recurring: Boolean(payload.data.recurring),
        recurrencePattern: (payload.data.recurrencePattern as string | null | undefined) ?? null,
        recurrenceCustom: (payload.data.recurrenceCustom as string | null | undefined) ?? null,
        recurrenceGroupId: (payload.data.recurrenceGroupId as string | null | undefined) ?? null,
        scheduledAt: payload.data.scheduledAt as Date,
        status: payload.data.status as string,
        durationMinutes: (payload.data.durationMinutes as number | null | undefined) ?? null,
        completedAt: (payload.data.completedAt as Date | null | undefined) ?? null,
        skippedAt: (payload.data.skippedAt as Date | null | undefined) ?? null,
        completionMoodScore: (payload.data.completionMoodScore as number | null | undefined) ?? null,
      });
    },
    update: async (payload: { where: { id: string }; data: Record<string, unknown> }) => {
      operations.push({ type: "activity.update", payload });
      return createActivityRecord({
        id: payload.where.id,
        recurrenceGroupId:
          (payload.data.recurrenceGroupId as string | null | undefined) ?? "activity-group",
        recurring: Boolean(payload.data.recurring ?? true),
        recurrencePattern: (payload.data.recurrencePattern as string | null | undefined) ?? "DAILY",
        scheduledAt: (payload.data.scheduledAt as Date | undefined) ?? new Date("2030-05-10T18:30:00.000Z"),
        status: (payload.data.status as string | undefined) ?? "SCHEDULED",
        completedAt: (payload.data.completedAt as Date | null | undefined) ?? null,
        skippedAt: (payload.data.skippedAt as Date | null | undefined) ?? null,
        completionMoodScore: (payload.data.completionMoodScore as number | null | undefined) ?? null,
      });
    },
    deleteMany: async (payload: unknown) => {
      operations.push({ type: "activity.deleteMany", payload });
    },
  };

  return {
    operations,
    dependencies: {
      getSession: async () =>
        options?.userId === null
          ? null
          : {
              user: {
                id: options?.userId ?? "user-1",
              },
            },
      hasDatabase,
      dbClient: hasDatabase ? ({ activity } as unknown as PlannerDependencies["dbClient"]) : null,
      ensureActivityTemplatesForUser: async (_client: unknown, userId: string) => {
        operations.push({ type: "ensureTemplates", payload: userId });
      },
      resolveActivityTemplate: async (_client: unknown, userId: string, input: unknown) => {
        operations.push({ type: "resolveTemplate", payload: { userId, input } });
        return options?.resolvedTemplateId ?? "template-resolved";
      },
      extendRecurringSeries: async (_client: unknown, sourceActivity: unknown) => {
        operations.push({ type: "extendRecurringSeries", payload: sourceActivity });
      },
      pruneFutureGeneratedOccurrences: async (_client: unknown, sourceActivity: unknown) => {
        operations.push({ type: "pruneFutureGeneratedOccurrences", payload: sourceActivity });
      },
      revalidateSurfaces: () => {
        operations.push({ type: "revalidate" });
      },
      now: () => options?.now ?? new Date("2030-05-10T19:00:00.000Z"),
    } satisfies PlannerDependencies,
  };
}

function createActivityInput() {
  return {
    templateId: "",
    title: "  Evening walk  ",
    category: "EXERCISE",
    notes: "  Reset after work.  ",
    recurring: true,
    recurrencePattern: "DAILY",
    recurrenceCustom: "",
    scheduledAt: "2030-05-10T18:30:00.000Z",
    durationMinutes: "45",
    completionMoodScore: "72",
    entryMode: "PLANNED",
  };
}

test("upsertActivity creates a planned recurring activity, seeds its group, extends the series, and revalidates", async () => {
  const { dependencies, operations } = createDependencies();

  const result = await upsertActivity(createActivityInput(), dependencies);

  assert.deepEqual(result, {
    ok: true,
    mode: "created",
  });
  assert.deepEqual(operations.map((operation) => operation.type), [
    "ensureTemplates",
    "resolveTemplate",
    "activity.create",
    "activity.update",
    "extendRecurringSeries",
    "revalidate",
  ]);

  const createPayload = operations[2]?.payload as { data: Record<string, unknown> };
  const recurrenceUpdatePayload = operations[3]?.payload as {
    where: { id: string };
    data: { recurrenceGroupId: string };
  };

  assert.equal(createPayload.data.userId, "user-1");
  assert.equal(createPayload.data.templateId, "template-resolved");
  assert.equal(createPayload.data.status, "SCHEDULED");
  assert.equal(createPayload.data.completedAt, null);
  assert.equal(createPayload.data.completionMoodScore, null);
  assert.deepEqual(recurrenceUpdatePayload, {
    where: { id: "activity-created" },
    data: { recurrenceGroupId: "activity-created" },
  });
});

test("upsertActivity updates a generated occurrence without extending or pruning recurrence automation", async () => {
  const { dependencies, operations } = createDependencies({
    findFirstResults: [
      createActivityRecord({
        id: "activity-generated",
        isRecurringGenerated: true,
        recurrenceGroupId: "group-1",
      }),
    ],
    findUniqueResult: createActivityRecord({
      id: "activity-generated",
      isRecurringGenerated: true,
      recurrenceGroupId: "group-1",
      recurring: true,
      recurrencePattern: "DAILY",
    }),
  });

  const result = await upsertActivity(
    {
      ...createActivityInput(),
      id: "activity-generated",
    },
    dependencies
  );

  assert.deepEqual(result, {
    ok: true,
    mode: "updated",
  });
  assert.deepEqual(operations.map((operation) => operation.type), [
    "ensureTemplates",
    "resolveTemplate",
    "activity.findFirst",
    "activity.update",
    "activity.findUniqueOrThrow",
    "revalidate",
  ]);
});

test("updateActivityStatus completes an eligible activity and stamps completion data", async () => {
  const { dependencies, operations } = createDependencies({
    findFirstResults: [
      createActivityRecord({
        id: "activity-status",
        scheduledAt: new Date("2030-05-10T18:00:00.000Z"),
        completionMoodScore: 58,
      }),
    ],
    now: new Date("2030-05-10T19:00:00.000Z"),
  });

  const result = await updateActivityStatus(
    {
      id: "activity-status",
      status: "COMPLETED",
      completionMoodScore: "64",
    },
    dependencies
  );

  assert.deepEqual(result, {
    ok: true,
    status: "COMPLETED",
  });
  assert.deepEqual(operations.map((operation) => operation.type), [
    "activity.findFirst",
    "activity.update",
    "revalidate",
  ]);

  const updatePayload = operations[1]?.payload as { data: Record<string, unknown> };
  assert.equal(updatePayload.data.status, "COMPLETED");
  assert.equal((updatePayload.data.completedAt as Date).toISOString(), "2030-05-10T19:00:00.000Z");
  assert.equal(updatePayload.data.skippedAt, null);
  assert.equal(updatePayload.data.completionMoodScore, 64);
});

test("updateActivityStatus rejects completing an activity before its scheduled time", async () => {
  const { dependencies, operations } = createDependencies({
    findFirstResults: [
      createActivityRecord({
        id: "activity-future",
        scheduledAt: new Date("2030-05-10T20:00:00.000Z"),
      }),
    ],
    now: new Date("2030-05-10T19:00:00.000Z"),
  });

  await assert.rejects(
    () =>
      updateActivityStatus(
        {
          id: "activity-future",
          status: "COMPLETED",
        },
        dependencies
      ),
    /You can only complete activities once their scheduled time has arrived\./
  );

  assert.deepEqual(operations.map((operation) => operation.type), ["activity.findFirst"]);
});

test("deleteActivity prunes future generated occurrences for a recurring root before deleting it", async () => {
  const { dependencies, operations } = createDependencies({
    findFirstResults: [
      createActivityRecord({
        id: "activity-delete",
        recurrenceGroupId: "group-delete",
        isRecurringGenerated: false,
      }),
    ],
  });

  const result = await deleteActivity("activity-delete", dependencies);

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(operations.map((operation) => operation.type), [
    "activity.findFirst",
    "pruneFutureGeneratedOccurrences",
    "activity.deleteMany",
    "revalidate",
  ]);
});

test("upsertActivity rejects invalid payloads before touching planner dependencies", async () => {
  const { dependencies, operations } = createDependencies();

  await assert.rejects(
    () =>
      upsertActivity(
        {
          ...createActivityInput(),
          title: "A",
        },
        dependencies
      ),
    ZodError
  );

  assert.deepEqual(operations, []);
});

test("deleteActivity rejects unauthorized access before touching persistence", async () => {
  const { dependencies, operations } = createDependencies({ userId: null });

  await assert.rejects(() => deleteActivity("activity-delete", dependencies), /Unauthorized/);

  assert.deepEqual(operations, []);
});