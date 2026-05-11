import assert from "node:assert/strict";
import test from "node:test";
import { demoUser } from "@/lib/data/mock-cadence";
import { clearCredentialSignInAttempts } from "@/lib/security/auth-rate-limit";
import { authorizeCredentialsSignIn } from "./authorize-credentials";

function createRequest(ipAddress: string) {
  return new Request("http://localhost/api/auth/callback/credentials", {
    headers: {
      "x-real-ip": ipAddress,
    },
  });
}

function resetAttempts(request: Request, email = demoUser.email) {
  clearCredentialSignInAttempts(email, request);
}

test("authorizeCredentialsSignIn returns the demo user in mock mode for valid credentials", async () => {
  const result = await authorizeCredentialsSignIn(
    {
      email: demoUser.email,
      password: demoUser.password,
    },
    createRequest("203.0.113.10"),
    {
      hasDatabase: false,
    }
  );

  assert.deepEqual(result, {
    id: demoUser.id,
    name: demoUser.name,
    email: demoUser.email,
  });
});

test("authorizeCredentialsSignIn short-circuits when the request is already rate limited", async () => {
  let recordedFailures = 0;

  const result = await authorizeCredentialsSignIn(
    {
      email: demoUser.email,
      password: demoUser.password,
    },
    createRequest("203.0.113.11"),
    {
      isRateLimited: () => true,
      recordFailedAttempt: () => {
        recordedFailures += 1;
      },
    }
  );

  assert.equal(result, null);
  assert.equal(recordedFailures, 0);
});

test("authorizeCredentialsSignIn records a failed attempt when sign-in payload validation fails", async () => {
  const attemptedEmails: Array<string | null | undefined> = [];

  const result = await authorizeCredentialsSignIn(
    {
      email: "demo@cadence.app",
      password: "short",
    },
    createRequest("203.0.113.12"),
    {
      hasDatabase: false,
      recordFailedAttempt: (email) => {
        attemptedEmails.push(email);
      },
    }
  );

  assert.equal(result, null);
  assert.deepEqual(attemptedEmails, ["demo@cadence.app"]);
});

test("authorizeCredentialsSignIn clears failures after a successful database-backed sign-in", async () => {
  const clearedEmails: Array<string | null | undefined> = [];

  const result = await authorizeCredentialsSignIn(
    {
      email: "member@cadence.app",
      password: demoUser.password,
    },
    createRequest("203.0.113.13"),
    {
      hasDatabase: true,
      findUserByEmail: async (email) => ({
        id: "user-1",
        name: "Member",
        email,
        image: "https://example.com/avatar.png",
        passwordHash: "stored-hash",
      }),
      comparePassword: async (password, passwordHash) =>
        password === demoUser.password && passwordHash === "stored-hash",
      clearAttempts: (email) => {
        clearedEmails.push(email);
      },
    }
  );

  assert.deepEqual(result, {
    id: "user-1",
    name: "Member",
    email: "member@cadence.app",
    image: "https://example.com/avatar.png",
  });
  assert.deepEqual(clearedEmails, ["member@cadence.app"]);
});

test("authorizeCredentialsSignIn records a failed attempt when the database password check fails", async () => {
  const attemptedEmails: Array<string | null | undefined> = [];

  const result = await authorizeCredentialsSignIn(
    {
      email: "member@cadence.app",
      password: demoUser.password,
    },
    createRequest("203.0.113.14"),
    {
      hasDatabase: true,
      findUserByEmail: async (email) => ({
        id: "user-1",
        name: "Member",
        email,
        image: null,
        passwordHash: "stored-hash",
      }),
      comparePassword: async () => false,
      recordFailedAttempt: (email) => {
        attemptedEmails.push(email);
      },
    }
  );

  assert.equal(result, null);
  assert.deepEqual(attemptedEmails, ["member@cadence.app"]);
});

test("authorizeCredentialsSignIn starts rejecting even valid mock-mode credentials after repeated real failed attempts", async () => {
  const request = createRequest("203.0.113.15");
  resetAttempts(request);

  try {
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      const result = await authorizeCredentialsSignIn(
        {
          email: demoUser.email,
          password: "wrong-password",
        },
        request,
        {
          hasDatabase: false,
        }
      );

      assert.equal(result, null);
    }

    const blockedResult = await authorizeCredentialsSignIn(
      {
        email: demoUser.email,
        password: demoUser.password,
      },
      request,
      {
        hasDatabase: false,
      }
    );

    assert.equal(blockedResult, null);
  } finally {
    resetAttempts(request);
  }
});