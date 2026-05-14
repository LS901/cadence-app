import { hash } from "bcryptjs";
import { logAuthAuditEvent } from "./auth-audit";
import { db, hasDatabaseUrl } from "@/lib/db";
import { authEmailRequestSchema, resetPasswordSchema, type ResetPasswordValues } from "@/lib/validation/auth";
import { createAuthToken, consumeAuthToken } from "./auth-tokens";
import { isAuthEmailDeliveryAvailable, sendAuthActionEmail, type AuthEmailDeliveryResult } from "./auth-email";

type AccountSecurityUser = {
  id: string;
  email: string;
  name: string | null;
  emailVerified: Date | null;
  passwordHash?: string | null;
};

type SendVerificationEmailOptions = {
  hasDatabase?: boolean;
  requestOrigin?: string;
  createToken?: (purpose: "verify-email", email: string) => Promise<{ token: string }>;
  sendEmail?: (options: {
    purpose: "verify-email";
    email: string;
    name?: string | null;
    token: string;
    requestOrigin?: string;
  }) => Promise<AuthEmailDeliveryResult>;
};

type VerifyEmailOptions = {
  hasDatabase?: boolean;
  now?: () => Date;
  findUserByEmail?: (email: string) => Promise<AccountSecurityUser | null>;
  consumeToken?: (
    purpose: "verify-email",
    email: string,
    token: string
  ) => Promise<{ status: "valid" | "invalid" | "expired" }>;
  markEmailVerified?: (email: string, verifiedAt: Date) => Promise<unknown>;
};

type RequestPasswordResetOptions = {
  hasDatabase?: boolean;
  requestOrigin?: string;
  findUserByEmail?: (email: string) => Promise<AccountSecurityUser | null>;
  createToken?: (purpose: "verify-email" | "reset-password", email: string) => Promise<{ token: string }>;
  sendEmail?: (options: {
    purpose: "verify-email" | "reset-password";
    email: string;
    name?: string | null;
    token: string;
    requestOrigin?: string;
  }) => Promise<AuthEmailDeliveryResult>;
  canDeliverEmail?: () => boolean;
};

type ResetPasswordOptions = {
  hasDatabase?: boolean;
  now?: () => Date;
  findUserByEmail?: (email: string) => Promise<AccountSecurityUser | null>;
  consumeToken?: (
    purpose: "reset-password",
    email: string,
    token: string
  ) => Promise<{ status: "valid" | "invalid" | "expired" }>;
  hashPassword?: (password: string, saltRounds: number) => Promise<string>;
  updatePasswordHash?: (email: string, passwordHash: string) => Promise<unknown>;
};

export async function sendVerificationEmailForUser(
  user: Pick<AccountSecurityUser, "email" | "name">,
  options: SendVerificationEmailOptions = {}
) {
  const hasDatabase = options.hasDatabase ?? hasDatabaseUrl;

  if (!hasDatabase) {
    return {
      status: "error" as const,
      code: "database_unavailable" as const,
      message: "Email verification is unavailable until the database connection is configured.",
    };
  }

  const verificationToken = await (options.createToken
    ? options.createToken("verify-email", user.email)
    : createAuthToken("verify-email", user.email));
  const delivery = await (options.sendEmail
    ? options.sendEmail({
        purpose: "verify-email",
        email: user.email,
        name: user.name,
        token: verificationToken.token,
        requestOrigin: options.requestOrigin,
      })
    : sendAuthActionEmail({
        purpose: "verify-email",
        email: user.email,
        name: user.name,
        token: verificationToken.token,
        requestOrigin: options.requestOrigin,
      }));

  if (delivery.status === "unavailable") {
    logAuthAuditEvent("verification-email-send-failed", {
      email: user.email,
      outcome: "failed",
      reason: "email_unavailable",
    });

    return {
      status: "error" as const,
      code: "email_unavailable" as const,
      message: delivery.message,
    };
  }

  logAuthAuditEvent("verification-email-sent", {
    email: user.email,
    outcome: "sent",
  });

  return {
    status: "sent" as const,
    delivery,
  };
}

export async function verifyEmailAddress(
  email: string,
  token: string,
  options: VerifyEmailOptions = {}
) {
  const hasDatabase = options.hasDatabase ?? hasDatabaseUrl;

  if (!hasDatabase) {
    return {
      status: "error" as const,
      code: "database_unavailable" as const,
      message: "Email verification is unavailable until the database connection is configured.",
    };
  }

  const user = options.findUserByEmail
    ? await options.findUserByEmail(email)
    : await db!.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
        },
      });

  if (!user) {
    logAuthAuditEvent("verification-link-failed", {
      email,
      outcome: "failed",
      reason: "user_missing",
    });
    return { status: "error" as const, code: "invalid_token" as const, message: "This verification link is invalid." };
  }

  if (user.emailVerified) {
    logAuthAuditEvent("verification-link-consumed", {
      email,
      userId: user.id,
      outcome: "already_verified",
    });
    return { status: "success" as const, code: "already_verified" as const };
  }

  const tokenResult = await (options.consumeToken
    ? options.consumeToken("verify-email", email, token)
    : consumeAuthToken("verify-email", email, token));

  if (tokenResult.status === "invalid") {
    logAuthAuditEvent("verification-link-failed", {
      email,
      userId: user.id,
      outcome: "failed",
      reason: "invalid_token",
    });
    return { status: "error" as const, code: "invalid_token" as const, message: "This verification link is invalid." };
  }

  if (tokenResult.status === "expired") {
    logAuthAuditEvent("verification-link-failed", {
      email,
      userId: user.id,
      outcome: "failed",
      reason: "expired_token",
    });
    return { status: "error" as const, code: "expired_token" as const, message: "This verification link has expired." };
  }

  const verifiedAt = (options.now ?? (() => new Date()))();

  await (options.markEmailVerified
    ? options.markEmailVerified(email, verifiedAt)
    : db!.user.update({
        where: { email },
        data: {
          emailVerified: verifiedAt,
        },
      }));

  logAuthAuditEvent("verification-link-consumed", {
    email,
    userId: user.id,
    outcome: "verified",
  });

  return { status: "success" as const, code: "verified" as const };
}

