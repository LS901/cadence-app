import { compare } from "bcryptjs";
import { db, hasDatabaseUrl } from "@/lib/db";
import { demoUser } from "@/lib/data/mock-cadence";
import {
  clearCredentialSignInAttempts,
  isCredentialSignInRateLimited,
  recordFailedCredentialSignInAttempt,
} from "@/lib/security/auth-rate-limit";
import { signInSchema } from "@/lib/validation/auth";

export type AuthorizedSignInUser = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
};

type PersistedAuthUser = {
  id: string;
  name: string | null;
  email: string;
  image?: string | null;
  passwordHash?: string | null;
};

type AuthorizeCredentialsOptions = {
  hasDatabase?: boolean;
  findUserByEmail?: (email: string) => Promise<PersistedAuthUser | null>;
  comparePassword?: (password: string, passwordHash: string) => Promise<boolean>;
  isRateLimited?: (email: string | null | undefined, request?: Request) => boolean;
  recordFailedAttempt?: (email: string | null | undefined, request?: Request) => void;
  clearAttempts?: (email: string | null | undefined, request?: Request) => void;
};

export async function authorizeCredentialsSignIn(
  rawCredentials: Record<string, unknown> | undefined,
  request?: Request,
  options: AuthorizeCredentialsOptions = {}
): Promise<AuthorizedSignInUser | null> {
  const attemptedEmail =
    typeof rawCredentials?.email === "string" ? rawCredentials.email : null;
  const isRateLimited = options.isRateLimited ?? isCredentialSignInRateLimited;
  const recordFailedAttempt =
    options.recordFailedAttempt ?? recordFailedCredentialSignInAttempt;
  const clearAttempts = options.clearAttempts ?? clearCredentialSignInAttempts;

  if (isRateLimited(attemptedEmail, request)) {
    return null;
  }

  const credentials = signInSchema.safeParse(rawCredentials);

  if (!credentials.success) {
    recordFailedAttempt(attemptedEmail, request);
    return null;
  }

  const hasDatabase = options.hasDatabase ?? hasDatabaseUrl;

  if (!hasDatabase) {
    if (
      credentials.data.email === demoUser.email &&
      credentials.data.password === demoUser.password
    ) {
      return {
        id: demoUser.id,
        name: demoUser.name,
        email: demoUser.email,
      };
    }

    recordFailedAttempt(credentials.data.email, request);
    return null;
  }

  const user = options.findUserByEmail
    ? await options.findUserByEmail(credentials.data.email)
    : await db!.user.findUnique({
        where: { email: credentials.data.email },
      });

  if (!user?.passwordHash) {
    recordFailedAttempt(credentials.data.email, request);
    return null;
  }

  const passwordMatches = await (options.comparePassword ?? compare)(
    credentials.data.password,
    user.passwordHash
  );

  if (!passwordMatches) {
    recordFailedAttempt(credentials.data.email, request);
    return null;
  }

  clearAttempts(credentials.data.email, request);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
  };
}