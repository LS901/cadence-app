function trimEnvValue(value: string | undefined) {
  return value?.trim() || undefined;
}

function inferProtocol(value: string) {
  return /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::\d+)?(?:\/|$)/i.test(value)
    ? "http://"
    : "https://";
}

export function normalizeAbsoluteUrl(value: string | undefined) {
  const trimmedValue = trimEnvValue(value);

  if (!trimmedValue) {
    return undefined;
  }

  const normalizedCandidate = /^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(trimmedValue)
    ? trimmedValue
    : `${inferProtocol(trimmedValue.replace(/^\/\//, ""))}${trimmedValue.replace(/^\/\//, "")}`;

  try {
    return new URL(normalizedCandidate).toString();
  } catch {
    return undefined;
  }
}

export function applyNormalizedAuthUrls() {
  const normalizedAuthUrl = normalizeAbsoluteUrl(
    trimEnvValue(process.env.AUTH_URL) ?? trimEnvValue(process.env.NEXTAUTH_URL)
  );

  if (normalizedAuthUrl) {
    process.env.AUTH_URL = normalizedAuthUrl;
    process.env.NEXTAUTH_URL = normalizedAuthUrl;
  }

  const normalizedAppBaseUrl = normalizeAbsoluteUrl(process.env.APP_BASE_URL);

  if (normalizedAppBaseUrl) {
    process.env.APP_BASE_URL = normalizedAppBaseUrl;
  }
}