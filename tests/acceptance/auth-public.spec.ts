import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./helpers/session";

test.describe("Stage 3 auth and public smoke", () => {
  test("allows the demo user to sign in and sign out", async ({ page }) => {
    await signIn(page);
    await signOut(page);
  });

  test("keeps privacy and health publicly available", async ({ page, request }) => {
    await page.goto("/privacy");

    await expect(page.getByRole("heading", { name: /Privacy/i })).toBeVisible();
    await expect(page.getByText(/Cadence privacy notes for this public demo/i)).toBeVisible();

    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(["mock", "database", "degraded"]).toContain(body.mode);
  });
});