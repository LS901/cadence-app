import { expect, type Page } from "@playwright/test";

export async function signIn(page: Page) {
  await page.goto("/sign-in");
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Sign in to Cadence")).toBeVisible();
  await page.getByLabel("Email").fill("demo@cadence.app");
  await page.getByLabel("Password").fill("cadence-demo");
  await page.getByRole("button", { name: "Continue to dashboard" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
  await expect(page.getByText("Check in now, reflect later")).toBeVisible();
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByText("Sign in to Cadence")).toBeVisible();
}

export function uniqueLabel(prefix: string) {
  return `${prefix} ${Date.now()}`;
}

export function recentLocalDateTimeValue(minutesAgo = 90) {
  const date = new Date(Date.now() - minutesAgo * 60_000);
  date.setSeconds(0, 0);
  const timezoneOffset = date.getTimezoneOffset() * 60_000;

  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
}