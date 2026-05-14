export const siteConfig = {
  name: "Cadence",
  description:
    "Cadence is a conceptual product exploring mood, routines, reflection, and context through a calmer behavioural analytics experience.",
  shortDescription:
    "Conceptual behavioural analytics with a calm product lens.",
  keywords: [
    "mood tracking",
    "behavioural analytics concept",
    "product design showcase",
    "reflective journaling",
    "habit tracking",
    "personal planning",
    "self reflection app",
  ],
} as const;

const fallbackSiteUrl = "http://localhost:3000";

export function getSiteUrl() {
  const configuredUrl = process.env.APP_BASE_URL?.trim() || process.env.NEXTAUTH_URL?.trim();

  try {
    return new URL(configuredUrl || fallbackSiteUrl);
  } catch {
    return new URL(fallbackSiteUrl);
  }
}

export function absoluteUrl(path = "/") {
  return new URL(path, getSiteUrl()).toString();
}