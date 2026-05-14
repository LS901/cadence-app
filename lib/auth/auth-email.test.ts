import assert from "node:assert/strict";
import test from "node:test";
import { buildAuthActionUrl, isAuthEmailDeliveryAvailable, sendAuthActionEmail } from "./auth-email";

test("buildAuthActionUrl creates a verify-email link from the request origin", () => {
  const url = buildAuthActionUrl(
    "verify-email",
    "user@cadence.app",
    "token-123",
    "https://cadence.example.com"
  );

  assert.equal(
    url,
    "https://cadence.example.com/verify-email?email=user%40cadence.app&token=token-123"
  );
});

test("sendAuthActionEmail returns a preview link in non-production when SMTP is not configured", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;
  delete process.env.SMTP_FROM_EMAIL;
  process.env.NODE_ENV = "development";

  try {
    const result = await sendAuthActionEmail({
      purpose: "reset-password",
      email: "user@cadence.app",
      token: "token-123",
      requestOrigin: "https://cadence.example.com",
    });

    assert.deepEqual(result, {
      status: "sent",
      mode: "preview",
      previewUrl:
        "https://cadence.example.com/reset-password?email=user%40cadence.app&token=token-123",
    });
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("sendAuthActionEmail uses the provided transport when available", async () => {
  const sentMessages: Array<Record<string, unknown>> = [];

  const result = await sendAuthActionEmail({
    purpose: "verify-email",
    email: "user@cadence.app",
    name: "Morgan",
    token: "token-123",
    requestOrigin: "https://cadence.example.com",
    transport: {
      sendMail: async (message) => {
        sentMessages.push(message as Record<string, unknown>);
      },
    },
  });

  assert.deepEqual(result, {
    status: "sent",
    mode: "smtp",
  });
  assert.equal(sentMessages.length, 1);
  assert.equal(sentMessages[0]?.to, "user@cadence.app");
  assert.equal(sentMessages[0]?.subject, "Verify your Cadence account");
});

test("sendAuthActionEmail reports delivery as unavailable in production without SMTP configuration", async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;
  delete process.env.SMTP_FROM_EMAIL;
  process.env.NODE_ENV = "production";

  try {
    const result = await sendAuthActionEmail({
      purpose: "verify-email",
      email: "user@cadence.app",
      token: "token-123",
      requestOrigin: "https://cadence.example.com",
    });

    assert.deepEqual(result, {
      status: "unavailable",
      message: "Email delivery is not configured for this deployment.",
    });
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
  }
});

test("isAuthEmailDeliveryAvailable is true in development even without SMTP configuration", () => {
  const originalNodeEnv = process.env.NODE_ENV;
  delete process.env.SMTP_HOST;
  delete process.env.SMTP_PORT;
  delete process.env.SMTP_USER;
  delete process.env.SMTP_PASSWORD;
  delete process.env.SMTP_FROM_EMAIL;
  process.env.NODE_ENV = "development";

  try {
    assert.equal(isAuthEmailDeliveryAvailable(), true);
  } finally {
    process.env.NODE_ENV = originalNodeEnv;
  }
});