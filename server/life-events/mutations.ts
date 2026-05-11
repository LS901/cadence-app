import type { PrismaClient } from "@prisma/client";
import { z } from "zod";
import {
  buildRecurringOccurrences,
  type LifeEventRecurrencePayload,
  type RecurrenceConfig,
} from "@/lib/life-event-recurrence";
import { dedupeTags } from "@/lib/mood";
import { lifeEventSchema } from "@/lib/validation/life-event";

const lifeEventMutationSchema = lifeEventSchema.extend({
  id: z.string().min(1).optional(),
});

const deleteLifeEventSchema = z.object({
  id: z.string().min(1),
});

type SessionResult =
  | {
      user?: {
        id?: string | null;
      } | null;
    }
  | null
  | undefined;

type DatabaseClient = Pick<PrismaClient, "lifeEvent" | "lifeEventSeries" | "$transaction">;

type LifeEventMutationDependencies = {
  getSession: () => Promise<SessionResult>;
  hasDatabase: boolean;
  dbClient: DatabaseClient | null | undefined;
  syncDayExposures: (userId: string) => Promise<void>;
  revalidateSurfaces: () => void;
};

export function getLifeEventPayload(
  parsedValues: z.infer<typeof lifeEventMutationSchema>
): LifeEventRecurrencePayload {
  return {
    title: parsedValues.title.trim(),
    category: parsedValues.category,
    customCategoryLabel:
      parsedValues.category === "CUSTOM"
        ? parsedValues.customCategoryLabel?.trim() || null
        : null,
    description: parsedValues.description?.trim() || null,
    severityScore: parsedValues.severityScore,
    sentiment: parsedValues.sentiment ?? null,
    startAt: parsedValues.startAt,
    endAt: parsedValues.isOngoing ? null : parsedValues.endAt ?? null,
    isOngoing: parsedValues.isOngoing,
    tags: dedupeTags(parsedValues.tags),
  };
}

export function getRecurrenceConfig(
  parsedValues: z.infer<typeof lifeEventMutationSchema>
): RecurrenceConfig | null {
  if (!parsedValues.recurrencePattern) {
    return null;
  }

  return {
    pattern: parsedValues.recurrencePattern,
    interval: parsedValues.recurrenceInterval ?? 1,
    rule:
      parsedValues.recurrencePattern === "CUSTOM"
        ? parsedValues.recurrenceRule?.trim() || null
        : null,
  };
}

async function requireLifeEventAccess(dependencies: LifeEventMutationDependencies) {
  const session = await dependencies.getSession();
  const userId = session?.user?.id;
  const lifeEventClient = dependencies.dbClient?.lifeEvent;

  if (!userId) {
    throw new Error("Unauthorized");
  }

  if (!dependencies.hasDatabase || !dependencies.dbClient || !lifeEventClient) {
    throw new Error("Life context requires a configured database connection.");
  }

  return {
    userId,
    dbClient: dependencies.dbClient,
  };
}

function buildSeriesPayload(
  userId: string,
  payload: LifeEventRecurrencePayload,
  recurrenceConfig: RecurrenceConfig
) {
  return {
    userId,
    title: payload.title,
    category: payload.category,
    customCategoryLabel: payload.customCategoryLabel,
    defaultSeverityScore: payload.severityScore,
    defaultSentiment: payload.sentiment,
    recurrencePattern: recurrenceConfig.pattern,
    recurrenceInterval: recurrenceConfig.pattern === "CUSTOM" ? null : recurrenceConfig.interval,
    recurrenceRule: recurrenceConfig.rule,
    timezone: "UTC",
    isActive: true,
  };
}

