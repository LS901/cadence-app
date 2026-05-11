import assert from "node:assert/strict";
import test from "node:test";
import type { DailyBehaviorFeatureRow } from "./types";
import {
  buildBehaviorFeatureRows,
  buildInsightAnalysisSnapshot,
  deriveInsightCandidates,
} from "./analysis";

function createRow(overrides: Partial<DailyBehaviorFeatureRow>): DailyBehaviorFeatureRow {
  const day = overrides.day ?? new Date("2026-05-01T00:00:00.000Z");

  return {
    day,
    moodScore: 50,
    morningMood: 50,
    afternoonMood: 50,
    eveningMood: 50,
    moodStability: 50,
    sleepHours: 7,
    sleepQuality: 3,
    workStress: 2,
    socialQuality: 3,
    completedActivities: 0,
    skippedActivities: 0,
    exerciseCompleted: 0,
    socialCompleted: 0,
    sleepActivitiesCompleted: 0,
    positiveHabitsCompleted: 0,
    negativeHabitsCompleted: 0,
    journalEntryCount: 0,
    journalSentimentScore: 50,
    moodPeriodsCount: 3,
    activeLifeEventCount: 0,
    overlappingLifeEventCount: 0,
    negativeLifeEventLoad: 0,
    positiveLifeEventLoad: 0,
    neutralLifeEventLoad: 0,
    totalLifeEventLoad: 0,
    confoundedDay: false,
    lifeEventCategories: [],
    lifeEventTags: [],
    tags: [],
    previousDayMoodScore: 50,
    previousDaySleepHours: 7,
    ...overrides,
  };
}

test("deriveInsightCandidates surfaces raw versus adjusted softening when exposed days are context-heavy", () => {
  const rows = [
    createRow({ day: new Date("2026-05-01T00:00:00.000Z"), exerciseCompleted: 1, eveningMood: 95, moodScore: 95, confoundedDay: true }),
    createRow({ day: new Date("2026-05-02T00:00:00.000Z"), exerciseCompleted: 1, eveningMood: 88, moodScore: 88, confoundedDay: true }),
    createRow({ day: new Date("2026-05-03T00:00:00.000Z"), exerciseCompleted: 1, eveningMood: 54, moodScore: 54 }),
    createRow({ day: new Date("2026-05-04T00:00:00.000Z"), exerciseCompleted: 0, eveningMood: 50, moodScore: 50 }),
    createRow({ day: new Date("2026-05-05T00:00:00.000Z"), exerciseCompleted: 0, eveningMood: 45, moodScore: 45 }),
    createRow({ day: new Date("2026-05-06T00:00:00.000Z"), exerciseCompleted: 0, eveningMood: 40, moodScore: 40 }),
    createRow({ day: new Date("2026-05-07T00:00:00.000Z"), exerciseCompleted: 0, eveningMood: 38, moodScore: 38 }),
    createRow({ day: new Date("2026-05-08T00:00:00.000Z"), exerciseCompleted: 0, eveningMood: 36, moodScore: 36 }),
  ];

  const candidate = deriveInsightCandidates(rows).find(
    (entry) => entry.metric === "ACTIVITY_TO_MOOD"
  );

  assert.ok(candidate);
  assert.ok(candidate.rawStrength > candidate.adjustedStrength);
  assert.ok(candidate.rawConfidence > candidate.adjustedConfidence);
  assert.equal(candidate.payload.confounderAdjusted, true);
  assert.match(candidate.adjustmentSummary, /softens|confidence shifts/i);
});

test("deriveInsightCandidates keeps raw and adjusted readings aligned when no days are confounded", () => {
  const rows = [
    createRow({ day: new Date("2026-05-01T00:00:00.000Z"), exerciseCompleted: 1, eveningMood: 90, moodScore: 90 }),
    createRow({ day: new Date("2026-05-02T00:00:00.000Z"), exerciseCompleted: 1, eveningMood: 84, moodScore: 84 }),
    createRow({ day: new Date("2026-05-03T00:00:00.000Z"), exerciseCompleted: 1, eveningMood: 78, moodScore: 78 }),
    createRow({ day: new Date("2026-05-04T00:00:00.000Z"), exerciseCompleted: 0, eveningMood: 50, moodScore: 50 }),
    createRow({ day: new Date("2026-05-05T00:00:00.000Z"), exerciseCompleted: 0, eveningMood: 44, moodScore: 44 }),
    createRow({ day: new Date("2026-05-06T00:00:00.000Z"), exerciseCompleted: 0, eveningMood: 38, moodScore: 38 }),
    createRow({ day: new Date("2026-05-07T00:00:00.000Z"), exerciseCompleted: 0, eveningMood: 32, moodScore: 32 }),
    createRow({ day: new Date("2026-05-08T00:00:00.000Z"), exerciseCompleted: 0, eveningMood: 26, moodScore: 26 }),
  ];

  const candidate = deriveInsightCandidates(rows).find(
    (entry) => entry.metric === "ACTIVITY_TO_MOOD"
  );

  assert.ok(candidate);
  assert.equal(candidate.rawStrength, candidate.adjustedStrength);
  assert.equal(candidate.rawConfidence, candidate.adjustedConfidence);
  assert.equal(candidate.payload.confounderAdjusted, false);
  assert.match(candidate.adjustmentSummary, /aligned/i);
});

