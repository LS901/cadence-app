import assert from "node:assert/strict";
import test from "node:test";
import { isSignUpRateLimited, recordSignUpAttempt } from "./sign-up-rate-limit";

type RateLimitStore = Map<string, { count: number; resetAt: number }>;

function getRateLimitStore() {
  return globalThis as typeof globalThis & {
    __cadenceSignUpRateLimitStore__?: RateLimitStore;
  };
}

function resetRateLimitStore() {
  getRateLimitStore().__cadenceSignUpRateLimitStore__?.clear();
}

function createRequest(ipAddress: string, forwardedFor?: string) {
  return new Request("http://localhost/api/auth/sign-up", {
    headers: {
      "x-real-ip": ipAddress,
      ...(forwardedFor ? { "x-forwarded-for": forwardedFor } : {}),
    },
  });
}

async function withMockedNow(now: number, callback: () => void | Promise<void>) {
  const originalNow = Date.now;
  Date.now = () => now;

  try {
    await callback();
  } finally {
    Date.now = originalNow;
  }
}

test("sign-up rate limiting starts blocking on the fifth repeated attempt for the same email and IP", async () => {
  resetRateLimitStore();

  await withMockedNow(1_000, async () => {
    const request = createRequest("203.0.113.210");

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await recordSignUpAttempt("member@cadence.app", request);
      assert.equal(await isSignUpRateLimited("member@cadence.app", request), false);
    }

    await recordSignUpAttempt("member@cadence.app", request);

    assert.equal(await isSignUpRateLimited("member@cadence.app", request), true);
  });
});

test("sign-up rate limiting normalizes email casing and uses the first forwarded IP", async () => {
  resetRateLimitStore();

  await withMockedNow(2_000, async () => {
    const request = createRequest("198.51.100.8", "198.51.100.1, 198.51.100.2");

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await recordSignUpAttempt(" Member@Cadence.App ", request);
    }

    assert.equal(await isSignUpRateLimited("member@cadence.app", request), true);
    assert.equal(
      await isSignUpRateLimited(
        "member@cadence.app",
        createRequest("198.51.100.8", "198.51.100.1, 198.51.100.9")
      ),
      true
    );
    assert.equal(
      await isSignUpRateLimited(
        "member@cadence.app",
        createRequest("198.51.100.8", "198.51.100.99, 198.51.100.1")
      ),
      false
    );
  });
});
