import type {
  HabitsPageData,
} from "@/features/habits/types";
import { db, hasDatabaseUrl } from "@/lib/db";
import { demoUser } from "@/lib/data/mock-cadence";
import {
  buildMockHabitsPageData,
  getHabitsPageDataWithDependencies,
  type HabitWithLogs,
} from "./query-service";

export async function getHabitsPageData(userId = demoUser.id): Promise<HabitsPageData> {
  return getHabitsPageDataWithDependencies(userId, {
    hasDatabase: hasDatabaseUrl && Boolean(db?.habit),
    buildMockHabitsPageData,
    findHabits: async (currentUserId, cutoff) => {
      const habits = await db!.habit.findMany({
        where: {
          userId: currentUserId,
          isArchived: false,
        },
        include: {
          logs: {
            where: {
              day: {
                gte: cutoff,
              },
            },
            orderBy: {
              day: "asc",
            },
          },
        },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }],
      });

      return habits.map((habit) => ({
        id: habit.id,
        name: habit.name,
        category: habit.category,
        type: habit.type,
        notes: habit.notes,
        targetPerWeek: habit.targetPerWeek,
        logs: habit.logs.map((log) => ({
          day: log.day,
          status: log.status,
        })),
      })) as HabitWithLogs[];
    },
  });
}