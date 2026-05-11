import type { SettingsSurface } from "@/features/settings/types";
import { demoUser } from "@/lib/data/mock-cadence";
import { db, hasDatabaseUrl } from "@/lib/db";
import {
  buildMockSettingsData,
  getSettingsPageDataWithDependencies,
  type SettingsUserRecord,
} from "./query-service";

export async function getSettingsPageData(userId = demoUser.id): Promise<SettingsSurface> {
  return getSettingsPageDataWithDependencies(userId, {
    hasDatabase: hasDatabaseUrl && Boolean(db?.user),
    buildMockSettingsData,
    findUserRecord: async (currentUserId) => {
      return (await db!.user.findUnique({
        where: { id: currentUserId },
        select: {
          name: true,
          email: true,
          timezone: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              activities: true,
              habits: true,
              moodEntries: true,
              journalEntries: true,
              insights: true,
            },
          },
        },
      })) as SettingsUserRecord | null;
    },
  });
}