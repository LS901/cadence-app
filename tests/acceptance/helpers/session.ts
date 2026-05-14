import { expect, type Page } from "@playwright/test";

export async function signIn(page: Page) {
  await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Open the Cadence demo")).toBeVisible();
  await expect(page.getByText("Read-only shared workspace")).toBeVisible();
  await expect(page.getByText("demo@cadence.app")).toBeVisible();
  await expect(page.getByText("cadence-demo")).toBeVisible();
  const signInButton = page.getByRole("button", { name: "Open guided demo" });
  await expect(signInButton).toBeEnabled();
  await signInButton.click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 15_000 });
  await expect(page.getByText("Check in now, reflect later")).toBeVisible({ timeout: 15_000 });
}

export async function signOut(page: Page) {
  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in/);
  await expect(page.getByText("Open the Cadence demo")).toBeVisible();
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