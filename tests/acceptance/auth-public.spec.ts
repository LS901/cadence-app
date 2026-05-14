import { expect, test } from "@playwright/test";
import { signIn, signOut } from "./helpers/session";

test.describe("Stage 3 auth and public smoke", () => {
  test("routes the landing-page guided demo into a prefilled sign-in flow", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: "Explore the guided demo" }).click();

    await expect(page).toHaveURL(/\/sign-in$/);
    await expect(page.getByLabel("Email")).toHaveValue("demo@cadence.app");
    await expect(page.getByLabel("Password")).toHaveValue("cadence-demo");

    await page.getByRole("button", { name: "Switch to my account" }).click();
    await expect(page.getByLabel("Email")).toHaveValue("");
    await expect(page.getByLabel("Password")).toHaveValue("");
    await expect(page.getByRole("button", { name: "Continue to dashboard" })).toBeEnabled();

    await page.getByRole("button", { name: "Use demo credentials" }).click();
    await expect(page.getByLabel("Email")).toHaveValue("demo@cadence.app");
    await expect(page.getByLabel("Password")).toHaveValue("cadence-demo");

    const guidedDemoButton = page.getByRole("button", { name: "Open guided demo" });
    await expect(guidedDemoButton).toBeEnabled();
    await guidedDemoButton.click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByText("Start with the weekly review, then follow the carry-forward experiment.")).toBeVisible();
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