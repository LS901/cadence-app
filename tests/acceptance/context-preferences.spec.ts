import { expect, test } from "@playwright/test";
import { signIn, uniqueLabel } from "./helpers/session";

test.describe("Stage 3 settings and context journeys", () => {
  test("creates, edits, and deletes a life context event", async ({ page }) => {
    const eventTitle = uniqueLabel("Acceptance context event");
    const updatedEventTitle = `${eventTitle} updated`;

    await signIn(page);
    await page.goto("/life-events");
    await expect(
      page.getByRole("heading", { name: "Keep the bigger picture visible." })
    ).toBeVisible();

    await page.getByRole("button", { name: "Log context" }).click();
    const createDialog = page.getByRole("dialog", { name: "Log context event" });
    await expect(createDialog).toBeVisible();
    await createDialog.getByLabel("Title").fill(eventTitle);
    await createDialog.getByLabel("Description").fill("Acceptance coverage for life-context CRUD.");
    await createDialog.getByLabel("Tags").fill("acceptance, context");
    await createDialog.getByRole("button", { name: "Save context" }).click();

    await expect(page.getByText(eventTitle, { exact: true }).first()).toBeVisible();

    const eventCard = page.getByTestId(/life-event-card-/).filter({ hasText: eventTitle }).first();

    await eventCard.getByRole("button", { name: "Edit" }).click();

    const editDialog = page.getByRole("dialog", { name: "Edit context event" });
    await expect(editDialog).toBeVisible();
    await editDialog.getByLabel("Title").fill(updatedEventTitle);
    await editDialog.getByLabel("Description").fill("Acceptance coverage for edited life context.");
    await editDialog.getByRole("button", { name: "Save changes" }).click();

    await expect(page.getByText(updatedEventTitle, { exact: true }).first()).toBeVisible();

    const updatedEventCard = page.getByTestId(/life-event-card-/).filter({ hasText: updatedEventTitle }).first();

    await updatedEventCard.getByRole("button", { name: "Delete" }).click();

    const deleteDialog = page.getByRole("dialog", { name: "Delete context event?" });
    await expect(deleteDialog).toBeVisible();
    await deleteDialog.getByRole("button", { name: "Delete event" }).click();

    await expect(page.getByText(updatedEventTitle, { exact: true })).toHaveCount(0);
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