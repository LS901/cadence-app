import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import { settingsProfileSchema } from "./settings";

test("settingsProfileSchema accepts a trimmed valid profile payload", () => {
  const parsed = settingsProfileSchema.parse({
    name: "  Lewis Carter  ",
    timezone: "Europe/London",
  });

  assert.equal(parsed.name, "Lewis Carter");
  assert.equal(parsed.timezone, "Europe/London");
});

test("settingsProfileSchema rejects names outside the supported range", () => {
  assert.throws(
    () =>
      settingsProfileSchema.parse({
        name: "A",
        timezone: "UTC",
      }),
    ZodError
  );

  assert.throws(
    () =>
      settingsProfileSchema.parse({
        name: "x".repeat(81),
        timezone: "UTC",
      }),
    ZodError
  );
});

test("settingsProfileSchema rejects unsupported timezones", () => {
  assert.throws(
    () =>
      settingsProfileSchema.parse({
        name: "Lewis Carter",
        timezone: "Europe/Paris",
      }),
    ZodError
  );
});