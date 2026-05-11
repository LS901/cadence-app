import assert from "node:assert/strict";
import test from "node:test";
import {
  clearCredentialSignInAttempts,
  isCredentialSignInRateLimited,
  recordFailedCredentialSignInAttempt,
} from "./auth-rate-limit";

type RateLimitStore = Map<string, { count: number; resetAt: number }>;

function getRateLimitStore() {
  return globalThis as typeof globalThis & {
    __cadenceAuthRateLimitStore__?: RateLimitStore;
  };
}

function resetRateLimitStore() {
  getRateLimitStore().__cadenceAuthRateLimitStore__?.clear();
}

function createRequest(ipAddress: string, forwardedFor?: string) {
  return new Request("http://localhost/sign-in", {
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

test("auth rate limiting starts blocking on the eighth failed attempt for the same email and IP", async () => {
  resetRateLimitStore();

  await withMockedNow(1_000, () => {
    const request = createRequest("203.0.113.10");

    for (let attempt = 1; attempt <= 7; attempt += 1) {
      recordFailedCredentialSignInAttempt("demo@cadence.app", request);
      assert.equal(isCredentialSignInRateLimited("demo@cadence.app", request), false);
    }

    recordFailedCredentialSignInAttempt("demo@cadence.app", request);

    assert.equal(isCredentialSignInRateLimited("demo@cadence.app", request), true);
  });
});

test("auth rate limiting normalizes email casing and uses the first forwarded IP", async () => {
  resetRateLimitStore();

  await withMockedNow(2_000, () => {
    const request = createRequest("198.51.100.8", "198.51.100.1, 198.51.100.2");

    for (let attempt = 1; attempt <= 8; attempt += 1) {
      recordFailedCredentialSignInAttempt(" Demo@Cadence.App ", request);
    }

    assert.equal(isCredentialSignInRateLimited("demo@cadence.app", request), true);
    assert.equal(
      isCredentialSignInRateLimited(
        "demo@cadence.app",
        createRequest("198.51.100.8", "198.51.100.1, 198.51.100.9")
      ),
      true
    );
    assert.equal(
      isCredentialSignInRateLimited(
        "demo@cadence.app",
        createRequest("198.51.100.8", "198.51.100.99, 198.51.100.1")
      ),
      false
    );
  });
});

test("auth rate limiting clears failed attempts after a successful sign-in", async () => {
  resetRateLimitStore();

  await withMockedNow(3_000, () => {
    const request = createRequest("203.0.113.20");

    for (let attempt = 1; attempt <= 8; attempt += 1) {
      recordFailedCredentialSignInAttempt("demo@cadence.app", request);
    }

    assert.equal(isCredentialSignInRateLimited("demo@cadence.app", request), true);

    clearCredentialSignInAttempts("demo@cadence.app", request);

    assert.equal(isCredentialSignInRateLimited("demo@cadence.app", request), false);
  });
});

test("auth rate limiting expires after the configured time window", async () => {
  resetRateLimitStore();

  const request = createRequest("203.0.113.30");

  await withMockedNow(4_000, () => {
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      recordFailedCredentialSignInAttempt("demo@cadence.app", request);
    }

    assert.equal(isCredentialSignInRateLimited("demo@cadence.app", request), true);
  });

  await withMockedNow(4_000 + 10 * 60 * 1000 + 1, () => {
    assert.equal(isCredentialSignInRateLimited("demo@cadence.app", request), false);
  });
});