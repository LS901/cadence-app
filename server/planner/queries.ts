import type { PlannerData } from "@/features/planner/types";
import { defaultMockScenario, type MockScenarioKey } from "@/lib/data/mock-scenarios";
import { db, hasDatabaseUrl } from "@/lib/db";
import { getLifeEventItems } from "@/server/life-events/queries";
import {
  ensureActivityTemplatesForUser,
  ensureRecurringSeriesCoverage,
} from "@/server/planner/automation";
import {
  buildMockPlannerData,
  getPlannerDataWithDependencies,
} from "./query-service";

export async function getPlannerData(
  userId: string,
  scenario: MockScenarioKey = defaultMockScenario
): Promise<PlannerData> {
  return getPlannerDataWithDependencies(userId, {
    hasDatabase: hasDatabaseUrl,
    buildMockPlannerData: (currentUserId, now) => buildMockPlannerData(currentUserId, now, scenario),
    preparePlannerData: async (currentUserId) => {
      if (!db) {
        return;
      }

      await ensureActivityTemplatesForUser(db, currentUserId);
      await ensureRecurringSeriesCoverage(db, currentUserId);
    },
    loadPlannerSourceData: async (currentUserId, weekStart, weekEnd) => {
      return {
        activities: await db!.activity.findMany({
          where: {
            userId: currentUserId,
            scheduledAt: {
              gte: weekStart,
              lte: weekEnd,
            },
          },
          orderBy: {
            scheduledAt: "asc",
          },
        }),
        templates: await db!.activityTemplate.findMany({
          where: { userId: currentUserId },
          include: {
            activities: {
              select: {
                completionMoodScore: true,
                completedAt: true,
                scheduledAt: true,
              },
              orderBy: {
                scheduledAt: "desc",
              },
            },
          },
          orderBy: {
            updatedAt: "desc",
          },
        }),
        lifeEvents: await getLifeEventItems(currentUserId),
      };
    },
  });
}