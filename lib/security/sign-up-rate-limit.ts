import {
  isRateLimitKeyBlocked,
  recordRateLimitKeyAttempt,
  type RateLimitDependencies,
  type RateLimitEntry,
} from "@/lib/security/rate-limit-store";

const SIGN_UP_WINDOW_MS = 15 * 60 * 1000;
const SIGN_UP_MAX_ATTEMPTS = 5;
const SIGN_UP_MAX_KEYS = 500;

declare global {
  var __cadenceSignUpRateLimitStore__: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore =
  global.__cadenceSignUpRateLimitStore__ ?? new Map<string, RateLimitEntry>();

if (process.env.NODE_ENV !== "production") {
  global.__cadenceSignUpRateLimitStore__ = rateLimitStore;
}

function normalizeEmail(email: string | null | undefined) {
  return (email ?? "").trim().toLowerCase();
}

function getClientIpAddress(request?: Request) {
  if (!request) {
    return "unknown";
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  return (
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    cfConnectingIp?.trim() ||
    "unknown"
  );
}

function getRateLimitKey(email: string | null | undefined, request?: Request) {
  return `sign-up:${getClientIpAddress(request)}:${normalizeEmail(email) || "unknown"}`;
}

export function isSignUpRateLimited(
  email: string | null | undefined,
  request?: Request,
  options?: RateLimitDependencies
) {
  return isRateLimitKeyBlocked({
    key: getRateLimitKey(email, request),
    scope: "sign-up",
    inMemoryStore: rateLimitStore,
    maxAttempts: SIGN_UP_MAX_ATTEMPTS,
    maxKeys: SIGN_UP_MAX_KEYS,
    dependencies: options,
  });
}

export function recordSignUpAttempt(
  email: string | null | undefined,
  request?: Request,
  options?: RateLimitDependencies
) {
  return recordRateLimitKeyAttempt({
    key: getRateLimitKey(email, request),
    scope: "sign-up",
    inMemoryStore: rateLimitStore,
    maxKeys: SIGN_UP_MAX_KEYS,
    windowMs: SIGN_UP_WINDOW_MS,
    dependencies: options,
  });
}
