import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlannerDataFromSourceData,
  getPlannerDataWithDependencies,
  type PlannerQuerySourceData,
} from "./query-service";
import { demoUser, mockActivities, mockLifeEventItems } from "@/lib/data/mock-cadence";

function createSourceData(): PlannerQuerySourceData {
  const activities = mockActivities
    .filter((activity) => activity.userId === demoUser.id)
    .slice(0, 6)
    .map((activity) => ({
      ...activity,
      templateId: `template-${activity.id}`,
      notes: activity.notes ?? null,
      recurrencePattern: activity.recurrencePattern ?? null,
      recurrenceCustom: activity.recurrenceCustom ?? null,
      durationMinutes: null,
    }));

  const templates = activities.slice(0, 3).map((activity, index) => ({
    id: `template-${index + 1}`,
    title: activity.title,
    category: activity.category,
    notes: activity.notes ?? null,
    defaultDurationMinutes: null,
    activities: activities
      .filter((candidate) => candidate.title === activity.title)
      .map((candidate) => ({
        completionMoodScore: candidate.completionMoodScore ?? null,
        completedAt: candidate.status === "COMPLETED" ? candidate.scheduledAt : null,
        scheduledAt: candidate.scheduledAt,
      })),
  }));

  return {
    activities,
    templates,
    lifeEvents: mockLifeEventItems,
  };
}

test("getPlannerDataWithDependencies uses the mock builder when the database is unavailable", async () => {
  const mockData = {
    dataSource: "mock",
    weekLabel: "mock-week",
    days: [],
    summary: { total: 0, scheduled: 0, completed: 0, skipped: 0, recurring: 0, completionRate: 0 },
    activityHistory: [],
    lifeEvents: [],
  };

  const result = await getPlannerDataWithDependencies(demoUser.id, {
    hasDatabase: false,
    buildMockPlannerData: () => mockData,
    preparePlannerData: async () => {
      throw new Error("should not run");
    },
    loadPlannerSourceData: async () => {
      throw new Error("should not run");
    },
  });

  assert.equal(result, mockData);
});

test("buildPlannerDataFromSourceData shapes weekly planner data from loaded query records", () => {
  const now = new Date("2026-05-10T12:00:00.000Z");
  const result = buildPlannerDataFromSourceData(createSourceData(), now);

  assert.equal(result.dataSource, "database");
  assert.equal(result.days.length, 7);
  assert.ok(result.summary.total >= 0);
  assert.ok(result.summary.completionRate >= 0 && result.summary.completionRate <= 100);
  assert.ok(result.activityHistory.length > 0);
  assert.equal(result.days.some((day) => day.items.length > 0), true);
  assert.equal(result.lifeEvents.length, mockLifeEventItems.length);
});

test("getPlannerDataWithDependencies runs planner preparation before loading and returns composed database data", async () => {
  const operations: string[] = [];
  const now = new Date("2026-05-10T12:00:00.000Z");
  const sourceData = createSourceData();

  const result = await getPlannerDataWithDependencies(demoUser.id, {
    hasDatabase: true,
    buildMockPlannerData: () => {
      throw new Error("should not build mock data");
    },
    preparePlannerData: async () => {
      operations.push("prepare");
    },
    loadPlannerSourceData: async () => {
      operations.push("load");
      return sourceData;
    },
    now: () => now,
  });

  assert.deepEqual(operations, ["prepare", "load"]);
  assert.equal(result.dataSource, "database");
  assert.equal(result.days.length, 7);
});