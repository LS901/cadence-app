import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export type AuthTokenPurpose = "verify-email" | "reset-password";

type VerificationTokenRecord = {
  identifier: string;
  token: string;
  expires: Date;
};

type CreateAuthTokenOptions = {
  now?: () => Date;
  randomToken?: () => string;
  deleteExistingTokens?: (identifier: string) => Promise<unknown>;
  storeToken?: (record: VerificationTokenRecord) => Promise<unknown>;
};

type ConsumeAuthTokenOptions = {
  now?: () => Date;
  findStoredToken?: (hashedToken: string) => Promise<VerificationTokenRecord | null>;
  deleteStoredToken?: (record: Pick<VerificationTokenRecord, "identifier" | "token">) => Promise<unknown>;
};

const AUTH_TOKEN_TTL_MS: Record<AuthTokenPurpose, number> = {
  "verify-email": 1000 * 60 * 60 * 24,
  "reset-password": 1000 * 60 * 60,
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function hashAuthToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function getIdentifier(purpose: AuthTokenPurpose, email: string) {
  return `${purpose}:${normalizeEmail(email)}`;
}

export function buildAuthTokenIdentifier(purpose: AuthTokenPurpose, email: string) {
  return getIdentifier(purpose, email);
}

export async function createAuthToken(
  purpose: AuthTokenPurpose,
  email: string,
  options: CreateAuthTokenOptions = {}
) {
  const now = (options.now ?? (() => new Date()))();
  const identifier = getIdentifier(purpose, email);
  const rawToken = (options.randomToken ?? (() => randomBytes(32).toString("hex")))();
  const hashedToken = hashAuthToken(rawToken);
  const expires = new Date(now.getTime() + AUTH_TOKEN_TTL_MS[purpose]);

  await (options.deleteExistingTokens
    ? options.deleteExistingTokens(identifier)
    : db!.verificationToken.deleteMany({ where: { identifier } }));

  await (options.storeToken
    ? options.storeToken({ identifier, token: hashedToken, expires })
    : db!.verificationToken.create({
        data: {
          identifier,
          token: hashedToken,
          expires,
        },
      }));

  return {
    identifier,
    token: rawToken,
    expires,
  };
}

export async function consumeAuthToken(
  purpose: AuthTokenPurpose,
  email: string,
  token: string,
  options: ConsumeAuthTokenOptions = {}
) {
  const hashedToken = hashAuthToken(token);
  const expectedIdentifier = getIdentifier(purpose, email);
  const storedRecord = await (options.findStoredToken
    ? options.findStoredToken(hashedToken)
    : db!.verificationToken.findUnique({ where: { token: hashedToken } }));

  if (!storedRecord) {
    return { status: "invalid" as const };
  }

  if (storedRecord.identifier !== expectedIdentifier) {
    return { status: "invalid" as const };
  }

  const now = (options.now ?? (() => new Date()))();

  if (storedRecord.expires <= now) {
    await (options.deleteStoredToken
      ? options.deleteStoredToken({ identifier: storedRecord.identifier, token: storedRecord.token })
      : db!.verificationToken.delete({
          where: {
            identifier_token: {
              identifier: storedRecord.identifier,
              token: storedRecord.token,
            },
          },
        }));

    return { status: "expired" as const };
  }

  await (options.deleteStoredToken
    ? options.deleteStoredToken({ identifier: storedRecord.identifier, token: storedRecord.token })
    : db!.verificationToken.delete({
        where: {
          identifier_token: {
            identifier: storedRecord.identifier,
            token: storedRecord.token,
          },
        },
      }));

  return { status: "valid" as const };
}