import { expect, test } from "@playwright/test";
import { signIn } from "./helpers/session";

test.describe("Stage 3 authenticated journeys", () => {
  test("routes the shared demo from dashboard into the read-only mood workspace", async ({ page }) => {
    await signIn(page);

    await page.getByRole("link", { name: "Finish the day properly" }).click();

    await expect(page).toHaveURL(/\/mood/);
    await expect(page.getByText("Complete the day, then read the shape of it.")).toBeVisible();
    await expect(page.getByText("Shared demo is preview-only. Reflection editing is disabled.")).toBeVisible();
    await expect(
      page.locator("button", {
        hasText: /Resume today's draft|Edit today|Complete today/,
      }).first()
    ).toBeDisabled();
    await expect(page.getByText("Completed days, not isolated scores")).toBeVisible();
  });

  test("shows the habits workspace in read-only demo mode", async ({ page }) => {
    await signIn(page);
    await page.goto("/habits");
    await expect(
      page.getByRole("heading", { name: "Build what steadies you, interrupt what drains you." })
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "Add habit" })).toBeDisabled();
    await expect(page.getByText("Shared demo is preview-only. Habit edits and logs are disabled.")).toBeVisible();
    await expect(page.getByTestId(/habit-card-/).first()).toBeVisible();
  });

  test("shows the planner workspace in read-only demo mode", async ({ page }) => {
    await signIn(page);
    await page.goto("/planner");
    await expect(page.getByText("Shape the week before it shapes you.")).toBeVisible();

    await expect(page.getByRole("button", { name: "Add activity" })).toBeDisabled();
    await expect(page.getByText("Shared demo is preview-only. Planning changes are disabled.")).toBeVisible();

    const activityCard = page.getByTestId(/planner-activity-/).first();
    await expect(activityCard).toBeVisible();
    await expect(activityCard.getByRole("button", { name: "Edit" })).toBeDisabled();
  });

  test("follows the guided demo path through planner, journal, and insights in read-only mode", async ({ page }) => {
    await signIn(page);
    await expect(page.getByRole("link", { name: "Carry into Planner" })).toBeVisible();
    await page.getByRole("link", { name: "Carry into Planner" }).click();

    await expect(page).toHaveURL(/\/planner/);
    await expect(page.getByText("Guided demo path · Step 2 of 4")).toBeVisible();
    await expect(page.getByText("Continue into Journal context")).toBeVisible();
    await expect(page.getByRole("button", { name: "Use weekly review draft" }).first()).toBeDisabled();
    await expect(page.getByText("Shared demo is preview-only. Planning changes are disabled.")).toBeVisible();

    await page.getByText("Continue into Journal context").click();
    await expect(page).toHaveURL(/\/journal/);
    await expect(page.getByText("Guided demo path · Step 3 of 4")).toBeVisible();
    await expect(page.getByText("Recommended next prompt")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open dashboard weekly review" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue into Insights" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open guided reflection" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "New entry" })).toBeDisabled();
    await expect(page.getByText("Shared demo is preview-only. Journal writing is disabled.")).toBeVisible();

    await page.getByRole("link", { name: "Continue into Insights" }).click();
    await expect(page).toHaveURL(/\/insights/);
    await expect(page.getByText("Guided demo path · Step 4 of 4")).toBeVisible();
    await expect(page.getByText("Recommended interpretation")).toBeVisible();
    await expect(page.getByText("Interpret what changed after the experiment.")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByRole("link", { name: "Carry into Planner" })).toBeVisible();
  });

  test("keeps journal and insights visible in read-only demo mode", async ({ page }) => {
    await signIn(page);
    await page.goto("/journal");
    await expect(
      page.getByRole("heading", { name: "Capture the texture behind the numbers." })
    ).toBeVisible();

    await expect(page.getByRole("button", { name: "New entry" })).toBeDisabled();
    await expect(page.getByText("Shared demo is preview-only. Journal writing is disabled.")).toBeVisible();
    await expect(page.getByText("Story windows", { exact: true })).toBeVisible();
    await expect(page.getByText("Theme archive")).toBeVisible();

    await page.goto("/insights");
    await expect(page.getByText("Insights engine").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Behavior first. Context kept in view." })
    ).toBeVisible();
    await expect(page.getByText("What the current data suggests testing")).toBeVisible();
  });
});