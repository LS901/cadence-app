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

type AuthorizeCredentialsOptions = {
  isRateLimited?: (email: string | null | undefined, request?: Request) => boolean | Promise<boolean>;
  recordFailedAttempt?: (email: string | null | undefined, request?: Request) => void | Promise<void>;
  clearAttempts?: (email: string | null | undefined, request?: Request) => void | Promise<void>;
};

function getDemoUserIfCredentialsMatch(email: string, password: string) {
  if (email === demoUser.email && password === demoUser.password) {
    return {
      id: demoUser.id,
      name: demoUser.name,
      email: demoUser.email,
    };
  }

  return null;
}

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

  if (await isRateLimited(attemptedEmail, request)) {
    return null;
  }

  const credentials = signInSchema.safeParse(rawCredentials);

  if (!credentials.success) {
    await recordFailedAttempt(attemptedEmail, request);
    return null;
  }

  const demoUserResult = getDemoUserIfCredentialsMatch(
    credentials.data.email,
    credentials.data.password
  );

  if (!demoUserResult) {
    await recordFailedAttempt(credentials.data.email, request);
    return null;
  }

  await clearAttempts(credentials.data.email, request);
  return demoUserResult;
}