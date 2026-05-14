import { expect, test } from "@playwright/test";
import {
  recentLocalDateTimeValue,
  signIn,
  uniqueLabel,
} from "./helpers/session";

test.describe("Stage 3 authenticated journeys", () => {
  test("hands a dashboard quick capture into the mood editor and saves a complete-day reflection", async ({ page }) => {
    await signIn(page);

    await page.getByRole("button", { name: "80" }).click();
    await page
      .getByPlaceholder(/Optional note about today’s baseline/i)
      .fill(`Stage 3 quick capture ${Date.now()}`);
    await expect(page.getByText("Current draft score: 80/100")).toBeVisible();
    await page.getByRole("link", { name: "Finish the day properly" }).click();

    await expect(page).toHaveURL(/\/mood/);
    await expect(page.getByText("Complete the day, then read the shape of it.")).toBeVisible();
    const reflectionDialog = page.getByRole("dialog", { name: /Complete the day|Edit complete day/i });

    if (!(await reflectionDialog.isVisible())) {
      const editButton = page.locator("button", {
        hasText: /Resume today's draft|Edit today|Complete today/,
      }).first();
      await expect(editButton).toBeVisible();
      await editButton.click();
    }

    await expect(reflectionDialog).toBeVisible();
    const saveDayButton = reflectionDialog.getByRole("button", { name: "Save day" });

    if (await saveDayButton.isDisabled()) {
      await reflectionDialog.getByRole("button", { name: "Add manually" }).click();
      await reflectionDialog.getByRole("button", { name: "Save block" }).click();
      await expect(saveDayButton).toBeEnabled();
    }

    await saveDayButton.click();

    await expect(reflectionDialog).toHaveCount(0);
    await expect(page.getByText("Completed days, not isolated scores")).toBeVisible();
  });

  test("creates a supportive habit and logs it for today", async ({ page }) => {
    const habitName = uniqueLabel("Acceptance habit");

    await signIn(page);
    await page.goto("/habits");
    await expect(
      page.getByRole("heading", { name: "Build what steadies you, interrupt what drains you." })
    ).toBeVisible();

    await page.getByRole("button", { name: "Add habit" }).click();
    await page.getByLabel("Name").fill(habitName);
    await page.getByLabel(/Target completed days per week/i).fill("3");
    await page.getByRole("button", { name: "Create habit" }).click();

    const habitCard = page.getByTestId(/habit-card-/).filter({ hasText: habitName }).first();

    await expect(habitCard).toContainText(habitName);
    await habitCard.getByRole("button", { name: "Completed" }).first().click();
    await expect(habitCard.getByText("Completed today")).toBeVisible();
  });

  test("creates, updates, and completes a planner activity", async ({ page }) => {
    const activityName = uniqueLabel("Acceptance planner activity");
    const updatedNotes = `Updated in acceptance ${Date.now()}`;

    await signIn(page);
    await page.goto("/planner");
    await expect(page.getByText("Shape the week before it shapes you.")).toBeVisible();

    await page.getByRole("button", { name: "Add activity" }).click();
    await page.getByLabel("Title").fill(activityName);
    await page.getByLabel(/Scheduled for|Completed at/).fill(recentLocalDateTimeValue());
    await page.getByRole("button", { name: "Create activity" }).click();

    const activityCard = page.getByTestId(/planner-activity-/).filter({ hasText: activityName }).first();

    await expect(activityCard).toContainText(activityName);
    await activityCard.getByRole("button", { name: "Edit" }).click();
    await page.getByLabel("Notes").fill(updatedNotes);
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(activityCard.getByText(updatedNotes)).toBeVisible();

    await activityCard.getByRole("button", { name: "Complete" }).click();
    const completionDialog = page.getByRole("dialog", { name: activityName });

    await expect(completionDialog).toBeVisible();
    await completionDialog.getByLabel("Mood score").fill("82");
    await completionDialog.getByRole("button", { name: "Save completion" }).click();
    await expect(completionDialog).toHaveCount(0);
    await expect(activityCard.getByText("Mood score: 82")).toBeVisible();
  });

  test("carries a weekly review draft into planner completion review and surfaces tested support back on the dashboard", async ({ page }) => {
    test.setTimeout(60_000);

    const activityName = uniqueLabel("Acceptance experiment activity");
    const supportNote = `Supported in acceptance ${Date.now()}`;

    await signIn(page);
    await expect(page.getByRole("link", { name: "Carry into Planner" })).toBeVisible();
    await page.getByRole("link", { name: "Carry into Planner" }).click();

    await expect(page).toHaveURL(/\/planner/);
    await expect(page.getByText("Guided demo path · Step 2 of 4")).toBeVisible();
    await expect(page.getByText("Continue into Journal context")).toBeVisible();
    await page.getByLabel("Title").fill(activityName);
    await page.getByLabel(/Scheduled for|Completed at/).fill(recentLocalDateTimeValue());
    await page.getByRole("button", { name: "Create activity" }).click();

    const activityCard = page.getByTestId(/planner-activity-/).filter({ hasText: activityName }).first();
    await expect(activityCard).toContainText(activityName);
    await expect(activityCard).toContainText("Pending review");

    await activityCard.getByRole("button", { name: "Complete" }).click();
    const completionDialog = page.getByRole("dialog", { name: activityName });

    await expect(completionDialog).toBeVisible();
    await completionDialog.getByLabel("Mood score").fill("79");
    await completionDialog.getByLabel("Tested support").selectOption("SUPPORTED");
    await completionDialog.getByLabel("Follow-through note").fill(supportNote);
    await completionDialog.getByRole("button", { name: "Save completion" }).click({ force: true });
    await expect(completionDialog).toHaveCount(0);

    await expect(activityCard).toContainText("Supported");
    await expect(activityCard).toContainText(supportNote);

    await page.getByText("Continue into Journal context").click();
    await expect(page).toHaveURL(/\/journal/);
    await expect(page.getByText("Guided demo path · Step 3 of 4")).toBeVisible();
    await expect(page.getByText("Recommended next prompt")).toBeVisible();
    await expect(page.getByRole("link", { name: "Open dashboard weekly review" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "Continue into Insights" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Open guided reflection" })).toBeVisible();

    await page.getByRole("button", { name: "Open guided reflection" }).click();
    const journalEditor = page.getByRole("dialog", { name: "Write a journal entry" });
    await expect(journalEditor).toBeVisible();
    await expect(journalEditor.getByLabel("Title")).toHaveValue("Focus pattern");
    await expect(journalEditor.getByRole("textbox", { name: "Entry" })).toHaveValue(
      /What keeps repeating here, and what feels structural rather than situational\?/
    );
    await journalEditor.getByRole("button", { name: "Cancel" }).click();
    await expect(journalEditor).toHaveCount(0);

    await page.getByRole("link", { name: "Continue into Insights" }).click();
    await expect(page).toHaveURL(/\/insights/);
    await expect(page.getByText("Guided demo path · Step 4 of 4")).toBeVisible();
    await expect(page.getByText("Recommended interpretation")).toBeVisible();
    await expect(page.getByText("Interpret what changed after the experiment.")).toBeVisible();

    await page.goto("/dashboard");
    await expect(page.getByText("Tested support").first()).toBeVisible();
    await expect(page.getByText("Supported").first()).toBeVisible();
  });

  test("saves a journal entry and keeps insights visible", async ({ page }) => {
    const journalTitle = uniqueLabel("Acceptance journal entry");

    await signIn(page);
    await page.goto("/journal");
    await expect(
      page.getByRole("heading", { name: "Capture the texture behind the numbers." })
    ).toBeVisible();

    await page.getByRole("button", { name: "New entry" }).click();
    const journalEditor = page.getByRole("dialog", { name: "Write a journal entry" });
    await expect(journalEditor).toBeVisible();
    await journalEditor.getByLabel("Title").fill(journalTitle);
    await journalEditor
      .getByRole("textbox", { name: "Entry" })
      .fill("A short acceptance-test reflection tying energy, context, and planning together.");
    await journalEditor.getByRole("button", { name: "Save entry" }).click();
    await expect(page.getByText(journalTitle, { exact: true }).first()).toBeVisible();

    await page.goto("/insights");
    await expect(page.getByText("Insights engine").first()).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Behavior first. Context kept in view." })
    ).toBeVisible();
    await expect(
      page.getByText(/What the current data supports|Not enough signal yet/i).first()
    ).toBeVisible();
  });
});