export async function upsertLifeEvent(
  values: unknown,
  dependencies: LifeEventMutationDependencies
) {
  const { userId, dbClient } = await requireLifeEventAccess(dependencies);
  const parsedValues = lifeEventMutationSchema.parse(values);
  const payload = getLifeEventPayload(parsedValues);
  const recurrenceConfig = getRecurrenceConfig(parsedValues);

  if (parsedValues.id) {
    const existingEvent = await dbClient.lifeEvent!.findFirst({
      where: {
        id: parsedValues.id,
        userId,
      },
      select: {
        id: true,
        recurrenceSeriesId: true,
        source: true,
      },
    });

    if (!existingEvent) {
      throw new Error("Context event not found.");
    }

    if (existingEvent.source === "RECURRING_GENERATED") {
      throw new Error("Edit the original recurring context event instead of an auto-generated occurrence.");
    }

    await dbClient.$transaction(async (transaction) => {
      if (!recurrenceConfig && existingEvent.recurrenceSeriesId) {
        await transaction.lifeEvent.deleteMany({
          where: {
            recurrenceSeriesId: existingEvent.recurrenceSeriesId,
            source: "RECURRING_GENERATED",
          },
        });

        await transaction.lifeEvent.update({
          where: { id: existingEvent.id },
          data: {
            ...payload,
            recurrenceSeriesId: null,
            source: "MANUAL",
          },
        });

        await transaction.lifeEventSeries.delete({
          where: { id: existingEvent.recurrenceSeriesId },
        });

        return;
      }

      let recurrenceSeriesId = existingEvent.recurrenceSeriesId;

      if (recurrenceConfig) {
        if (recurrenceSeriesId) {
          await transaction.lifeEventSeries.update({
            where: { id: recurrenceSeriesId },
            data: buildSeriesPayload(userId, payload, recurrenceConfig),
          });
        } else {
          const recurrenceSeries = await transaction.lifeEventSeries.create({
            data: buildSeriesPayload(userId, payload, recurrenceConfig),
            select: {
              id: true,
            },
          });

          recurrenceSeriesId = recurrenceSeries.id;
        }
      }

      const rootEvent = await transaction.lifeEvent.update({
        where: { id: existingEvent.id },
        data: {
          ...payload,
          recurrenceSeriesId,
          source: "MANUAL",
        },
      });

      if (recurrenceSeriesId && recurrenceConfig) {
        await transaction.lifeEvent.deleteMany({
          where: {
            recurrenceSeriesId,
            source: "RECURRING_GENERATED",
          },
        });

        const generatedOccurrences = buildRecurringOccurrences({
          userId,
          recurrenceSeriesId,
          payload: {
            ...payload,
            startAt: rootEvent.startAt,
            endAt: rootEvent.endAt,
          },
          recurrenceConfig,
        });

        if (generatedOccurrences.length) {
          await transaction.lifeEvent.createMany({
            data: generatedOccurrences,
          });
        }
      }
    });

    await dependencies.syncDayExposures(userId);
    dependencies.revalidateSurfaces();

    return { ok: true, mode: "updated" as const, id: existingEvent.id };
  }

  const createdEvent = await dbClient.$transaction(async (transaction) => {
    let recurrenceSeriesId: string | null = null;

    if (recurrenceConfig) {
      const recurrenceSeries = await transaction.lifeEventSeries.create({
        data: buildSeriesPayload(userId, payload, recurrenceConfig),
        select: {
          id: true,
        },
      });

      recurrenceSeriesId = recurrenceSeries.id;
    }

    const rootEvent = await transaction.lifeEvent.create({
      data: {
        userId,
        recurrenceSeriesId,
        source: "MANUAL",
        ...payload,
      },
    });

    if (recurrenceSeriesId && recurrenceConfig) {
      const generatedOccurrences = buildRecurringOccurrences({
        userId,
        recurrenceSeriesId,
        payload: {
          ...payload,
          startAt: rootEvent.startAt,
          endAt: rootEvent.endAt,
        },
        recurrenceConfig,
      });

      if (generatedOccurrences.length) {
        await transaction.lifeEvent.createMany({
          data: generatedOccurrences,
        });
      }
    }

    return rootEvent;
  });

  await dependencies.syncDayExposures(userId);
  dependencies.revalidateSurfaces();

  return { ok: true, mode: "created" as const, id: createdEvent.id };
}

export async function deleteLifeEvent(
  values: unknown,
  dependencies: LifeEventMutationDependencies
) {
  const { userId, dbClient } = await requireLifeEventAccess(dependencies);
  const parsedValues = deleteLifeEventSchema.parse(values);
  const existingEvent = await dbClient.lifeEvent!.findFirst({
    where: {
      id: parsedValues.id,
      userId,
    },
    select: {
      id: true,
      recurrenceSeriesId: true,
      source: true,
    },
  });

  if (!existingEvent) {
    throw new Error("Context event not found.");
  }

  if (existingEvent.source === "RECURRING_GENERATED") {
    throw new Error("Delete the original recurring context event instead of an auto-generated occurrence.");
  }

  await dbClient.$transaction(async (transaction) => {
    if (existingEvent.recurrenceSeriesId) {
      await transaction.lifeEvent.deleteMany({
        where: {
          recurrenceSeriesId: existingEvent.recurrenceSeriesId,
        },
      });

      await transaction.lifeEventSeries.delete({
        where: { id: existingEvent.recurrenceSeriesId },
      });

      return;
    }

    await transaction.lifeEvent.delete({
      where: { id: existingEvent.id },
    });
  });

  await dependencies.syncDayExposures(userId);
  dependencies.revalidateSurfaces();

  return { ok: true };
}