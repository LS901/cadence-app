import { expect, test } from "@playwright/test";
import { signIn, signOut } from "../acceptance/helpers/session";

test.describe.configure({ mode: "serial" });

test.describe("Stage 4 operational smoke", () => {
  test("serves the health endpoint from the production server", async ({ request }) => {
    const response = await request.get("/api/health");
    const body = (await response.json()) as {
      status: "ok" | "degraded";
      mode: "database" | "mock";
      timestamp: string;
      checks: {
        database: {
          status: "ok" | "skipped" | "error";
        };
      };
    };

    expect([200, 503]).toContain(response.status());
    expect(["ok", "degraded"]).toContain(body.status);
    expect(["database", "mock"]).toContain(body.mode);
    expect(["ok", "skipped", "error"]).toContain(body.checks.database.status);
    expect(body.timestamp).toMatch(/T/);
  });

  test("loads the authenticated route tree from the production server", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/sign-in/);

    await signIn(page);

    const routes = [
      { path: "/dashboard", heading: "Build patterns you can feel." },
      { path: "/planner", heading: "Shape the week before it shapes you." },
      { path: "/habits", heading: "Build what steadies you, interrupt what drains you." },
      { path: "/mood", heading: "Complete the day, then read the shape of it." },
      { path: "/life-events", heading: "Keep the bigger picture visible." },
      { path: "/journal", heading: "Capture the texture behind the numbers." },
      { path: "/insights", heading: "Behavior first. Context kept in view." },
      { path: "/settings", heading: "Shape the app around your actual context." },
    ] as const;

    for (const route of routes) {
      await page.goto(route.path);
      await expect(page).toHaveURL(new RegExp(`${route.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`));
      await expect(page.getByRole("heading", { name: route.heading })).toBeVisible();
    }

    await signOut(page);
  });

  test("enforces credentials throttling in the production server", async ({ page }) => {
    await page.goto("/sign-in");
    await expect(page.getByText("Sign in to Cadence")).toBeVisible();

    for (let attempt = 0; attempt < 7; attempt += 1) {
      await page.getByLabel("Email").fill("demo@cadence.app");
      await page.getByLabel("Password").fill("definitely-wrong-password");
      await page.getByRole("button", { name: "Continue to dashboard" }).click();
      await expect(
        page.getByText("Sign in failed. Check the demo credentials or wait a minute before trying again.")
      ).toBeVisible();
      await expect(page).toHaveURL(/\/sign-in/);
    }

    await page.getByLabel("Email").fill("demo@cadence.app");
    await page.getByLabel("Password").fill("cadence-demo");
    await page.getByRole("button", { name: "Continue to dashboard" }).click();

    await expect(page).toHaveURL(/\/sign-in/);
    await expect(
      page.getByText("Sign in failed. Check the demo credentials or wait a minute before trying again.")
    ).toBeVisible();
  });
});