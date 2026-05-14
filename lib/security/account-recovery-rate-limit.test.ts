import assert from "node:assert/strict";
import test from "node:test";
import {
  clearPasswordRecoveryConfirmationAttempts,
  isPasswordRecoveryConfirmationRateLimited,
  isPasswordRecoveryRequestRateLimited,
  recordPasswordRecoveryConfirmationAttempt,
  recordPasswordRecoveryRequestAttempt,
} from "./account-recovery-rate-limit";

function createRequest(ipAddress: string) {
  return new Request("http://localhost/api/auth/password-reset/request", {
    headers: {
      "x-real-ip": ipAddress,
    },
  });
}

test("password recovery request rate limiting starts blocking on the fifth repeated attempt", () => {
  const request = createRequest("203.0.113.201");

  return (async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await recordPasswordRecoveryRequestAttempt("member@cadence.app", request);
    }

    assert.equal(await isPasswordRecoveryRequestRateLimited("member@cadence.app", request), true);
  })();
});

test("password recovery confirmation rate limiting is scoped by email and IP", () => {
  const request = createRequest("203.0.113.202");

  return (async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await recordPasswordRecoveryConfirmationAttempt("member@cadence.app", request);
    }

    assert.equal(await isPasswordRecoveryConfirmationRateLimited("member@cadence.app", request), true);
    assert.equal(await isPasswordRecoveryConfirmationRateLimited("other@cadence.app", request), false);
  })();
});

test("password recovery confirmation attempts can be cleared after a successful reset", () => {
  const request = createRequest("203.0.113.203");

  return (async () => {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      await recordPasswordRecoveryConfirmationAttempt("member@cadence.app", request);
    }

    await clearPasswordRecoveryConfirmationAttempts("member@cadence.app", request);

    assert.equal(await isPasswordRecoveryConfirmationRateLimited("member@cadence.app", request), false);
  })();
});