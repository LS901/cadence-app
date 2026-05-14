import assert from "node:assert/strict";
import test from "node:test";
import { getSignUpResult } from "./route";

test("getSignUpResult rejects malformed JSON bodies", async () => {
  const result = await getSignUpResult(
    new Request("http://localhost/api/auth/sign-up", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: "{not-json",
    })
  );

  assert.equal(result.status, 400);
  assert.deepEqual(result.body, {
    status: "error",
    code: "invalid_json",
    message: "Request body must be valid JSON.",
  });
});

test("getSignUpResult returns retired-state messaging for valid requests", async () => {
  const result = await getSignUpResult(
    new Request("http://localhost/api/auth/sign-up", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify({
        name: "Morgan Reed",
        email: "morgan@cadence.app",
        password: "cadence-pass",
        confirmPassword: "cadence-pass",
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