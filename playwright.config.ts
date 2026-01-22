import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 4173);

export default defineConfig({
  testDir: "./e2e",
  timeout: 30000,
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    viewport: { width: 900, height: 900 }
  },
  webServer: {
    command: "node scripts/serve.mjs",
    port,
    reuseExistingServer: true,
    timeout: 120000
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] }
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] }
    }
  ]
});
