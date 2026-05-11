import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { startOfDay } from "date-fns";
import { habitSchema } from "@/lib/validation/habit";

const habitMutationSchema = habitSchema.extend({
  id: z.string().min(1).optional(),
});

const archiveHabitSchema = z.object({
  id: z.string().min(1),
});

const habitLogMutationSchema = z.object({
  habitId: z.string().min(1),
  day: z.string().optional(),
  status: z.enum(["COMPLETED", "SKIPPED"]).nullable(),
});

type SessionResult =
  | {
      user?: {
        id?: string | null;
      } | null;
    }
  | null
  | undefined;

type HabitPayload = {
  name: string;
  category: z.infer<typeof habitSchema>["category"];
  type: z.infer<typeof habitSchema>["type"];
  targetPerWeek: number;
  notes: string | null;
};

type HabitDelegate = PrismaClient["habit"];

type HabitLogDelegate = PrismaClient["habitLog"];

type HabitMutationDependencies = {
  getSession: () => Promise<SessionResult>;
  hasDatabase: boolean;
  habit: HabitDelegate | null | undefined;
  habitLog: HabitLogDelegate | null | undefined;
  revalidateSurfaces: () => void;
};

async function requireHabitAccess(dependencies: HabitMutationDependencies) {
  const session = await dependencies.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (!dependencies.hasDatabase || !dependencies.habit || !dependencies.habitLog) {
    throw new Error("Habits require a configured database connection.");
  }

  return {
    userId,
    habit: dependencies.habit,
    habitLog: dependencies.habitLog,
  };
}

function buildHabitPayload(values: z.infer<typeof habitMutationSchema>): HabitPayload {
  return {
    name: values.name.trim(),
    category: values.category,
    type: values.type,
    targetPerWeek: values.targetPerWeek,
    notes: values.notes?.trim() || null,
  };
}

export async function upsertHabit(values: unknown, dependencies: HabitMutationDependencies) {
  const { userId, habit } = await requireHabitAccess(dependencies);
  const parsedValues = habitMutationSchema.parse(values);
  const payload = buildHabitPayload(parsedValues);

  if (parsedValues.id) {
    const existingHabit = await habit.findFirst({
      where: {
        id: parsedValues.id,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!existingHabit) {
      throw new Error("Habit not found.");
    }

    await habit.update({
      where: { id: existingHabit.id },
      data: payload,
    });

    dependencies.revalidateSurfaces();

    return {
      ok: true,
      mode: "updated" as const,
      id: existingHabit.id,
    };
  }

  const createdHabit = await habit.create({
    data: {
      userId,
      ...payload,
    },
  });

  dependencies.revalidateSurfaces();

  return {
    ok: true,
    mode: "created" as const,
    id: createdHabit.id,
  };
}

export async function archiveHabit(values: unknown, dependencies: HabitMutationDependencies) {
  const { userId, habit } = await requireHabitAccess(dependencies);
  const parsedValues = archiveHabitSchema.parse(values);
  const existingHabit = await habit.findFirst({
    where: {
      id: parsedValues.id,
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!existingHabit) {
    throw new Error("Habit not found.");
  }

  await habit.update({
    where: { id: existingHabit.id },
    data: { isArchived: true },
  });

  dependencies.revalidateSurfaces();

  return {
    ok: true,
  };
}

export async function upsertHabitLog(values: unknown, dependencies: HabitMutationDependencies) {
  const { userId, habit, habitLog } = await requireHabitAccess(dependencies);
  const parsedValues = habitLogMutationSchema.parse(values);
  const day = startOfDay(parsedValues.day ? new Date(parsedValues.day) : new Date());
  const existingHabit = await habit.findFirst({
    where: {
      id: parsedValues.habitId,
      userId,
      isArchived: false,
    },
    select: {
      id: true,
    },
  });

  if (!existingHabit) {
    throw new Error("Habit not found.");
  }

  if (parsedValues.status == null) {
    await habitLog.deleteMany({
      where: {
        userId,
        habitId: existingHabit.id,
        day,
      },
    });
  } else {
    await habitLog.upsert({
      where: {
        habitId_day: {
          habitId: existingHabit.id,
          day,
        },
      },
      create: {
        userId,
        habitId: existingHabit.id,
        day,
        status: parsedValues.status,
      },
      update: {
        status: parsedValues.status,
      },
    });
  }

  dependencies.revalidateSurfaces();

  return {
    ok: true,
  };
}