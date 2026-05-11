export const TIMEZONE_OPTIONS = [
  "UTC",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Toronto",
  "Australia/Sydney",
  "Asia/Tokyo",
] as const;

export const WEEK_START_OPTIONS = [
  { value: "sunday", label: "Sunday" },
  { value: "monday", label: "Monday" },
] as const;

export const HOME_FOCUS_OPTIONS = [
  { value: "dashboard", label: "Dashboard first" },
  { value: "planner", label: "Planner first" },
  { value: "journal", label: "Journal first" },
  { value: "mood", label: "Mood first" },
] as const;

export const SETTINGS_STORAGE_KEYS = {
  weekStartsOn: "cadence.settings.weekStartsOn",
  homeFocus: "cadence.settings.homeFocus",
} as const;

export type SupportedTimezone = (typeof TIMEZONE_OPTIONS)[number];
export type WeekStartValue = (typeof WEEK_START_OPTIONS)[number]["value"];
export type HomeFocusValue = (typeof HOME_FOCUS_OPTIONS)[number]["value"];