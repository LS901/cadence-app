import { expect, test } from "@playwright/test";
import { signIn } from "./helpers/session";

test.describe("Stage 3 settings and context journeys", () => {
  test("shows life context in read-only demo mode", async ({ page }) => {
    await signIn(page);
    await page.goto("/life-events");
    await expect(
      page.getByRole("heading", { name: "Keep the bigger picture visible." })
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Log context" })).toBeDisabled();
    await expect(page.getByText("Shared demo is preview-only. Context logging is disabled.")).toBeVisible();

    const eventCard = page.getByTestId(/life-event-card-/).first();
    await expect(eventCard).toBeVisible();
    await expect(eventCard.getByRole("button", { name: "Edit" })).toBeDisabled();
    await expect(eventCard.getByRole("button", { name: "Delete" })).toBeDisabled();
  });

  test("saves device defaults in settings", async ({ page }) => {
    await signIn(page);
    await page.goto("/settings");
    await expect(
      page.getByRole("heading", { name: "Shape the app around your actual context." })
    ).toBeVisible();

    await page.getByRole("button", { name: "Sunday" }).click();
    await page.getByRole("button", { name: "Planner first" }).click();
    await page.getByRole("button", { name: "Save device defaults" }).click();

    await expect(page.getByText("Saved on this device.")).toBeVisible();

    await expect
      .poll(async () =>
        page.evaluate(() => ({
          weekStartsOn: window.localStorage.getItem("cadence.settings.weekStartsOn"),
          homeFocus: window.localStorage.getItem("cadence.settings.homeFocus"),
        }))
      )
      .toEqual({
        weekStartsOn: "sunday",
        homeFocus: "planner",
      });
  });
});