import { Prisma } from "@prisma/client";
import { format } from "date-fns";
import type { SettingsSurface } from "@/features/settings/types";
import {
  demoUser,
  mockActivities,
  mockHabits,
  mockInsights,
  mockJournalEntries,
  mockMoodEntries,
} from "@/lib/data/mock-cadence";
import { TIMEZONE_OPTIONS } from "@/lib/settings";

export type SettingsUserRecord = {
  name: string | null;
  email: string;
  timezone: string;
  createdAt: Date;
  updatedAt: Date;
  _count: {
    activities: number;
    habits: number;
    moodEntries: number;
    journalEntries: number;
    insights: number;
  };
};

type SettingsQueryDependencies = {
  hasDatabase: boolean;
  buildMockSettingsData: () => SettingsSurface;
  findUserRecord: (userId: string) => Promise<SettingsUserRecord | null>;
};

function formatDateLabel(date: Date) {
  return format(date, "MMM d, yyyy");
}

function normalizeTimezone(timezone: string) {
  return TIMEZONE_OPTIONS.includes(timezone as (typeof TIMEZONE_OPTIONS)[number])
    ? (timezone as (typeof TIMEZONE_OPTIONS)[number])
    : "UTC";
}

function isRecoverablePrismaError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError
  );
}

export function buildMockSettingsData(): SettingsSurface {
  return {
    dataSource: "mock",
    profile: {
      name: demoUser.name,
      email: demoUser.email,
      timezone: "UTC",
      joinedLabel: formatDateLabel(new Date("2026-01-12T09:00:00.000Z")),
      updatedLabel: "Preview mode",
    },
    summary: {
      activityCount: mockActivities.length,
      habitCount: mockHabits.length,
      moodEntryCount: mockMoodEntries.length,
      journalEntryCount: mockJournalEntries.length,
      insightCount: mockInsights.length,
    },
  };
}

export function buildSettingsPageDataFromUser(user: SettingsUserRecord): SettingsSurface {
  return {
    dataSource: "database",
    profile: {
      name: user.name?.trim() || "Cadence User",
      email: user.email,
      timezone: normalizeTimezone(user.timezone),
      joinedLabel: formatDateLabel(user.createdAt),
      updatedLabel: formatDateLabel(user.updatedAt),
    },
    summary: {
      activityCount: user._count.activities,
      habitCount: user._count.habits,
      moodEntryCount: user._count.moodEntries,
      journalEntryCount: user._count.journalEntries,
      insightCount: user._count.insights,
    },
  };
}

export async function getSettingsPageDataWithDependencies(
  userId: string,
  dependencies: SettingsQueryDependencies
): Promise<SettingsSurface> {
  if (!dependencies.hasDatabase) {
    return dependencies.buildMockSettingsData();
  }

  try {
    const user = await dependencies.findUserRecord(userId);

    if (!user) {
      return dependencies.buildMockSettingsData();
    }

    return buildSettingsPageDataFromUser(user);
  } catch (error) {
    if (isRecoverablePrismaError(error)) {
      return dependencies.buildMockSettingsData();
    }

    throw error;
  }
}