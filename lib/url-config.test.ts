import assert from "node:assert/strict";
import test from "node:test";
import { applyNormalizedAuthUrls, normalizeAbsoluteUrl } from "./url-config";

test("normalizeAbsoluteUrl prefixes bare production hosts with https", () => {
  assert.equal(normalizeAbsoluteUrl("cadence-wellbeing.dev"), "https://cadence-wellbeing.dev/");
  assert.equal(
    normalizeAbsoluteUrl("cadence-wellbeing.dev/api/auth"),
    "https://cadence-wellbeing.dev/api/auth"
  );
});

test("normalizeAbsoluteUrl prefixes bare localhost hosts with http", () => {
  assert.equal(normalizeAbsoluteUrl("localhost:3000"), "http://localhost:3000/");
});

test("applyNormalizedAuthUrls updates auth env vars in place", () => {
  const originalAuthUrl = process.env.AUTH_URL;
  const originalNextAuthUrl = process.env.NEXTAUTH_URL;
  const originalAppBaseUrl = process.env.APP_BASE_URL;

  process.env.AUTH_URL = "cadence-wellbeing.dev/api/auth";
  process.env.NEXTAUTH_URL = "cadence-wellbeing.dev";
  process.env.APP_BASE_URL = "cadence-wellbeing.dev";

  try {
    applyNormalizedAuthUrls();

    assert.equal(process.env.AUTH_URL, "https://cadence-wellbeing.dev/api/auth");
    assert.equal(process.env.NEXTAUTH_URL, "https://cadence-wellbeing.dev/api/auth");
    assert.equal(process.env.APP_BASE_URL, "https://cadence-wellbeing.dev/");
  } finally {
    if (typeof originalAuthUrl === "undefined") {
      delete process.env.AUTH_URL;
    } else {
      process.env.AUTH_URL = originalAuthUrl;
    }

    if (typeof originalNextAuthUrl === "undefined") {
      delete process.env.NEXTAUTH_URL;
    } else {
      process.env.NEXTAUTH_URL = originalNextAuthUrl;
    }

    if (typeof originalAppBaseUrl === "undefined") {
      delete process.env.APP_BASE_URL;
    } else {
      process.env.APP_BASE_URL = originalAppBaseUrl;
    }
  }
});