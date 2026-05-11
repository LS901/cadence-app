import { addDays, endOfDay, startOfDay } from "date-fns";
import { db } from "@/lib/db";

const MINUTES_PER_DAY = 24 * 60;

export type LifeEventExposureSource = {
  id: string;
  userId: string;
  category: string;
  severityScore: number;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED" | null;
  startAt: Date;
  endAt: Date | null;
  isOngoing: boolean;
  tags: string[];
};

export type LifeEventDayExposureWriteInput = {
  userId: string;
  lifeEventId: string;
  day: Date;
  overlapMinutes: number;
  overlapRatio: number;
  severityScore: number;
  sentiment: "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED" | null;
  weightedImpact: number;
  category: string;
  tags: string[];
};

type ExposureSyncClient = {
  lifeEvent: {
    findMany(args: {
      where: { userId: string };
      select: {
        id: true;
        userId: true;
        category: true;
        severityScore: true;
        sentiment: true;
        startAt: true;
        endAt: true;
        isOngoing: true;
        tags: true;
      };
    }): Promise<LifeEventExposureSource[]>;
  };
  lifeEventDayExposure: {
    deleteMany(args: { where: { userId?: string; lifeEventId?: string } }): Promise<unknown>;
    createMany(args: { data: LifeEventDayExposureWriteInput[] }): Promise<unknown>;
  };
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function getEffectiveEndAt(event: LifeEventExposureSource, referenceDate: Date) {
  if (event.isOngoing) {
    return endOfDay(referenceDate);
  }

  return event.endAt ?? event.startAt;
}

export function buildLifeEventDayExposureRows(
  events: LifeEventExposureSource[],
  referenceDate = new Date()
): LifeEventDayExposureWriteInput[] {
  const rows: LifeEventDayExposureWriteInput[] = [];

  for (const event of events) {
    const effectiveEndAt = getEffectiveEndAt(event, referenceDate);

    if (effectiveEndAt < event.startAt) {
      continue;
    }

    for (
      let currentDay = startOfDay(event.startAt);
      currentDay <= startOfDay(effectiveEndAt);
      currentDay = addDays(currentDay, 1)
    ) {
      const nextDay = addDays(currentDay, 1);
      const overlapStart = Math.max(event.startAt.getTime(), currentDay.getTime());
      const overlapEnd = Math.min(effectiveEndAt.getTime(), nextDay.getTime());
      const overlapMinutes = Math.max(0, Math.round((overlapEnd - overlapStart) / 60_000));

      if (!overlapMinutes) {
        continue;
      }

      const overlapRatio = clamp(overlapMinutes / MINUTES_PER_DAY, 0, 1);
      const severityScore = clamp(event.severityScore, 1, 5);

      rows.push({
        userId: event.userId,
        lifeEventId: event.id,
        day: currentDay,
        overlapMinutes,
        overlapRatio: Number(overlapRatio.toFixed(4)),
        severityScore,
        sentiment: event.sentiment,
        weightedImpact: Number(((severityScore / 5) * overlapRatio).toFixed(3)),
        category: event.category,
        tags: event.tags,
      });
    }
  }

  return rows;
}

export async function syncLifeEventDayExposuresForEvent(
  event: LifeEventExposureSource,
  client: ExposureSyncClient | null = db as unknown as ExposureSyncClient | null,
  referenceDate = new Date()
) {
  if (!client) {
    return;
  }

  const rows = buildLifeEventDayExposureRows([event], referenceDate);

  await client.lifeEventDayExposure.deleteMany({ where: { lifeEventId: event.id } });

  if (rows.length) {
    await client.lifeEventDayExposure.createMany({ data: rows });
  }
}

export async function syncLifeEventDayExposuresForUser(
  userId: string,
  client: ExposureSyncClient | null = db as unknown as ExposureSyncClient | null,
  referenceDate = new Date()
) {
  if (!client) {
    return;
  }

  const events = await client.lifeEvent.findMany({
    where: { userId },
    select: {
      id: true,
      userId: true,
      category: true,
      severityScore: true,
      sentiment: true,
      startAt: true,
      endAt: true,
      isOngoing: true,
      tags: true,
    },
  });
  const rows = buildLifeEventDayExposureRows(events, referenceDate);

  await client.lifeEventDayExposure.deleteMany({ where: { userId } });

  if (rows.length) {
    await client.lifeEventDayExposure.createMany({ data: rows });
  }
}