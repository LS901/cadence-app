import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./helpers/session";

test.describe("Stage 3 auth and public smoke", () => {
  test("routes the landing-page guided demo into the shared demo sign-in flow", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Explore the guided demo" }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByText("Open the Cadence demo")).toBeVisible();
    await expect(page.getByText("Read-only shared workspace")).toBeVisible();
    await expect(page.getByText("demo@cadence.app")).toBeVisible();
    await expect(page.getByText("cadence-demo")).toBeVisible();
    await expect(
      page.getByText("Account creation is intentionally disabled for this read-only portfolio demonstration.")
    ).toBeVisible();

    const guidedDemoButton = page.getByRole("button", { name: "Open guided demo" });
    await expect(guidedDemoButton).toBeEnabled();
    await guidedDemoButton.click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole("link", { name: "Carry into Planner" })).toBeVisible();
  });

  test("allows the demo user to sign in and sign out", async ({ page }) => {
    await signIn(page);
    await signOut(page);
  });

  test("keeps privacy and health publicly available", async ({ page, request }) => {
    await page.goto("/privacy");

    await expect(page.getByRole("heading", { name: /Privacy/i })).toBeVisible();
    await expect(page.getByText(/Cadence privacy notes for this concept demo/i)).toBeVisible();

    const response = await request.get("/api/health");
    expect(response.ok()).toBeTruthy();

    const body = await response.json();
    expect(["ok", "degraded"]).toContain(body.status);
    expect(["mock", "database", "degraded"]).toContain(body.mode);
  });
});