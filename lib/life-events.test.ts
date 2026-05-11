import assert from "node:assert/strict";
import test from "node:test";
import {
  buildLifeEventTimeline,
  formatLifeEventWindow,
  getLifeEventCategoryLabel,
  getLifeEventRecurrenceLabel,
  getLifeEventSentimentLabel,
  getLifeEventSeverityLabel,
  isLifeEventActive,
  lifeEventOverlapsDay,
} from "./life-events";

test("life-event labels fall back safely for unknown values", () => {
  assert.equal(getLifeEventCategoryLabel("BURNOUT"), "Burnout");
  assert.equal(getLifeEventCategoryLabel("UNKNOWN"), "Other");
  assert.equal(getLifeEventSentimentLabel("POSITIVE"), "Supportive or uplifting");
  assert.equal(getLifeEventSentimentLabel(null), "Unspecified");
  assert.equal(getLifeEventSeverityLabel(4), "Dominant");
  assert.equal(getLifeEventSeverityLabel(9), "Context");
});

test("life-event recurrence labels handle built-in intervals, custom rules, and unsupported values", () => {
  assert.equal(getLifeEventRecurrenceLabel("DAILY"), "Daily");
  assert.equal(getLifeEventRecurrenceLabel("WEEKLY", 2), "Every 2 weeks");
  assert.equal(getLifeEventRecurrenceLabel("CUSTOM", null, "Every first Monday"), "Every first Monday");
  assert.equal(getLifeEventRecurrenceLabel("CUSTOM", null, "   "), "Custom cadence");
  assert.equal(getLifeEventRecurrenceLabel("UNKNOWN"), null);
});

test("isLifeEventActive and lifeEventOverlapsDay respect bounded and ongoing windows", () => {
  const boundedEvent = {
    startAt: new Date(2030, 4, 1, 9, 0, 0),
    endAt: new Date(2030, 4, 1, 17, 0, 0),
    isOngoing: false,
  };
  const ongoingEvent = {
    startAt: new Date(2030, 4, 2, 12, 0, 0),
    endAt: null,
    isOngoing: true,
  };

  assert.equal(isLifeEventActive(boundedEvent, new Date(2030, 4, 1, 12, 0, 0)), true);
  assert.equal(isLifeEventActive(boundedEvent, new Date(2030, 4, 1, 18, 0, 0)), false);
  assert.equal(isLifeEventActive(ongoingEvent, new Date(2030, 4, 2, 11, 59, 0)), false);
  assert.equal(isLifeEventActive(ongoingEvent, new Date(2030, 4, 3, 9, 0, 0)), true);

  assert.equal(lifeEventOverlapsDay(boundedEvent, new Date(2030, 4, 1, 6, 0, 0)), true);
  assert.equal(lifeEventOverlapsDay(boundedEvent, new Date(2030, 4, 2, 6, 0, 0)), false);
  assert.equal(lifeEventOverlapsDay(ongoingEvent, new Date(2030, 4, 5, 6, 0, 0)), true);
});

test("formatLifeEventWindow renders ongoing, single-point, same-day, and multi-day windows", () => {
  assert.equal(
    formatLifeEventWindow({
      startAt: new Date(2030, 4, 1, 9, 0, 0),
      endAt: null,
      isOngoing: true,
    }),
    "Ongoing since May 1, 2030"
  );

  assert.equal(
    formatLifeEventWindow({
      startAt: new Date(2030, 4, 1, 9, 0, 0),
      endAt: null,
      isOngoing: false,
    }),
    "May 1, 2030 · 9:00 AM"
  );

  assert.equal(
    formatLifeEventWindow({
      startAt: new Date(2030, 4, 1, 9, 0, 0),
      endAt: new Date(2030, 4, 1, 17, 30, 0),
      isOngoing: false,
    }),
    "May 1, 2030 · 9:00 AM to 5:30 PM"
  );

  assert.equal(
    formatLifeEventWindow({
      startAt: new Date(2030, 4, 1, 9, 0, 0),
      endAt: new Date(2030, 4, 3, 10, 0, 0),
      isOngoing: false,
    }),
    "May 1 to May 3, 2030"
  );
});

test("buildLifeEventTimeline aggregates overlap counts, severity, and dominant event per day", () => {
  const days = [
    { day: "Mon", date: new Date(2030, 4, 6, 0, 0, 0) },
    { day: "Tue", date: new Date(2030, 4, 7, 0, 0, 0) },
    { day: "Wed", date: new Date(2030, 4, 8, 0, 0, 0) },
  ];

  const timeline = buildLifeEventTimeline(days, [
    {
      title: "Work crunch",
      severityScore: 3,
      sentiment: "NEGATIVE",
      startAt: new Date(2030, 4, 6, 9, 0, 0),
      endAt: new Date(2030, 4, 7, 12, 0, 0),
      isOngoing: false,
    },
    {
      title: "Family support",
      severityScore: 4,
      sentiment: "POSITIVE",
      startAt: new Date(2030, 4, 7, 8, 0, 0),
      endAt: new Date(2030, 4, 7, 20, 0, 0),
      isOngoing: false,
    },
  ]);

  assert.deepEqual(timeline, [
    {
      day: "Mon",
      dateIso: days[0]!.date.toISOString(),
      activeCount: 1,
      totalSeverity: 3,
      dominantTitle: "Work crunch",
      dominantSentiment: "NEGATIVE",
    },
    {
      day: "Tue",
      dateIso: days[1]!.date.toISOString(),
      activeCount: 2,
      totalSeverity: 7,
      dominantTitle: "Family support",
      dominantSentiment: "POSITIVE",
    },
    {
      day: "Wed",
      dateIso: days[2]!.date.toISOString(),
      activeCount: 0,
      totalSeverity: 0,
      dominantTitle: null,
      dominantSentiment: null,
    },
  ]);
});