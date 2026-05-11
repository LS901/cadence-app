import assert from "node:assert/strict";
import test from "node:test";
import {
  buildHabitsPageDataFromSource,
  getHabitsPageDataWithDependencies,
  type HabitWithLogs,
} from "./query-service";
import { demoUser } from "@/lib/data/mock-cadence";

function createHabit(overrides: Partial<HabitWithLogs> = {}): HabitWithLogs {
  return {
    id: overrides.id ?? "habit-1",
    name: overrides.name ?? "Morning walk",
    category: overrides.category ?? "MOVEMENT",
    type: overrides.type ?? "POSITIVE",
    notes: overrides.notes ?? null,
    targetPerWeek: overrides.targetPerWeek ?? 4,
    logs: overrides.logs ?? [],
  };
}

test("getHabitsPageDataWithDependencies uses mock data when the database is unavailable", async () => {
  const mockData = {
    dataSource: "mock",
    summary: { activeHabits: 0, onTrackToday: 0, weeklyConsistencyRate: 0, bestStreak: 0 },
    positiveHabits: [],
    negativeHabits: [],
  };

  const result = await getHabitsPageDataWithDependencies(demoUser.id, {
    hasDatabase: false,
    buildMockHabitsPageData: () => mockData,
    findHabits: async () => {
      throw new Error("should not run");
    },
  });

  assert.equal(result, mockData);
});

test("buildHabitsPageDataFromSource calculates streak and consistency metrics", () => {
  const now = new Date("2026-05-10T12:00:00.000Z");
  const habits = [
    createHabit({
      id: "positive-habit",
      logs: [
        { day: new Date("2026-05-08T12:00:00.000Z"), status: "COMPLETED" },
        { day: new Date("2026-05-09T12:00:00.000Z"), status: "COMPLETED" },
        { day: new Date("2026-05-10T12:00:00.000Z"), status: "COMPLETED" },
      ],
    }),
    createHabit({
      id: "negative-habit",
      name: "Late caffeine",
      category: "SLEEP",
      type: "NEGATIVE",
      targetPerWeek: 5,
      logs: [
        { day: new Date("2026-05-09T12:00:00.000Z"), status: "SKIPPED" },
        { day: new Date("2026-05-10T12:00:00.000Z"), status: "SKIPPED" },
      ],
    }),
  ];

  const result = buildHabitsPageDataFromSource("database", habits, now);

  assert.equal(result.dataSource, "database");
  assert.equal(result.summary.activeHabits, 2);
  assert.equal(result.summary.onTrackToday, 2);
  assert.equal(result.summary.bestStreak, 3);
  assert.equal(result.positiveHabits.length, 1);
  assert.equal(result.negativeHabits.length, 1);
  assert.equal(result.positiveHabits[0]?.targetProgress, 75);
});

test("getHabitsPageDataWithDependencies returns composed database data from loaded habits", async () => {
  const now = new Date("2026-05-10T12:00:00.000Z");

  const result = await getHabitsPageDataWithDependencies(demoUser.id, {
    hasDatabase: true,
    buildMockHabitsPageData: () => {
      throw new Error("should not build mock data");
    },
    findHabits: async () => [
      createHabit({
        logs: [{ day: new Date("2026-05-10T12:00:00.000Z"), status: "COMPLETED" }],
      }),
    ],
    now: () => now,
  });

  assert.equal(result.dataSource, "database");
  assert.equal(result.summary.activeHabits, 1);
  assert.equal(result.positiveHabits.length, 1);
});