import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import { upsertCompleteDayReflection, upsertQuickMoodCapture } from "./mutations";

type MoodDependencies = Parameters<typeof upsertCompleteDayReflection>[1];

type Operation = {
  type: string;
  payload?: unknown;
};

function createDependencies(options?: {
  userId?: string | null;
  hasDatabase?: boolean;
  existingEntry?: {
    id: string;
    reflectionCompletedAt: Date | null;
    periods: Array<{ id: string }>;
  } | null;
}) {
  const operations: Operation[] = [];
  const hasDatabase = options?.hasDatabase ?? true;

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
      moodEntry: hasDatabase
        ? {
            findUnique: async (payload: unknown) => {
              operations.push({ type: "findUnique", payload });
              return options?.existingEntry ?? null;
            },
            upsert: async (payload: unknown) => {
              operations.push({ type: "upsert", payload });
            },
          } as unknown as MoodDependencies["moodEntry"]
        : null,
      revalidateSurfaces: () => {
        operations.push({ type: "revalidate" });
      },
    } satisfies MoodDependencies,
  };
}

test("upsertCompleteDayReflection persists a normalized summary with sorted periods and merged tags", async () => {
  const { dependencies, operations } = createDependencies();

  const result = await upsertCompleteDayReflection(
    {
      day: "2030-05-10T18:45:00.000Z",
      sleepHours: 7.5,
      sleepQuality: 4,
      workStress: 2,
      socialQuality: 5,
      notes: "  A steadier day after a rough start.  ",
      tags: ["Focus", "evening"],
      periods: [
        {
          startMinute: 720,
          endMinute: 1020,
          score: 74,
          notes: "  Better after lunch.  ",
          tags: ["social", "Focus"],
        },
        {
          startMinute: 480,
          endMinute: 720,
          score: 58,
          notes: "  A bit flat early on.  ",
          tags: ["steady", "focus"],
        },
      ],
    },
    dependencies
  );

  assert.deepEqual(result, { ok: true });
  assert.deepEqual(operations.map((operation) => operation.type), ["upsert", "revalidate"]);

  const upsertPayload = operations[0]?.payload as {
    where: { userId_day: { userId: string; day: Date } };
    create: {
      score: number;
      energy: number | null;
      stress: number | null;
      moodStability: number | null;
      notes: string | null;
      tags: string[];
      reflectionCompletedAt: Date;
      periods: {
        create: Array<{
          startMinute: number;
          endMinute: number;
          notes: string | null;
          tags: string[];
        }>;
      };
    };
    update: {
      periods: {
        deleteMany: Record<string, never>;
        create: Array<{
          startMinute: number;
          endMinute: number;
        }>;
      };
    };
  };

  assert.equal(upsertPayload.where.userId_day.userId, "user-1");
  assert.equal(upsertPayload.where.userId_day.day.getHours(), 0);
  assert.equal(upsertPayload.where.userId_day.day.getMinutes(), 0);
  assert.equal(upsertPayload.create.score, 67);
  assert.equal(upsertPayload.create.energy, 73);
  assert.equal(upsertPayload.create.stress, 41);
  assert.equal(upsertPayload.create.moodStability, 68);
  assert.equal(upsertPayload.create.notes, "A steadier day after a rough start.");
  assert.deepEqual(upsertPayload.create.tags, ["focus", "evening", "steady", "social"]);
  assert.ok(upsertPayload.create.reflectionCompletedAt instanceof Date);
  assert.deepEqual(upsertPayload.create.periods.create, [
    {
      userId: "user-1",
      day: upsertPayload.where.userId_day.day,
      startMinute: 480,
      endMinute: 720,
      score: 58,
      notes: "A bit flat early on.",
      tags: ["steady", "focus"],
    },
    {
      userId: "user-1",
      day: upsertPayload.where.userId_day.day,
      startMinute: 720,
      endMinute: 1020,
      score: 74,
      notes: "Better after lunch.",
      tags: ["social", "focus"],
    },
  ]);
  assert.deepEqual(upsertPayload.update.periods.deleteMany, {});
});

test("upsertQuickMoodCapture creates a quick entry when no full reflection exists", async () => {
  const { dependencies, operations } = createDependencies();

  const result = await upsertQuickMoodCapture(
    {
      day: "2030-05-10T18:45:00.000Z",
      score: 63,
      notes: "  Stable enough to keep going.  ",
    },
    dependencies
  );

  assert.equal(result.ok, true);
  assert.equal(result.score, 63);
  assert.equal(result.notes, "Stable enough to keep going.");
  assert.deepEqual(operations.map((operation) => operation.type), ["findUnique", "upsert", "revalidate"]);

  const findUniquePayload = operations[0]?.payload as {
    where: {
      userId_day: {
        userId: string;
        day: Date;
      };
    };
  };
  const upsertPayload = operations[1]?.payload as {
    create: {
      day: Date;
      score: number;
      notes: string | null;
      tags: string[];
    };
    update: {
      score: number;
      notes: string | null;
    };
  };

  assert.equal(findUniquePayload.where.userId_day.userId, "user-1");
  assert.equal(findUniquePayload.where.userId_day.day.toISOString(), result.dayIso);
  assert.equal(upsertPayload.create.score, 63);
  assert.equal(upsertPayload.create.notes, "Stable enough to keep going.");
  assert.deepEqual(upsertPayload.create.tags, []);
  assert.equal(upsertPayload.create.day.toISOString(), result.dayIso);
  assert.equal(upsertPayload.update.score, 63);
  assert.equal(upsertPayload.update.notes, "Stable enough to keep going.");
});

test("upsertQuickMoodCapture rejects saving when a full reflection already exists", async () => {
  const { dependencies, operations } = createDependencies({
    existingEntry: {
      id: "mood-1",
      reflectionCompletedAt: new Date("2030-05-10T20:00:00.000Z"),
      periods: [],
    },
  });

  await assert.rejects(
    () =>
      upsertQuickMoodCapture(
        {
          day: "2030-05-10T18:45:00.000Z",
          score: 63,
        },
        dependencies
      ),
    /A full reflection already exists for today\. Open Mood to revise it\./
  );

  assert.deepEqual(operations.map((operation) => operation.type), ["findUnique"]);
});

test("upsertCompleteDayReflection rejects invalid payloads before persistence", async () => {
  const { dependencies, operations } = createDependencies();

  await assert.rejects(
    () =>
      upsertCompleteDayReflection(
        {
          day: "2030-05-10T18:45:00.000Z",
          periods: [],
        },
        dependencies
      ),
    ZodError
  );

  assert.deepEqual(operations, []);
});

test("upsertQuickMoodCapture rejects unauthorized access before touching persistence", async () => {
  const { dependencies, operations } = createDependencies({ userId: null });

  await assert.rejects(
    () =>
      upsertQuickMoodCapture(
        {
          day: "2030-05-10T18:45:00.000Z",
          score: 63,
        },
        dependencies
      ),
    /Unauthorized/
  );

  assert.deepEqual(operations, []);
});