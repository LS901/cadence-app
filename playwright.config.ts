import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/acceptance",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3002",
    trace: "on-first-retry",
    headless: true,
  },
  webServer: {
    command: "npm run start:stage3",
    env: {
      ...process.env,
      APP_BASE_URL: "http://127.0.0.1:3002",
      NEXTAUTH_URL: "http://127.0.0.1:3002",
      NEXTAUTH_SECRET:
        process.env.NEXTAUTH_SECRET ?? process.env.AUTH_SECRET ?? "cadence-stage3-auth-secret",
      AUTH_SECRET: process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET ?? "cadence-stage3-auth-secret",
      AUTH_TRUST_HOST: "true",
    },
    url: "http://127.0.0.1:3002",
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});