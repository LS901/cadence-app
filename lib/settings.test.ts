import assert from "node:assert/strict";
import test from "node:test";
import {
  HOME_FOCUS_OPTIONS,
  SETTINGS_STORAGE_KEYS,
  TIMEZONE_OPTIONS,
  WEEK_START_OPTIONS,
} from "@/lib/settings";

test("settings option exports preserve the supported timezone list", () => {
  assert.deepEqual(TIMEZONE_OPTIONS, [
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
  ]);
});

test("settings option exports preserve the week-start and home-focus values used by the UI", () => {
  assert.deepEqual(WEEK_START_OPTIONS, [
    { value: "sunday", label: "Sunday" },
    { value: "monday", label: "Monday" },
  ]);

  assert.deepEqual(HOME_FOCUS_OPTIONS, [
    { value: "dashboard", label: "Dashboard first" },
    { value: "planner", label: "Planner first" },
    { value: "journal", label: "Journal first" },
    { value: "mood", label: "Mood first" },
  ]);
});

test("settings storage keys stay namespaced and unique", () => {
  assert.deepEqual(SETTINGS_STORAGE_KEYS, {
    weekStartsOn: "cadence.settings.weekStartsOn",
    homeFocus: "cadence.settings.homeFocus",
  });

  const uniqueKeys = new Set(Object.values(SETTINGS_STORAGE_KEYS));
  assert.equal(uniqueKeys.size, Object.keys(SETTINGS_STORAGE_KEYS).length);
});