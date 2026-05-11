const AUTH_WINDOW_MS = 10 * 60 * 1000;
const AUTH_MAX_ATTEMPTS = 8;
const AUTH_MAX_KEYS = 500;

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

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
  return `${getClientIpAddress(request)}:${normalizeEmail(email) || "unknown"}`;
}

function pruneExpiredEntries(now: number) {
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }

  if (rateLimitStore.size <= AUTH_MAX_KEYS) {
    return;
  }

  const sortedEntries = [...rateLimitStore.entries()].sort(
    (left, right) => left[1].resetAt - right[1].resetAt
  );

  while (rateLimitStore.size > AUTH_MAX_KEYS && sortedEntries.length) {
    const oldestEntry = sortedEntries.shift();

    if (!oldestEntry) {
      break;
    }

    rateLimitStore.delete(oldestEntry[0]);
  }
}

export function isCredentialSignInRateLimited(
  email: string | null | undefined,
  request?: Request
) {
  const now = Date.now();
  pruneExpiredEntries(now);

  const entry = rateLimitStore.get(getRateLimitKey(email, request));

  return Boolean(entry && entry.count >= AUTH_MAX_ATTEMPTS && entry.resetAt > now);
}

export function recordFailedCredentialSignInAttempt(
  email: string | null | undefined,
  request?: Request
) {
  const now = Date.now();
  pruneExpiredEntries(now);

  const key = getRateLimitKey(email, request);
  const existingEntry = rateLimitStore.get(key);

  if (!existingEntry || existingEntry.resetAt <= now) {
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + AUTH_WINDOW_MS,
    });
    return;
  }

  rateLimitStore.set(key, {
    count: existingEntry.count + 1,
    resetAt: existingEntry.resetAt,
  });
}

export function clearCredentialSignInAttempts(
  email: string | null | undefined,
  request?: Request
) {
  rateLimitStore.delete(getRateLimitKey(email, request));
}