import nodemailer from "nodemailer";
import type Mail from "nodemailer/lib/mailer";
import { normalizeAbsoluteUrl } from "@/lib/url-config";

export type AuthEmailPurpose = "verify-email" | "reset-password";

type TransportLike = {
  sendMail: (options: Mail.Options) => Promise<unknown>;
};

type SendAuthEmailOptions = {
  purpose: AuthEmailPurpose;
  email: string;
  name?: string | null;
  token: string;
  requestOrigin?: string;
  transport?: TransportLike;
};

export type AuthEmailDeliveryResult =
  | {
      status: "sent";
      mode: "smtp" | "preview";
      previewUrl?: string;
    }
  | {
      status: "unavailable";
      message: string;
    };

function trimEnvValue(value: string | undefined) {
  return value?.trim() || undefined;
}

function getAppBaseUrl(requestOrigin?: string) {
  return (
    normalizeAbsoluteUrl(process.env.APP_BASE_URL) ??
    normalizeAbsoluteUrl(process.env.NEXTAUTH_URL) ??
    normalizeAbsoluteUrl(requestOrigin) ??
    "http://localhost:3000"
  );
}

export function buildAuthActionUrl(
  purpose: AuthEmailPurpose,
  email: string,
  token: string,
  requestOrigin?: string
) {
  const baseUrl = new URL(getAppBaseUrl(requestOrigin));
  baseUrl.pathname = purpose === "verify-email" ? "/verify-email" : "/reset-password";
  baseUrl.searchParams.set("email", email);
  baseUrl.searchParams.set("token", token);
  return baseUrl.toString();
}

function getAuthEmailCopy(purpose: AuthEmailPurpose, url: string, name?: string | null) {
  const greeting = name?.trim() ? `Hi ${name.trim()},` : "Hi,";

  if (purpose === "verify-email") {
    return {
      subject: "Verify your Cadence account",
      text: `${greeting}\n\nVerify your Cadence email address to activate your account:\n${url}\n\nThis link expires in 24 hours.`,
      html: `<p>${greeting}</p><p>Verify your Cadence email address to activate your account.</p><p><a href="${url}">Verify email</a></p><p>This link expires in 24 hours.</p>`,
    };
  }

  return {
    subject: "Reset your Cadence password",
    text: `${greeting}\n\nReset your Cadence password:\n${url}\n\nThis link expires in 1 hour.`,
    html: `<p>${greeting}</p><p>Reset your Cadence password.</p><p><a href="${url}">Reset password</a></p><p>This link expires in 1 hour.</p>`,
  };
}

function getConfiguredTransport() {
  const host = trimEnvValue(process.env.SMTP_HOST);
  const port = trimEnvValue(process.env.SMTP_PORT);
  const user = trimEnvValue(process.env.SMTP_USER);
  const password = trimEnvValue(process.env.SMTP_PASSWORD);
  const from = trimEnvValue(process.env.SMTP_FROM_EMAIL);

  if (!host || !port || !user || !password || !from) {
    return null;
  }

  return {
    from,
    transport: nodemailer.createTransport({
      host,
      port: Number(port),
      secure: Number(port) === 465,
      auth: {
        user,
        pass: password,
      },
    }),
  };
}

export function isAuthEmailDeliveryAvailable() {
  return process.env.NODE_ENV !== "production" || Boolean(getConfiguredTransport());
}

export async function sendAuthActionEmail(
  options: SendAuthEmailOptions
): Promise<AuthEmailDeliveryResult> {
  const actionUrl = buildAuthActionUrl(
    options.purpose,
    options.email,
    options.token,
    options.requestOrigin
  );
  const copy = getAuthEmailCopy(options.purpose, actionUrl, options.name);
  const configuredTransport = options.transport
    ? {
        from: trimEnvValue(process.env.SMTP_FROM_EMAIL) ?? "Cadence <no-reply@cadence.local>",
        transport: options.transport,
      }
    : getConfiguredTransport();

  if (!configuredTransport) {
    if (process.env.NODE_ENV === "production") {
      return {
        status: "unavailable",
        message: "Email delivery is not configured for this deployment.",
      };
    }

    console.info(`[auth-email:${options.purpose}] ${actionUrl}`);

    return {
      status: "sent",
      mode: "preview",
      previewUrl: actionUrl,
    };
  }

  await configuredTransport.transport.sendMail({
    from: configuredTransport.from,
    to: options.email,
    subject: copy.subject,
    text: copy.text,
    html: copy.html,
  });

  return {
    status: "sent",
    mode: "smtp",
  };
}