export async function requestPasswordReset(
  rawValues: Record<string, unknown>,
  options: RequestPasswordResetOptions = {}
) {
  const parsed = authEmailRequestSchema.safeParse(rawValues);

  if (!parsed.success) {
    return {
      status: "error" as const,
      code: "invalid_input" as const,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const hasDatabase = options.hasDatabase ?? hasDatabaseUrl;

  if (!hasDatabase) {
    return {
      status: "error" as const,
      code: "database_unavailable" as const,
      message: "Password recovery is unavailable until the database connection is configured.",
    };
  }

  const canDeliverEmail = options.canDeliverEmail ?? isAuthEmailDeliveryAvailable;

  if (!canDeliverEmail()) {
    return {
      status: "error" as const,
      code: "email_unavailable" as const,
      message: "Email delivery is not configured for this deployment.",
    };
  }

  const user = options.findUserByEmail
    ? await options.findUserByEmail(parsed.data.email)
    : await db!.user.findUnique({
        where: { email: parsed.data.email },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          passwordHash: true,
        },
      });

  if (!user?.passwordHash) {
    return {
      status: "success" as const,
      message: "If an account exists for that email, you will receive a link to continue.",
    };
  }

  const purpose = user.emailVerified ? "reset-password" : "verify-email";
  const tokenResult = await (options.createToken
    ? options.createToken(purpose, user.email)
    : createAuthToken(purpose, user.email));
  const delivery = await (options.sendEmail
    ? options.sendEmail({
        purpose,
        email: user.email,
        name: user.name,
        token: tokenResult.token,
        requestOrigin: options.requestOrigin,
      })
    : sendAuthActionEmail({
        purpose,
        email: user.email,
        name: user.name,
        token: tokenResult.token,
        requestOrigin: options.requestOrigin,
      }));

  if (delivery.status === "unavailable") {
    return {
      status: "error" as const,
      code: "email_unavailable" as const,
      message: delivery.message,
    };
  }

  return {
    status: "success" as const,
    message: user.emailVerified
      ? "If an account exists for that email, you will receive a password reset link."
      : "If an account exists for that email, you will receive a verification link.",
    flow: purpose,
    delivery,
  };
}

export async function resetPasswordWithToken(
  rawValues: Record<string, unknown>,
  options: ResetPasswordOptions = {}
) {
  const parsed = resetPasswordSchema.safeParse(rawValues);

  if (!parsed.success) {
    return {
      status: "error" as const,
      code: "invalid_input" as const,
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const hasDatabase = options.hasDatabase ?? hasDatabaseUrl;

  if (!hasDatabase) {
    return {
      status: "error" as const,
      code: "database_unavailable" as const,
      message: "Password reset is unavailable until the database connection is configured.",
    };
  }

  const values: ResetPasswordValues = parsed.data;
  const user = options.findUserByEmail
    ? await options.findUserByEmail(values.email)
    : await db!.user.findUnique({
        where: { email: values.email },
        select: {
          id: true,
          email: true,
          name: true,
          emailVerified: true,
          passwordHash: true,
        },
      });

  if (!user?.passwordHash || !user.emailVerified) {
    return {
      status: "error" as const,
      code: "invalid_token" as const,
      message: "This password reset link is invalid.",
    };
  }

  const tokenResult = await (options.consumeToken
    ? options.consumeToken("reset-password", values.email, values.token)
    : consumeAuthToken("reset-password", values.email, values.token));

  if (tokenResult.status === "invalid") {
    return {
      status: "error" as const,
      code: "invalid_token" as const,
      message: "This password reset link is invalid.",
    };
  }

  if (tokenResult.status === "expired") {
    return {
      status: "error" as const,
      code: "expired_token" as const,
      message: "This password reset link has expired.",
    };
  }

  const passwordHash = await (options.hashPassword ?? hash)(values.password, 12);

  await (options.updatePasswordHash
    ? options.updatePasswordHash(values.email, passwordHash)
    : db!.user.update({
        where: { email: values.email },
        data: {
          passwordHash,
        },
      }));

  return {
    status: "success" as const,
    message: "Your password has been reset.",
  };
}