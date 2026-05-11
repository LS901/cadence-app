import assert from "node:assert/strict";
import test from "node:test";
import {
  buildSettingsPageDataFromUser,
  getSettingsPageDataWithDependencies,
} from "./query-service";
import { demoUser } from "@/lib/data/mock-cadence";

test("getSettingsPageDataWithDependencies uses mock data when the database is unavailable", async () => {
  const mockData = {
    dataSource: "mock",
    profile: {
      name: "Mock User",
      email: "mock@example.com",
      timezone: "UTC",
      joinedLabel: "Jan 1, 2026",
      updatedLabel: "Preview mode",
    },
    summary: {
      activityCount: 0,
      habitCount: 0,
      moodEntryCount: 0,
      journalEntryCount: 0,
      insightCount: 0,
    },
  };

  const result = await getSettingsPageDataWithDependencies(demoUser.id, {
    hasDatabase: false,
    buildMockSettingsData: () => mockData,
    findUserRecord: async () => {
      throw new Error("should not run");
    },
  });

  assert.equal(result, mockData);
});

test("getSettingsPageDataWithDependencies falls back to mock data when no user record exists", async () => {
  const mockData = {
    dataSource: "mock",
    profile: {
      name: "Mock User",
      email: "mock@example.com",
      timezone: "UTC",
      joinedLabel: "Jan 1, 2026",
      updatedLabel: "Preview mode",
    },
    summary: {
      activityCount: 0,
      habitCount: 0,
      moodEntryCount: 0,
      journalEntryCount: 0,
      insightCount: 0,
    },
  };

  const result = await getSettingsPageDataWithDependencies(demoUser.id, {
    hasDatabase: true,
    buildMockSettingsData: () => mockData,
    findUserRecord: async () => null,
  });

  assert.equal(result, mockData);
});

test("buildSettingsPageDataFromUser normalizes the profile and summary fields", () => {
  const result = buildSettingsPageDataFromUser({
    name: "  Lewis  ",
    email: demoUser.email,
    timezone: "Mars/Colony",
    createdAt: new Date("2026-01-12T09:00:00.000Z"),
    updatedAt: new Date("2026-05-10T12:00:00.000Z"),
    _count: {
      activities: 8,
      habits: 4,
      moodEntries: 12,
      journalEntries: 7,
      insights: 3,
    },
  });

  assert.equal(result.dataSource, "database");
  assert.equal(result.profile.name, "Lewis");
  assert.equal(result.profile.timezone, "UTC");
  assert.equal(result.summary.activityCount, 8);
  assert.equal(result.summary.insightCount, 3);
});