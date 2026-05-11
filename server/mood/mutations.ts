import type { PrismaClient } from "@prisma/client";
import { startOfDay } from "date-fns";
import { dedupeTags, deriveMoodSummary, hasOverlappingMoodPeriods, sortMoodPeriods } from "@/lib/mood";
import {
  completeDayReflectionMutationSchema,
  quickMoodCaptureMutationSchema,
} from "@/lib/validation/mood";

type SessionResult =
  | {
      user?: {
        id?: string | null;
      } | null;
    }
  | null
  | undefined;

type MoodEntryDelegate = PrismaClient["moodEntry"];

type MoodMutationDependencies = {
  getSession: () => Promise<SessionResult>;
  hasDatabase: boolean;
  moodEntry: MoodEntryDelegate | null | undefined;
  revalidateSurfaces: () => void;
};

async function requireMoodAccess(dependencies: MoodMutationDependencies) {
  const session = await dependencies.getSession();
  const userId = session?.user?.id;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (!dependencies.hasDatabase || !dependencies.moodEntry) {
    throw new Error("Mood reflections require a configured database connection.");
  }

  return {
    userId,
    moodEntry: dependencies.moodEntry,
  };
}

function buildPeriodPayloads(
  userId: string,
  day: Date,
  periods: Array<{
    startMinute: number;
    endMinute: number;
    score: number;
    notes?: string;
    tags: string[];
  }>
) {
  return periods.map((period) => ({
    userId,
    day,
    startMinute: period.startMinute,
    endMinute: period.endMinute,
    score: period.score,
    notes: period.notes?.trim() || null,
    tags: period.tags,
  }));
}

export async function upsertCompleteDayReflection(
  values: unknown,
  dependencies: MoodMutationDependencies
) {
  const { userId, moodEntry } = await requireMoodAccess(dependencies);
  const parsedValues = completeDayReflectionMutationSchema.parse(values);
  const day = startOfDay(new Date(parsedValues.day));
  const periods = sortMoodPeriods(parsedValues.periods).map((period) => ({
    ...period,
    tags: dedupeTags(period.tags),
  }));
  const summary = deriveMoodSummary(periods);

  if (summary.score == null) {
    throw new Error("Add at least one mood block before saving the day.");
  }

  if (hasOverlappingMoodPeriods(periods)) {
    throw new Error("Mood blocks cannot overlap. Adjust the timing before saving.");
  }

  const tags = dedupeTags([...parsedValues.tags, ...summary.tags]);
  const periodPayloads = buildPeriodPayloads(userId, day, periods);

  await moodEntry.upsert({
    where: {
      userId_day: {
        userId,
        day,
      },
    },
    create: {
      userId,
      day,
      score: summary.score,
      energy: summary.energy,
      stress: summary.stress,
      sleepHours: parsedValues.sleepHours,
      sleepQuality: parsedValues.sleepQuality,
      workStress: parsedValues.workStress,
      socialQuality: parsedValues.socialQuality,
      moodStability: summary.moodStability,
      reflectionCompletedAt: new Date(),
      notes: parsedValues.notes?.trim() || null,
      tags,
      periods: {
        create: periodPayloads,
      },
    },
    update: {
      score: summary.score,
      energy: summary.energy,
      stress: summary.stress,
      sleepHours: parsedValues.sleepHours,
      sleepQuality: parsedValues.sleepQuality,
      workStress: parsedValues.workStress,
      socialQuality: parsedValues.socialQuality,
      moodStability: summary.moodStability,
      reflectionCompletedAt: new Date(),
      notes: parsedValues.notes?.trim() || null,
      tags,
      periods: {
        deleteMany: {},
        create: periodPayloads,
      },
    },
  });

  dependencies.revalidateSurfaces();

  return {
    ok: true,
  };
}

export async function upsertQuickMoodCapture(
  values: unknown,
  dependencies: MoodMutationDependencies
) {
  const { userId, moodEntry } = await requireMoodAccess(dependencies);
  const parsedValues = quickMoodCaptureMutationSchema.parse(values);
  const day = startOfDay(new Date(parsedValues.day));
  const existingEntry = await moodEntry.findUnique({
    where: {
      userId_day: {
        userId,
        day,
      },
    },
    select: {
      id: true,
      reflectionCompletedAt: true,
      periods: {
        select: { id: true },
        take: 1,
      },
    },
  });

  if (existingEntry?.reflectionCompletedAt || existingEntry?.periods.length) {
    throw new Error("A full reflection already exists for today. Open Mood to revise it.");
  }

  await moodEntry.upsert({
    where: {
      userId_day: {
        userId,
        day,
      },
    },
    create: {
      userId,
      day,
      score: parsedValues.score,
      notes: parsedValues.notes?.trim() || null,
      tags: [],
    },
    update: {
      score: parsedValues.score,
      notes: parsedValues.notes?.trim() || null,
    },
  });

  dependencies.revalidateSurfaces();

  return {
    ok: true,
    dayIso: day.toISOString(),
    score: parsedValues.score,
    notes: parsedValues.notes?.trim() || null,
  };
}