import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import { journalEntrySchema } from "./journal";

function createJournalInput() {
  return {
    day: new Date("2030-05-10T00:00:00.000Z"),
    title: "A steadier day",
    content: "I felt more settled today and handled the workload with less friction.",
    moodScore: 68,
  };
}

test("journalEntrySchema accepts a valid journal entry payload", () => {
  const parsed = journalEntrySchema.parse(createJournalInput());

  assert.equal(parsed.title, "A steadier day");
  assert.equal(parsed.content, "I felt more settled today and handled the workload with less friction.");
  assert.equal(parsed.moodScore, 68);
});

test("journalEntrySchema accepts entries without optional title or mood score", () => {
  const parsed = journalEntrySchema.parse({
    day: new Date("2030-05-10T00:00:00.000Z"),
    content: "A short but valid reflection about the day.",
  });

  assert.equal(parsed.title, undefined);
  assert.equal(parsed.moodScore, undefined);
});

test("journalEntrySchema rejects titles longer than the supported limit", () => {
  assert.throws(
    () =>
      journalEntrySchema.parse({
        ...createJournalInput(),
        title: "x".repeat(81),
      }),
    ZodError
  );
});

test("journalEntrySchema rejects content that is too short or too long", () => {
  assert.throws(
    () =>
      journalEntrySchema.parse({
        ...createJournalInput(),
        content: "Too shy",
      }),
    ZodError
  );

  assert.throws(
    () =>
      journalEntrySchema.parse({
        ...createJournalInput(),
        content: "x".repeat(4001),
      }),
    ZodError
  );
});

test("journalEntrySchema rejects mood scores outside the supported range", () => {
  assert.throws(
    () =>
      journalEntrySchema.parse({
        ...createJournalInput(),
        moodScore: 0,
      }),
    ZodError
  );

  assert.throws(
    () =>
      journalEntrySchema.parse({
        ...createJournalInput(),
        moodScore: 101,
      }),
    ZodError
  );
});