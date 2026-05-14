import {
  addDays,
  addWeeks,
  endOfDay,
  isAfter,
  max as maxDate,
} from "date-fns";
import type {
  Activity,
  ActivityCategory,
  PrismaClient,
  Prisma,
  RecurrencePattern,
} from "@prisma/client";

type PlannerDbClient = PrismaClient | Prisma.TransactionClient;

const DAILY_LOOKAHEAD_DAYS = 21;
const WEEKLY_LOOKAHEAD_WEEKS = 12;

function normalizeTitle(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

function supportsAutomaticGeneration(pattern: RecurrencePattern | null | undefined) {
  return pattern === "DAILY" || pattern === "WEEKLY";
}

function getHorizonDate(anchorDate: Date, pattern: RecurrencePattern) {
  const now = new Date();
  const baseDate = maxDate([anchorDate, now]);

  return pattern === "DAILY"
    ? endOfDay(addDays(baseDate, DAILY_LOOKAHEAD_DAYS))
    : endOfDay(addWeeks(baseDate, WEEKLY_LOOKAHEAD_WEEKS));
}

function getNextOccurrence(date: Date, pattern: RecurrencePattern) {
  return pattern === "DAILY" ? addDays(date, 1) : addWeeks(date, 1);
}

export async function ensureActivityTemplatesForUser(
  client: PlannerDbClient,
  userId: string
) {
  const unlinkedActivities = await client.activity.findMany({
    where: {
      userId,
      templateId: null,
    },
    select: {
      id: true,
      title: true,
      category: true,
      notes: true,
      durationMinutes: true,
      createdAt: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (!unlinkedActivities.length) {
    return;
  }

  const existingTemplates = await client.activityTemplate.findMany({
    where: { userId },
    select: {
      id: true,
      normalizedTitle: true,
      category: true,
    },
  });

  const templateMap = new Map(
    existingTemplates.map((template) => [
      `${template.normalizedTitle}::${template.category}`,
      template.id,
    ])
  );

  for (const activity of unlinkedActivities) {
    const normalizedTitle = normalizeTitle(activity.title);
    const key = `${normalizedTitle}::${activity.category}`;
    let templateId = templateMap.get(key);

    if (!templateId) {
      const template = await client.activityTemplate.create({
        data: {
          userId,
          title: activity.title,
          normalizedTitle,
          category: activity.category,
          notes: activity.notes,
          defaultDurationMinutes: activity.durationMinutes,
        },
        select: {
          id: true,
        },
      });

      templateId = template.id;
      templateMap.set(key, template.id);
    }

    await client.activity.update({
      where: { id: activity.id },
      data: { templateId },
    });
  }
}

export async function resolveActivityTemplate(
  client: PlannerDbClient,
  userId: string,
  input: {
    templateId?: string | null;
    title: string;
    category: ActivityCategory;
    notes?: string;
    durationMinutes?: number;
  }
) {
  if (input.templateId) {
    const template = await client.activityTemplate.findFirst({
      where: {
        id: input.templateId,
        userId,
      },
      select: {
        id: true,
      },
    });

    if (!template) {
      throw new Error("Activity template not found.");
    }

    return template.id;
  }

  const normalizedTitle = normalizeTitle(input.title);

  const template = await client.activityTemplate.upsert({
    where: {
      userId_normalizedTitle_category: {
        userId,
        normalizedTitle,
        category: input.category,
      },
    },
    update: {
      title: input.title,
      notes: input.notes,
      defaultDurationMinutes: input.durationMinutes,
    },
    create: {
      userId,
      title: input.title,
      normalizedTitle,
      category: input.category,
      notes: input.notes,
      defaultDurationMinutes: input.durationMinutes,
    },
    select: {
      id: true,
    },
  });

  return template.id;
}

export async function extendRecurringSeries(
  client: PlannerDbClient,
  sourceActivity: Activity & { recurrenceGroupId: string | null }
) {
  if (
    !sourceActivity.recurring ||
    !sourceActivity.recurrenceGroupId ||
    !supportsAutomaticGeneration(sourceActivity.recurrencePattern)
  ) {
    return;
  }

  const pattern = sourceActivity.recurrencePattern;
  const horizonDate = getHorizonDate(sourceActivity.scheduledAt, pattern);

  const latestSeriesActivity = await client.activity.findFirst({
    where: {
      userId: sourceActivity.userId,
      recurrenceGroupId: sourceActivity.recurrenceGroupId,
    },
    orderBy: {
      scheduledAt: "desc",
    },
    select: {
      scheduledAt: true,
    },
  });

  let cursorDate = latestSeriesActivity?.scheduledAt ?? sourceActivity.scheduledAt;

  while (isAfter(horizonDate, cursorDate)) {
    const nextDate = getNextOccurrence(cursorDate, pattern);

    if (isAfter(nextDate, horizonDate)) {
      break;
    }

    await client.activity.create({
      data: {
        userId: sourceActivity.userId,
        templateId: sourceActivity.templateId,
        title: sourceActivity.title,
        category: sourceActivity.category,
        notes: sourceActivity.notes,
        experimentHypothesis: sourceActivity.experimentHypothesis,
        experimentObservationPrompt: sourceActivity.experimentObservationPrompt,
        experimentReviewWindowDays: sourceActivity.experimentReviewWindowDays,
        experimentUncertaintyNote: sourceActivity.experimentUncertaintyNote,
        experimentOutcome: null,
        experimentOutcomeNote: null,
        experimentReviewedAt: null,
        recurring: sourceActivity.recurring,
        recurrencePattern: sourceActivity.recurrencePattern,
        recurrenceCustom: sourceActivity.recurrenceCustom,
        recurrenceGroupId: sourceActivity.recurrenceGroupId,
        isRecurringGenerated: true,
        scheduledAt: nextDate,
        status: "SCHEDULED",
        durationMinutes: sourceActivity.durationMinutes,
      },
    });

    cursorDate = nextDate;
  }
}

export async function ensureRecurringSeriesCoverage(
  client: PlannerDbClient,
  userId: string
) {
  const rootRecurringActivities = await client.activity.findMany({
    where: {
      userId,
      recurring: true,
      isRecurringGenerated: false,
      recurrencePattern: {
        in: ["DAILY", "WEEKLY"],
      },
    },
  });

  for (const activity of rootRecurringActivities) {
    const recurrenceGroupId = activity.recurrenceGroupId ?? activity.id;

    if (!activity.recurrenceGroupId) {
      await client.activity.update({
        where: { id: activity.id },
        data: { recurrenceGroupId },
      });
    }

    await extendRecurringSeries(client, {
      ...activity,
      recurrenceGroupId,
    });
  }
}

export async function pruneFutureGeneratedOccurrences(
  client: PlannerDbClient,
  activity: Pick<Activity, "id" | "userId" | "recurrenceGroupId">,
  excludeActivityId?: string
) {
  if (!activity.recurrenceGroupId) {
    return;
  }

  await client.activity.deleteMany({
    where: {
      userId: activity.userId,
      recurrenceGroupId: activity.recurrenceGroupId,
      isRecurringGenerated: true,
      status: "SCHEDULED",
      scheduledAt: {
        gt: new Date(),
      },
      ...(excludeActivityId
        ? {
            id: {
              not: excludeActivityId,
            },
          }
        : {}),
    },
  });
}