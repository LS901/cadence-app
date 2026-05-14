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

async function resetAttempts(request: Request, email = demoUser.email) {
  await clearCredentialSignInAttempts(email, request);
}

test("authorizeCredentialsSignIn returns the demo user in mock mode for valid credentials", async () => {
  const clearedEmails: Array<string | null | undefined> = [];

  const result = await authorizeCredentialsSignIn(
    {
      email: demoUser.email,
      password: demoUser.password,
    },
    createRequest("203.0.113.10"),
    {
      clearAttempts: (email) => {
        clearedEmails.push(email);
      },
    }
  );

  assert.deepEqual(result, {
    id: demoUser.id,
    name: demoUser.name,
    email: demoUser.email,
  });
  assert.deepEqual(clearedEmails, [demoUser.email]);
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
      recordFailedAttempt: (email) => {
        attemptedEmails.push(email);
      },
    }
  );

  assert.equal(result, null);
  assert.deepEqual(attemptedEmails, ["demo@cadence.app"]);
});

test("authorizeCredentialsSignIn rejects non-demo credentials", async () => {
  const attemptedEmails: Array<string | null | undefined> = [];

  const result = await authorizeCredentialsSignIn(
    {
      email: "member@cadence.app",
      password: "member-password",
    },
    createRequest("203.0.113.13"),
    {
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
  await resetAttempts(request);

  try {
    for (let attempt = 1; attempt <= 8; attempt += 1) {
      const result = await authorizeCredentialsSignIn(
        {
          email: demoUser.email,
          password: "wrong-password",
        },
        request
      );

      assert.equal(result, null);
    }

    const blockedResult = await authorizeCredentialsSignIn(
      {
        email: demoUser.email,
        password: demoUser.password,
      },
      request
    );

    assert.equal(blockedResult, null);
  } finally {
    await resetAttempts(request);
  }
});