import { expect, test } from "@playwright/test";
import { signIn } from "./helpers/session";

test.describe("Stage 3 accessibility and shell navigation", () => {
  test("shows journal entry controls as disabled in the shared demo", async ({ page }) => {
    await signIn(page);
    await page.goto("/journal");

    const newEntryButton = page.getByRole("button", { name: "New entry" });

    await expect(newEntryButton).toBeDisabled();
    await expect(page.getByText("Shared demo is preview-only. Journal writing is disabled.")).toBeVisible();

    await page.keyboard.press("Enter");

    await expect(page.getByRole("dialog", { name: "Write a journal entry" })).toHaveCount(0);
  });

  test("supports mobile navigation through the app shell drawer", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await signIn(page);

    const openNavigationButton = page.getByRole("button", { name: "Open navigation menu" });

    await openNavigationButton.focus();
    await page.keyboard.press("Enter");

    const navigationDialog = page.getByRole("dialog").filter({
      has: page.getByRole("link", { name: "Journal" }),
    });
    const journalLink = navigationDialog.getByRole("link", { name: "Journal" });

    await expect(navigationDialog).toBeVisible();
    await journalLink.focus();
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/journal/);
    await expect(page.getByRole("heading", { name: "Capture the texture behind the numbers." })).toBeVisible();
    await expect(navigationDialog).toHaveCount(0);
  });
});