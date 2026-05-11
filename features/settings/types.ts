import type { SupportedTimezone } from "@/lib/settings";

export type SettingsSummary = {
  activityCount: number;
  habitCount: number;
  moodEntryCount: number;
  journalEntryCount: number;
  insightCount: number;
};

export type SettingsProfile = {
  name: string;
  email: string;
  timezone: SupportedTimezone;
  joinedLabel: string;
  updatedLabel: string;
};

export type SettingsSurface = {
  dataSource: "mock" | "database";
  profile: SettingsProfile;
  summary: SettingsSummary;
};