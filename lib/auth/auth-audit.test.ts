import assert from "node:assert/strict";
import test from "node:test";
import { logAuthAuditEvent } from "./auth-audit";

test("logAuthAuditEvent emits a structured entry with normalized email and request IP", () => {
  const entries: Array<Record<string, string>> = [];

  logAuthAuditEvent(
    "password-recovery-requested",
    {
      email: " Member@Cadence.App ",
      flow: "reset-password",
      outcome: "accepted",
    },
    {
      request: new Request("http://localhost/api/auth/password-reset/request", {
        headers: {
          "x-real-ip": "203.0.113.210",
        },
      }),
      now: () => new Date("2026-05-12T12:00:00.000Z"),
      log: (entry) => {
        entries.push(entry);
      },
    }
  );

  assert.deepEqual(entries, [
    {
      category: "auth",
      event: "password-recovery-requested",
      timestamp: "2026-05-12T12:00:00.000Z",
      email: "member@cadence.app",
      flow: "reset-password",
      outcome: "accepted",
      ipAddress: "203.0.113.210",
    },
  ]);
});