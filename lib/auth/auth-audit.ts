type AuthAuditEvent =
  | "sign-up-rate-limited"
  | "password-recovery-request-rate-limited"
  | "password-recovery-requested"
  | "password-recovery-request-failed"
  | "password-recovery-confirm-rate-limited"
  | "password-recovery-reset"
  | "password-recovery-confirm-failed"
  | "verification-email-sent"
  | "verification-email-send-failed"
  | "verification-link-consumed"
  | "verification-link-failed";

type AuthAuditPayload = {
  email?: string;
  userId?: string;
  ipAddress?: string;
  outcome?: string;
  reason?: string;
  flow?: string;
};

function normalizeEmail(email: string | undefined) {
  return email?.trim().toLowerCase();
}

function getClientIpAddress(request?: Request) {
  if (!request) {
    return undefined;
  }

  const forwardedFor = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cfConnectingIp = request.headers.get("cf-connecting-ip");

  return (
    forwardedFor?.split(",")[0]?.trim() ||
    realIp?.trim() ||
    cfConnectingIp?.trim() ||
    undefined
  );
}

export function logAuthAuditEvent(
  event: AuthAuditEvent,
  payload: AuthAuditPayload = {},
  options?: {
    request?: Request;
    now?: () => Date;
    log?: (entry: Record<string, string>) => void;
  }
) {
  const entry = {
    category: "auth",
    event,
    timestamp: (options?.now ?? (() => new Date()))().toISOString(),
    ...(payload.email ? { email: normalizeEmail(payload.email) ?? "" } : {}),
    ...(payload.userId ? { userId: payload.userId } : {}),
    ...(payload.outcome ? { outcome: payload.outcome } : {}),
    ...(payload.reason ? { reason: payload.reason } : {}),
    ...(payload.flow ? { flow: payload.flow } : {}),
    ...(payload.ipAddress || options?.request
      ? { ipAddress: payload.ipAddress ?? getClientIpAddress(options?.request) ?? "unknown" }
      : {}),
  } satisfies Record<string, string>;

  (options?.log ?? console.info)(entry);
}