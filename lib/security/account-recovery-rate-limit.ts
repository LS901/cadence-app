import {
  clearRateLimitKey,
  isRateLimitKeyBlocked,
  recordRateLimitKeyAttempt,
  type RateLimitDependencies,
  type RateLimitEntry,
} from "@/lib/security/rate-limit-store";

const RECOVERY_WINDOW_MS = 15 * 60 * 1000;
const RECOVERY_MAX_ATTEMPTS = 5;
const RECOVERY_MAX_KEYS = 500;

type RecoveryAction = "request" | "confirm";

declare global {
  var __cadenceAccountRecoveryRateLimitStore__: Map<string, RateLimitEntry> | undefined;
}

const rateLimitStore =
  global.__cadenceAccountRecoveryRateLimitStore__ ?? new Map<string, RateLimitEntry>();

if (process.env.NODE_ENV !== "production") {
  global.__cadenceAccountRecoveryRateLimitStore__ = rateLimitStore;
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

function getRateLimitKey(action: RecoveryAction, email: string | null | undefined, request?: Request) {
  return `password-recovery-${action}:${getClientIpAddress(request)}:${normalizeEmail(email) || "unknown"}`;
}

function isActionRateLimited(
  action: RecoveryAction,
  email: string | null | undefined,
  request?: Request,
  options?: RateLimitDependencies
) {
  return isRateLimitKeyBlocked({
    key: getRateLimitKey(action, email, request),
    scope: `password-recovery-${action}`,
    inMemoryStore: rateLimitStore,
    maxAttempts: RECOVERY_MAX_ATTEMPTS,
    maxKeys: RECOVERY_MAX_KEYS,
    dependencies: options,
  });
}

function recordActionAttempt(
  action: RecoveryAction,
  email: string | null | undefined,
  request?: Request,
  options?: RateLimitDependencies
) {
  return recordRateLimitKeyAttempt({
    key: getRateLimitKey(action, email, request),
    scope: `password-recovery-${action}`,
    inMemoryStore: rateLimitStore,
    maxKeys: RECOVERY_MAX_KEYS,
    windowMs: RECOVERY_WINDOW_MS,
    dependencies: options,
  });
}

function clearActionAttempts(
  action: RecoveryAction,
  email: string | null | undefined,
  request?: Request,
  options?: RateLimitDependencies
) {
  return clearRateLimitKey({
    key: getRateLimitKey(action, email, request),
    inMemoryStore: rateLimitStore,
    dependencies: options,
  });
}

export function isPasswordRecoveryRequestRateLimited(
  email: string | null | undefined,
  request?: Request,
  options?: RateLimitDependencies
) {
  return isActionRateLimited("request", email, request, options);
}

export function recordPasswordRecoveryRequestAttempt(
  email: string | null | undefined,
  request?: Request,
  options?: RateLimitDependencies
) {
  return recordActionAttempt("request", email, request, options);
}

export function isPasswordRecoveryConfirmationRateLimited(
  email: string | null | undefined,
  request?: Request,
  options?: RateLimitDependencies
) {
  return isActionRateLimited("confirm", email, request, options);
}

export function recordPasswordRecoveryConfirmationAttempt(
  email: string | null | undefined,
  request?: Request,
  options?: RateLimitDependencies
) {
  return recordActionAttempt("confirm", email, request, options);
}

export function clearPasswordRecoveryConfirmationAttempts(
  email: string | null | undefined,
  request?: Request,
  options?: RateLimitDependencies
) {
  return clearActionAttempts("confirm", email, request, options);
}