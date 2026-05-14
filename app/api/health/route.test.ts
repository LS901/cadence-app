import assert from "node:assert/strict";
import test from "node:test";
import { getHealthCheckResult } from "./route";

test("getHealthCheckResult returns a healthy mock-mode response when no database is configured", async () => {
  const result = await getHealthCheckResult({
    hasDatabase: false,
    authEmailConfig: {
      appBaseUrlConfigured: false,
      smtpConfigured: false,
      smtpFieldsMissing: ["SMTP_HOST"],
    },
    now: () => new Date("2026-05-11T12:00:00.000Z"),
    runtimeEnv: "development",
  });

  assert.equal(result.status, 200);
  assert.equal(result.body.status, "ok");
  assert.equal(result.body.mode, "mock");
  assert.equal(result.body.checks.database.status, "skipped");
  assert.equal(result.body.checks.authEmail.status, "ok");
  assert.equal(result.body.timestamp, "2026-05-11T12:00:00.000Z");
});

test("getHealthCheckResult queries the database and returns healthy database mode when the probe succeeds", async () => {
  let queryCount = 0;

  const result = await getHealthCheckResult({
    hasDatabase: true,
    authEmailConfig: {
      appBaseUrlConfigured: true,
      smtpConfigured: true,
      smtpFieldsMissing: [],
    },
    now: () => new Date("2026-05-11T12:05:00.000Z"),
    queryDatabase: async () => {
      queryCount += 1;
    },
    runtimeEnv: "production",
  });

  assert.equal(queryCount, 1);
  assert.equal(result.status, 200);
  assert.equal(result.body.status, "ok");
  assert.equal(result.body.mode, "database");
  assert.equal(result.body.checks.database.status, "ok");
  assert.equal(result.body.checks.authEmail.status, "ok");
});

test("getHealthCheckResult returns degraded database mode when the probe fails", async () => {
  const loggedErrors: Array<{ message: string; error: unknown }> = [];

  const result = await getHealthCheckResult({
    hasDatabase: true,
    authEmailConfig: {
      appBaseUrlConfigured: true,
      smtpConfigured: true,
      smtpFieldsMissing: [],
    },
    queryDatabase: async () => {
      throw new Error("Database unavailable");
    },
    logError: (message, error) => {
      loggedErrors.push({ message, error });
    },
    runtimeEnv: "production",
  });

  assert.equal(result.status, 503);
  assert.equal(result.body.status, "degraded");
  assert.equal(result.body.mode, "database");
  assert.equal(result.body.checks.database.status, "error");
  assert.equal(result.body.checks.authEmail.status, "ok");
  assert.equal(loggedErrors.length, 1);
  assert.equal(loggedErrors[0]?.message, "Health check failed");
  assert.match(String(loggedErrors[0]?.error), /Database unavailable/);
});