import assert from "node:assert/strict";
import test from "node:test";
import { getAuthEmailConfigStatus } from "./auth-env";

test("getAuthEmailConfigStatus reports missing auth email configuration", () => {
  delete process.env.APP_BASE_URL;
  delete process.env.NEXTAUTH_URL;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;
  delete process.env.SMTP_FROM_EMAIL;

  const result = getAuthEmailConfigStatus();

  assert.equal(result.appBaseUrlConfigured, false);
  assert.equal(result.smtpConfigured, false);
  assert.deepEqual(result.smtpFieldsMissing, [
    "SMTP_HOST",
    "SMTP_PORT",
    "SMTP_USER",
    "SMTP_PASSWORD",
    "SMTP_FROM_EMAIL",
  ]);
});