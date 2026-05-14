import assert from "node:assert/strict";
import test from "node:test";
import {
  requestPasswordReset,
  resetPasswordWithToken,
  sendVerificationEmailForUser,
  verifyEmailAddress,
} from "./account-security";

test("sendVerificationEmailForUser returns preview delivery details when verification email is queued", async () => {
  const result = await sendVerificationEmailForUser(
    {
      email: "user@cadence.app",
      name: "Morgan",
    },
    {
      hasDatabase: true,
      requestOrigin: "https://cadence.example.com",
      createToken: async () => ({ token: "verify-token" }),
      sendEmail: async () => ({
        status: "sent",
        mode: "preview",
        previewUrl: "https://cadence.example.com/verify-email?email=user%40cadence.app&token=verify-token",
      }),
    }
  );

  assert.deepEqual(result, {
    status: "sent",
    delivery: {
      status: "sent",
      mode: "preview",
      previewUrl:
        "https://cadence.example.com/verify-email?email=user%40cadence.app&token=verify-token",
    },
  });
});

test("verifyEmailAddress marks the user verified when the token is valid", async () => {
  const updatedUsers: Array<{ email: string; verifiedAt: Date }> = [];

  const result = await verifyEmailAddress("user@cadence.app", "verify-token", {
    hasDatabase: true,
    now: () => new Date("2026-05-12T12:00:00.000Z"),
    findUserByEmail: async (email) => ({
      id: "user-1",
      email,
      name: "Morgan",
      emailVerified: null,
    }),
    consumeToken: async () => ({ status: "valid" }),
    markEmailVerified: async (email, verifiedAt) => {
      updatedUsers.push({ email, verifiedAt });
    },
  });

  assert.deepEqual(result, {
    status: "success",
    code: "verified",
  });
  assert.equal(updatedUsers.length, 1);
  assert.equal(updatedUsers[0]?.email, "user@cadence.app");
  assert.equal(updatedUsers[0]?.verifiedAt.toISOString(), "2026-05-12T12:00:00.000Z");
});

test("verifyEmailAddress rejects expired verification tokens", async () => {
  const result = await verifyEmailAddress("user@cadence.app", "verify-token", {
    hasDatabase: true,
    findUserByEmail: async (email) => ({
      id: "user-1",
      email,
      name: "Morgan",
      emailVerified: null,
    }),
    consumeToken: async () => ({ status: "expired" }),
  });

  assert.deepEqual(result, {
    status: "error",
    code: "expired_token",
    message: "This verification link has expired.",
  });
});

test("requestPasswordReset sends a verification email for unverified accounts", async () => {
  const result = await requestPasswordReset(
    {
      email: "user@cadence.app",
    },
    {
      hasDatabase: true,
      requestOrigin: "https://cadence.example.com",
      canDeliverEmail: () => true,
      findUserByEmail: async (email) => ({
        id: "user-1",
        email,
        name: "Morgan",
        emailVerified: null,
        passwordHash: "stored-hash",
      }),
      createToken: async () => ({ token: "verify-token" }),
      sendEmail: async ({ purpose }) => ({
        status: "sent",
        mode: purpose === "verify-email" ? "preview" : "smtp",
        previewUrl:
          purpose === "verify-email"
            ? "https://cadence.example.com/verify-email?email=user%40cadence.app&token=verify-token"
            : undefined,
      }),
    }
  );

  assert.equal(result.status, "success");
  assert.equal(result.flow, "verify-email");
});

test("requestPasswordReset returns a generic success response when the account does not exist", async () => {
  const result = await requestPasswordReset(
    {
      email: "missing@cadence.app",
    },
    {
      hasDatabase: true,
      canDeliverEmail: () => true,
      findUserByEmail: async () => null,
    }
  );

  assert.deepEqual(result, {
    status: "success",
    message: "If an account exists for that email, you will receive a link to continue.",
  });
});

test("resetPasswordWithToken updates the password hash when the token is valid", async () => {
  const updates: Array<{ email: string; passwordHash: string }> = [];

  const result = await resetPasswordWithToken(
    {
      email: "user@cadence.app",
      token: "reset-token",
      password: "new-password-123",
      confirmPassword: "new-password-123",
    },
    {
      hasDatabase: true,
      findUserByEmail: async (email) => ({
        id: "user-1",
        email,
        name: "Morgan",
        emailVerified: new Date("2026-05-12T11:00:00.000Z"),
        passwordHash: "stored-hash",
      }),
      consumeToken: async () => ({ status: "valid" }),
      hashPassword: async (password, saltRounds) => `${password}:${saltRounds}`,
      updatePasswordHash: async (email, passwordHash) => {
        updates.push({ email, passwordHash });
      },
    }
  );

  assert.deepEqual(result, {
    status: "success",
    message: "Your password has been reset.",
  });
  assert.deepEqual(updates, [
    {
      email: "user@cadence.app",
      passwordHash: "new-password-123:12",
    },
  ]);
});

test("resetPasswordWithToken reports invalid payload field errors", async () => {
  const result = await resetPasswordWithToken(
    {
      email: "not-an-email",
      token: "",
      password: "short",
      confirmPassword: "different",
    },
    {
      hasDatabase: true,
    }
  );

  assert.equal(result.status, "error");
  assert.equal(result.code, "invalid_input");
});