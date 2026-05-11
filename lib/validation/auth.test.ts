import assert from "node:assert/strict";
import test from "node:test";
import { ZodError } from "zod";
import { signInSchema } from "./auth";

test("signInSchema accepts a valid email and password", () => {
  const parsed = signInSchema.parse({
    email: "demo@cadence.app",
    password: "password123",
  });

  assert.equal(parsed.email, "demo@cadence.app");
  assert.equal(parsed.password, "password123");
});

test("signInSchema rejects invalid email addresses", () => {
  assert.throws(
    () =>
      signInSchema.parse({
        email: "not-an-email",
        password: "password123",
      }),
    ZodError
  );
});

test("signInSchema rejects passwords shorter than eight characters", () => {
  assert.throws(
    () =>
      signInSchema.parse({
        email: "demo@cadence.app",
        password: "short",
      }),
    ZodError
  );
});