test("buildInsightAnalysisSnapshot keeps low-evidence patterns in an exploratory bucket instead of dropping them", () => {
  const moodEntries = Array.from({ length: 6 }, (_, index) => ({
    id: `mood-${index}`,
    userId: "user-1",
    day: new Date(`2026-05-0${index + 1}T00:00:00.000Z`),
    score: 50,
    tags: [],
    periods: [
      {
        id: `period-${index}`,
        moodEntryId: `mood-${index}`,
        userId: "user-1",
        day: new Date(`2026-05-0${index + 1}T00:00:00.000Z`),
        startMinute: 0,
        endMinute: 60,
        score: 50,
        tags: [],
      },
    ],
  }));
  const activities = [0, 1, 2].map((index) => ({
    id: `activity-${index}`,
    userId: "user-1",
    category: "EXERCISE",
    status: "COMPLETED",
    scheduledAt: new Date(`2026-05-0${index + 1}T08:00:00.000Z`),
  }));

  const snapshot = buildInsightAnalysisSnapshot({
    activities,
    habits: [],
    habitLogs: [],
    journalEntries: [],
    moodEntries: moodEntries.map((entry, index) => ({
      ...entry,
      score: index < 3 ? 72 - index * 2 : 46 - (index - 3) * 2,
      periods: [
        {
          ...entry.periods[0],
          score: index < 3 ? 72 - index * 2 : 46 - (index - 3) * 2,
        },
      ],
    })),
  });

  assert.equal(snapshot.candidates.length, 0);
  assert.ok(snapshot.exploratoryCandidates.length > 0);
  assert.equal(snapshot.readiness, "EXPLORATORY_ONLY");
  assert.match(snapshot.nullState?.title ?? "", /exploratory/i);
});

test("buildInsightAnalysisSnapshot returns a not-enough-data null state before the minimum tracked-day threshold", () => {
  const snapshot = buildInsightAnalysisSnapshot({
    activities: [],
    habits: [],
    habitLogs: [],
    journalEntries: [],
    moodEntries: Array.from({ length: 5 }, (_, index) => ({
      id: `mood-${index}`,
      userId: "user-1",
      day: new Date(`2026-05-0${index + 1}T00:00:00.000Z`),
      score: 50 + index,
      tags: [],
      periods: [
        {
          id: `period-${index}`,
          moodEntryId: `mood-${index}`,
          userId: "user-1",
          day: new Date(`2026-05-0${index + 1}T00:00:00.000Z`),
          startMinute: 0,
          endMinute: 60,
          score: 50 + index,
          tags: [],
        },
      ],
    })),
  });

  assert.equal(snapshot.readiness, "NOT_ENOUGH_DATA");
  assert.equal(snapshot.candidates.length, 0);
  assert.equal(snapshot.exploratoryCandidates.length, 0);
  assert.match(snapshot.nullState?.title ?? "", /not enough tracked days/i);
  assert.match(snapshot.nullState?.description ?? "", /at least 6/i);
});

test("buildInsightAnalysisSnapshot tracks delayed lag windows up to two days", () => {
  const snapshot = buildInsightAnalysisSnapshot({
    activities: [],
    habits: [],
    habitLogs: [],
    journalEntries: [],
    moodEntries: Array.from({ length: 8 }, (_, index) => ({
      id: `mood-${index}`,
      userId: "user-1",
      day: new Date(`2026-05-0${index + 1}T00:00:00.000Z`),
      score: 40 + index * 4,
      sleepHours: 6 + index,
      tags: [],
      periods: [
        {
          id: `period-${index}`,
          moodEntryId: `mood-${index}`,
          userId: "user-1",
          day: new Date(`2026-05-0${index + 1}T00:00:00.000Z`),
          startMinute: 0,
          endMinute: 60,
          score: 40 + index * 4,
          tags: [],
        },
      ],
    })),
  });

  assert.ok(snapshot.summary.visibleLagDays.includes(2));
  assert.equal(snapshot.summary.minimumReliableDays, 8);
});

