import assert from "node:assert/strict";
import test from "node:test";
import { buildAuthTokenIdentifier, createAuthToken, consumeAuthToken } from "./auth-tokens";

test("createAuthToken normalizes the identifier and stores a hashed token", async () => {
  let deletedIdentifier = "";
  const storedRecords: Array<{ identifier: string; token: string; expires: Date }> = [];

  const result = await createAuthToken("verify-email", " User@Cadence.App ", {
    now: () => new Date("2026-05-12T10:00:00.000Z"),
    randomToken: () => "plain-token",
    deleteExistingTokens: async (identifier) => {
      deletedIdentifier = identifier;
    },
    storeToken: async (record) => {
      storedRecords.push(record);
    },
  });

  assert.equal(result.identifier, "verify-email:user@cadence.app");
  assert.equal(result.token, "plain-token");
  assert.equal(result.expires.toISOString(), "2026-05-13T10:00:00.000Z");
  assert.equal(deletedIdentifier, "verify-email:user@cadence.app");
  assert.equal(storedRecords.length, 1);
  assert.equal(storedRecords[0]?.identifier, "verify-email:user@cadence.app");
  assert.notEqual(storedRecords[0]?.token, "plain-token");
});

test("consumeAuthToken accepts a matching unexpired token and deletes it", async () => {
  const deletedRecords: Array<{ identifier: string; token: string }> = [];
  const created = await createAuthToken("reset-password", "user@cadence.app", {
    randomToken: () => "reset-token",
    deleteExistingTokens: async () => undefined,
    storeToken: async () => undefined,
  });

  const result = await consumeAuthToken("reset-password", "user@cadence.app", "reset-token", {
    now: () => new Date("2026-05-12T10:15:00.000Z"),
    findStoredToken: async () => ({
      identifier: created.identifier,
      token: "6ade2e6ddb26f8a538d4f983bf289a96b30f9f0fb00d72f6e6a59d9826e4c23f",
      expires: new Date("2026-05-12T11:00:00.000Z"),
    }),
    deleteStoredToken: async (record) => {
      deletedRecords.push(record);
    },
  });

  assert.deepEqual(result, { status: "valid" });
  assert.deepEqual(deletedRecords, [
    {
      identifier: created.identifier,
      token: "6ade2e6ddb26f8a538d4f983bf289a96b30f9f0fb00d72f6e6a59d9826e4c23f",
    },
  ]);
});

test("consumeAuthToken rejects mismatched identifiers without deleting them", async () => {
  let deleteCalls = 0;

  const result = await consumeAuthToken("verify-email", "user@cadence.app", "plain-token", {
    findStoredToken: async () => ({
      identifier: buildAuthTokenIdentifier("verify-email", "other@cadence.app"),
      token: "stored-token",
      expires: new Date("2026-05-12T11:00:00.000Z"),
    }),
    deleteStoredToken: async () => {
      deleteCalls += 1;
    },
  });

  assert.deepEqual(result, { status: "invalid" });
  assert.equal(deleteCalls, 0);
});

test("consumeAuthToken expires stale tokens and deletes them", async () => {
  const deletedRecords: Array<{ identifier: string; token: string }> = [];

  const result = await consumeAuthToken("verify-email", "user@cadence.app", "plain-token", {
    now: () => new Date("2026-05-12T12:00:00.000Z"),
    findStoredToken: async () => ({
      identifier: buildAuthTokenIdentifier("verify-email", "user@cadence.app"),
      token: "stored-token",
      expires: new Date("2026-05-12T11:00:00.000Z"),
    }),
    deleteStoredToken: async (record) => {
      deletedRecords.push(record);
    },
  });

  assert.deepEqual(result, { status: "expired" });
  assert.deepEqual(deletedRecords, [
    {
      identifier: "verify-email:user@cadence.app",
      token: "stored-token",
    },
  ]);
});