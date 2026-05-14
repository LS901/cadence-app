import assert from "node:assert/strict";
import test from "node:test";
import { getPasswordResetRequestResult } from "./route";

test("getPasswordResetRequestResult rejects malformed JSON", async () => {
  const result = await getPasswordResetRequestResult(
    new Request("http://localhost/api/auth/password-reset/request", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{bad-json",
    })
  );

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    status: "error",
    code: "invalid_json",
    message: "Request body must be valid JSON.",
  });
});

test("getPasswordResetRequestResult returns retired-state messaging for valid requests", async () => {
  const result = await getPasswordResetRequestResult(
    new Request("http://localhost/api/auth/password-reset/request", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({ email: "morgan@cadence.app" }),
    })
  );

  assert.equal(result.status, 410);
  assert.deepEqual(result.body, {
    status: "error",
    code: "disabled",
    message: "Private workspaces are disabled in this portfolio build. Use the shared demo instead.",
  });
});