import { hash } from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import {
  demoUser,
  mockActivities,
  mockHabitLogs,
  mockHabits,
  mockInsights,
  mockJournalEntries,
  mockLifeEvents,
  mockMoodEntries,
  mockMoodPeriods,
} from "../lib/data/mock-cadence";
import { syncLifeEventDayExposuresForUser } from "../server/life-events/day-exposures";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required for prisma db seed.");
}

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({
  adapter: new PrismaPg(pool),
});

function normalizeTitle(title: string) {
  return title.trim().toLowerCase().replace(/\s+/g, " ");
}

async function main() {
  const passwordHash = await hash(demoUser.password, 12);

  await prisma.user.upsert({
    where: { email: demoUser.email },
    update: {
      name: demoUser.name,
      passwordHash,
    },
    create: {
      id: demoUser.id,
      email: demoUser.email,
      name: demoUser.name,
      passwordHash,
      timezone: "Europe/London",
    },
  });

  await prisma.insight.deleteMany({ where: { userId: demoUser.id } });
  await prisma.lifeEventDayExposure.deleteMany({ where: { userId: demoUser.id } });
  await prisma.lifeEvent.deleteMany({ where: { userId: demoUser.id } });
  await prisma.lifeEventSeries.deleteMany({ where: { userId: demoUser.id } });
  await prisma.journalEntry.deleteMany({ where: { userId: demoUser.id } });
  await prisma.moodPeriod.deleteMany({ where: { userId: demoUser.id } });
  await prisma.moodEntry.deleteMany({ where: { userId: demoUser.id } });
  await prisma.habitLog.deleteMany({ where: { userId: demoUser.id } });
  await prisma.activity.deleteMany({ where: { userId: demoUser.id } });
  await prisma.activityTemplate.deleteMany({ where: { userId: demoUser.id } });
  await prisma.habit.deleteMany({ where: { userId: demoUser.id } });

  await prisma.habit.createMany({ data: mockHabits });
  await prisma.habitLog.createMany({ data: mockHabitLogs });

  const templateMap = new Map<string, string>();

  for (const activity of mockActivities) {
    const normalizedTitle = normalizeTitle(activity.title);
    const templateKey = `${normalizedTitle}::${activity.category}`;
    let templateId = templateMap.get(templateKey);

    if (!templateId) {
      const template = await prisma.activityTemplate.create({
        data: {
          userId: activity.userId,
          title: activity.title,
          normalizedTitle,
          category: activity.category,
          notes: activity.notes,
        },
        select: {
          id: true,
        },
      });

      templateId = template.id;
      templateMap.set(templateKey, template.id);
    }

    await prisma.activity.create({
      data: {
        ...activity,
        templateId,
        recurrenceGroupId:
          activity.recurring && activity.recurrencePattern && activity.recurrencePattern !== "CUSTOM"
            ? activity.id
            : null,
        completedAt: activity.status === "COMPLETED" ? activity.scheduledAt : null,
        skippedAt: activity.status === "SKIPPED" ? activity.scheduledAt : null,
      },
    });
  }

  await prisma.moodEntry.createMany({
    data: mockMoodEntries.map((entry) => ({
      id: entry.id,
      userId: entry.userId,
      day: entry.day,
      score: entry.score,
      energy: entry.energy,
      stress: entry.stress,
      sleepHours: entry.sleepHours,
      sleepQuality: entry.sleepQuality,
      workStress: entry.workStress,
      socialQuality: entry.socialQuality,
      moodStability: entry.moodStability,
      reflectionCompletedAt: entry.reflectionCompletedAt,
      notes: entry.notes,
      tags: entry.tags,
    })),
  });
  await prisma.moodPeriod.createMany({
    data: mockMoodPeriods,
  });
  await prisma.journalEntry.createMany({ data: mockJournalEntries });
  await prisma.lifeEvent.createMany({ data: mockLifeEvents });
  await syncLifeEventDayExposuresForUser(demoUser.id, prisma as never);
  await prisma.insight.createMany({
    data: mockInsights.map((insight) => ({
      ...insight,
      windowStart: mockMoodEntries[0]?.day ?? new Date(),
      windowEnd: mockMoodEntries.at(-1)?.day ?? new Date(),
      payload: {
        confidence: insight.confidence,
        strength: insight.strength,
        source: "seed",
      },
    })),
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });