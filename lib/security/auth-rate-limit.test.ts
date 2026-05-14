import assert from "node:assert/strict";
import test from "node:test";
import type { RateLimitDependencies } from "./rate-limit-store";
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

  await withMockedNow(1_000, async () => {
    const request = createRequest("203.0.113.10");
    for (let attempt = 1; attempt <= 7; attempt += 1) {
      await recordFailedCredentialSignInAttempt("demo@cadence.app", request);
      assert.equal(await isCredentialSignInRateLimited("demo@cadence.app", request), false);
    }

    await recordFailedCredentialSignInAttempt("demo@cadence.app", request);

    assert.equal(await isCredentialSignInRateLimited("demo@cadence.app", request), true);
  });
});

test("auth rate limiting normalizes email casing and uses the first forwarded IP", async () => {
  resetRateLimitStore();

  await withMockedNow(2_000, async () => {
    const request = createRequest("198.51.100.8", "198.51.100.1, 198.51.100.2");

    for (let attempt = 1; attempt <= 8; attempt += 1) {
      await recordFailedCredentialSignInAttempt(" Demo@Cadence.App ", request);
    }

    assert.equal(await isCredentialSignInRateLimited("demo@cadence.app", request), true);
    assert.equal(
      await isCredentialSignInRateLimited(
        "demo@cadence.app",
        createRequest("198.51.100.8", "198.51.100.1, 198.51.100.9")
      ),
      true
    );
    assert.equal(
      await isCredentialSignInRateLimited(
        "demo@cadence.app",
        createRequest("198.51.100.8", "198.51.100.99, 198.51.100.1")
      ),
      false
    );
  });
});

test("auth rate limiting clears failed attempts after a successful sign-in", async () => {
  resetRateLimitStore();

  await withMockedNow(3_000, async () => {
    const request = createRequest("203.0.113.20");

    for (let attempt = 1; attempt <= 8; attempt += 1) {
      await recordFailedCredentialSignInAttempt("demo@cadence.app", request);
    }

    assert.equal(await isCredentialSignInRateLimited("demo@cadence.app", request), true);

    await clearCredentialSignInAttempts("demo@cadence.app", request);

    assert.equal(await isCredentialSignInRateLimited("demo@cadence.app", request), false);
  });
});

test("auth rate limiting expires after the configured time window", async () => {
  resetRateLimitStore();

  const request = createRequest("203.0.113.30");

  await withMockedNow(4_000, async () => {
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      await recordFailedCredentialSignInAttempt("demo@cadence.app", request);
    }

    assert.equal(await isCredentialSignInRateLimited("demo@cadence.app", request), true);
  });

  await withMockedNow(4_000 + 10 * 60 * 1000 + 1, async () => {
    assert.equal(await isCredentialSignInRateLimited("demo@cadence.app", request), false);
  });
});

test("auth rate limiting prunes the oldest keys once the store exceeds the max size", async () => {
  resetRateLimitStore();

  const request = createRequest("203.0.113.40");

  await withMockedNow(10_000, async () => {
    for (let attempt = 1; attempt <= 7; attempt += 1) {
      await recordFailedCredentialSignInAttempt("user-0@cadence.app", request);
    }
  });

  for (let index = 1; index <= 499; index += 1) {
    await withMockedNow(10_000 + index, async () => {
      await recordFailedCredentialSignInAttempt(`user-${index}@cadence.app`, request);
    });
  }

  await withMockedNow(20_000, async () => {
    for (let attempt = 1; attempt <= 7; attempt += 1) {
      await recordFailedCredentialSignInAttempt("user-500@cadence.app", request);
    }
  });

  await withMockedNow(30_000, async () => {
    assert.equal(await isCredentialSignInRateLimited("user-0@cadence.app", request), false);
  });

  await withMockedNow(30_001, async () => {
    await recordFailedCredentialSignInAttempt("user-0@cadence.app", request);
    assert.equal(await isCredentialSignInRateLimited("user-0@cadence.app", request), false);
  });

  await withMockedNow(30_002, async () => {
    assert.equal(await isCredentialSignInRateLimited("user-500@cadence.app", request), false);
    await recordFailedCredentialSignInAttempt("user-500@cadence.app", request);
    assert.equal(await isCredentialSignInRateLimited("user-500@cadence.app", request), true);
  });
});

test("auth rate limiting uses the persistent delegate when a database-backed store is available", async () => {
  const persistedEntries = new Map<string, { key: string; scope: string; count: number; resetAt: Date }>();
  const request = createRequest("203.0.113.50");
  const dependencies: RateLimitDependencies = {
    hasDatabase: true,
    now: () => new Date("2026-05-13T12:00:00.000Z"),
    rateLimitBucket: {
      findUnique: async ({ where }) => persistedEntries.get(where.key) ?? null,
      create: async ({ data }) => {
        persistedEntries.set(data.key, data);
        return data;
      },
      update: async ({ where, data }) => {
        const existing = persistedEntries.get(where.key);

        if (!existing) {
          throw new Error("missing persisted entry");
        }

        const updated = {
          ...existing,
          ...data,
        };
        persistedEntries.set(where.key, updated);
        return updated;
      },
      delete: async ({ where }) => {
        persistedEntries.delete(where.key);
        return { count: 1 };
      },
      deleteMany: async ({ where }) => {
        for (const [key, entry] of persistedEntries.entries()) {
          if (where.scope && entry.scope !== where.scope) {
            continue;
          }

          if (where.resetAt?.lte && entry.resetAt > where.resetAt.lte) {
            continue;
          }

          if (where.key?.in && !where.key.in.includes(key)) {
            continue;
          }

          persistedEntries.delete(key);
        }

        return { count: 0 };
      },
      count: async ({ where }) => {
        return [...persistedEntries.values()].filter((entry) => entry.scope === where.scope).length;
      },
      findMany: async ({ where, orderBy, take }) => {
        return [...persistedEntries.values()]
          .filter((entry) => entry.scope === where.scope)
          .sort((left, right) => {
            return orderBy.resetAt === "asc"
              ? left.resetAt.getTime() - right.resetAt.getTime()
              : right.resetAt.getTime() - left.resetAt.getTime();
          })
          .slice(0, take)
          .map((entry) => ({ key: entry.key }));
      },
    },
  };

  for (let attempt = 1; attempt <= 8; attempt += 1) {
    await recordFailedCredentialSignInAttempt("member@cadence.app", request, dependencies);
  }

  assert.equal(
    await isCredentialSignInRateLimited("member@cadence.app", request, dependencies),
    true
  );

  await clearCredentialSignInAttempts("member@cadence.app", request, dependencies);

  assert.equal(
    await isCredentialSignInRateLimited("member@cadence.app", request, dependencies),
    false
  );
});