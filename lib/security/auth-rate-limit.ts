import {
  clearRateLimitKey,
  isRateLimitKeyBlocked,
  recordRateLimitKeyAttempt,
  type RateLimitDependencies,
  type RateLimitEntry,
} from "@/lib/security/rate-limit-store";

const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 8;
const AUTH_MAX_KEYS = 500;

declare global {
  var __cadenceAuthRateLimitStore__: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore =
  global.__cadenceAuthRateLimitStore__ ?? new Map<string, RateLimitEntry>();

if (process.env.NODE_ENV !== "production") {
  global.__cadenceAuthRateLimitStore__ = rateLimitStore;
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
  return `credential-sign-in:${getClientIpAddress(request)}:${normalizeEmail(email) || "unknown"}`;
}

export function isCredentialSignInRateLimited(
  email: string | null | undefined,
  request?: Request,
  options?: RateLimitDependencies
) {
  return isRateLimitKeyBlocked({
    key: getRateLimitKey(email, request),
    scope: "credential-sign-in",
    inMemoryStore: rateLimitStore,
    maxAttempts: AUTH_MAX_ATTEMPTS,
    maxKeys: AUTH_MAX_KEYS,
    dependencies: options,
  });
}

export function recordFailedCredentialSignInAttempt(
  email: string | null | undefined,
  request?: Request,
  options?: RateLimitDependencies
) {
  return recordRateLimitKeyAttempt({
    key: getRateLimitKey(email, request),
    scope: "credential-sign-in",
    inMemoryStore: rateLimitStore,
    maxKeys: AUTH_MAX_KEYS,
    windowMs: AUTH_WINDOW_MS,
    dependencies: options,
  });
}

export function clearCredentialSignInAttempts(
  email: string | null | undefined,
  request?: Request,
  options?: RateLimitDependencies
) {
  return clearRateLimitKey({
    key: getRateLimitKey(email, request),
    inMemoryStore: rateLimitStore,
    dependencies: options,
  });
}