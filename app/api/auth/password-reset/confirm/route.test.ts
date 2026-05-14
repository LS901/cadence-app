import assert from "node:assert/strict";
import test from "node:test";
import { getPasswordResetConfirmResult } from "./route";

test("getPasswordResetConfirmResult rejects malformed JSON", async () => {
  const result = await getPasswordResetConfirmResult(
    new Request("http://localhost/api/auth/password-reset/confirm", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{bad-json",
    })
  );

  assert.equal(result.status, 400);
});

test("getPasswordResetConfirmResult returns retired-state messaging for valid requests", async () => {
  const result = await getPasswordResetConfirmResult(
    new Request("http://localhost/api/auth/password-reset/confirm", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        email: "morgan@cadence.app",
        token: "reset-token",
        password: "new-password-123",
        confirmPassword: "new-password-123",
      }),
    })
  );

  assert.equal(result.status, 410);
  assert.deepEqual(result.body, {
    status: "error",
    code: "disabled",
    message: "Private workspaces are disabled in this portfolio build. Use the shared demo instead.",
  });
});