test("sleep uncertainty copy warns against reading duration as the full causal story", () => {
  const snapshot = buildInsightAnalysisSnapshot({
    activities: [],
    habits: [],
    habitLogs: [],
    journalEntries: [],
    moodEntries: Array.from({ length: 8 }, (_, index) => ({
      id: `mood-${index}`,
      userId: "user-1",
      day: new Date(`2026-05-0${index + 1}T00:00:00.000Z`),
      score: 40 + index * 4,
      sleepHours: 6 + index,
      tags: [],
      periods: [
        {
          id: `period-${index}`,
          moodEntryId: `mood-${index}`,
          userId: "user-1",
          day: new Date(`2026-05-0${index + 1}T00:00:00.000Z`),
          startMinute: 0,
          endMinute: 60,
          score: 40 + index * 4,
          tags: [],
        },
      ],
    })),
  });

  const candidate = [...snapshot.candidates, ...snapshot.exploratoryCandidates].find(
    (entry) => entry.metric === "SLEEP_TO_MOOD"
  );

  assert.ok(candidate);
  assert.match(candidate.uncertaintySummary, /sleep duration alone is not a causal explanation/i);
});

test("social uncertainty copy warns that recovery may come from more than connection itself", () => {
  const rows = Array.from({ length: 8 }, (_, index) =>
    createRow({
      day: new Date(`2026-05-0${index + 1}T00:00:00.000Z`),
      socialCompleted: index < 4 ? 1 : 0,
      moodScore: index < 4 ? 70 - index : 42 - (index - 4),
      eveningMood: index < 4 ? 70 - index : 42 - (index - 4),
    })
  );

  const candidate = deriveInsightCandidates(rows).find(
    (entry) => entry.metric === "SOCIAL_TO_MOOD"
  );

  assert.ok(candidate);
  assert.match(candidate.uncertaintySummary, /connection itself|kind of plans/i);
});

test("buildBehaviorFeatureRows prefers explicit life-event day exposures over broad event overlap", () => {
  const day = new Date("2026-05-01T00:00:00.000Z");
  const rows = buildBehaviorFeatureRows({
    activities: [],
    habits: [],
    habitLogs: [],
    journalEntries: [],
    moodEntries: [
      {
        id: "mood-1",
        userId: "user-1",
        day,
        score: 62,
        tags: [],
        periods: [
          {
            id: "period-1",
            moodEntryId: "mood-1",
            userId: "user-1",
            day,
            startMinute: 480,
            endMinute: 600,
            score: 62,
            tags: [],
          },
        ],
      },
    ],
    lifeEvents: [
      {
        id: "event-1",
        userId: "user-1",
        title: "Deadline pressure",
        category: "WORK",
        severityScore: 5,
        sentiment: "NEGATIVE",
        startAt: new Date("2026-05-01T00:00:00.000Z"),
        endAt: new Date("2026-05-02T00:00:00.000Z"),
        isOngoing: false,
        tags: ["deadline"],
      },
    ],
    lifeEventDayExposures: [
      {
        id: "exposure-1",
        userId: "user-1",
        lifeEventId: "event-1",
        day,
        overlapMinutes: 90,
        overlapRatio: 0.063,
        severityScore: 2,
        sentiment: "POSITIVE",
        weightedImpact: 0.08,
        category: "RECOVERY",
        tags: ["walk"],
      },
    ],
  });

  assert.equal(rows.length, 1);
  assert.equal(rows[0]?.confoundedDay, false);
  assert.equal(rows[0]?.negativeLifeEventLoad, 0);
  assert.equal(rows[0]?.positiveLifeEventLoad, 0.08);
  assert.deepEqual(rows[0]?.lifeEventCategories, ["RECOVERY"]);
  assert.deepEqual(rows[0]?.lifeEventTags, ["walk"]);
});

test("buildInsightAnalysisSnapshot can surface a supported two-day sleep candidate when the delayed signal is strong enough", () => {
  const snapshot = buildInsightAnalysisSnapshot({
    activities: [],
    habits: [],
    habitLogs: [],
    journalEntries: [],
    moodEntries: Array.from({ length: 14 }, (_, index) => ({
      id: `mood-${index}`,
      userId: "user-1",
      day: new Date(`2026-05-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
      score: 45 + index * 3,
      sleepHours: 6 + index * 0.4,
      tags: [],
      periods: [
        {
          id: `period-${index}`,
          moodEntryId: `mood-${index}`,
          userId: "user-1",
          day: new Date(`2026-05-${String(index + 1).padStart(2, "0")}T00:00:00.000Z`),
          startMinute: 0,
          endMinute: 60,
          score: 45 + index * 3,
          tags: [],
        },
      ],
    })),
  });

  const candidate = snapshot.candidates.find(
    (entry) => entry.metric === "SLEEP_TO_MOOD" && entry.lagDays === 2
  );

  assert.ok(candidate);
  assert.equal(candidate.evidenceLevel, "SUPPORTED");
  assert.equal(candidate.sampleSize, 12);
  assert.match(candidate.evidenceSummary, /Supported pattern/i);
  assert.match(candidate.evidenceSummary, /2-day delayed reflections/i);
  assert.equal(snapshot.readiness, "ACTIONABLE");
  assert.equal(snapshot.nullState, null);
  assert.ok(snapshot.summary.supportedSignals >= 1);
});