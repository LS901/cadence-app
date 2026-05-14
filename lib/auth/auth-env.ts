function trimEnvValue(value: string | undefined) {
  return value?.trim() || undefined;
}

export type AuthEmailConfigStatus = {
  appBaseUrlConfigured: boolean;
  smtpConfigured: boolean;
  smtpFieldsMissing: string[];
};

export function getAuthEmailConfigStatus() {
  const appBaseUrlConfigured = Boolean(
    trimEnvValue(process.env.APP_BASE_URL) ?? trimEnvValue(process.env.NEXTAUTH_URL)
  );
  const smtpFields = {
    SMTP_HOST: trimEnvValue(process.env.SMTP_HOST),
    SMTP_PORT: trimEnvValue(process.env.SMTP_PORT),
    SMTP_USER: trimEnvValue(process.env.SMTP_USER),
    SMTP_PASSWORD: trimEnvValue(process.env.SMTP_PASSWORD),
    SMTP_FROM_EMAIL: trimEnvValue(process.env.SMTP_FROM_EMAIL),
  };
  const smtpFieldsMissing = Object.entries(smtpFields)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  return {
    appBaseUrlConfigured,
    smtpConfigured: smtpFieldsMissing.length === 0,
    smtpFieldsMissing,
  } satisfies AuthEmailConfigStatus;
}