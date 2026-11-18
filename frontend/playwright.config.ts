import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60000,
  expect: { timeout: 10000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://127.0.0.1:4173",
    viewport: { width: 1366, height: 768 },
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth.setup.ts/ },
    {
      name: "visual",
      testMatch: /visual.spec.ts/,
      dependencies: ["setup"],
      use: {
        storageState: process.env.E2E_AUTH_STATE ?? "/tmp/academia-auth.json",
      },
    },
    {
      name: "chromium",
      dependencies: ["setup", "visual"],
      testIgnore: /auth.setup.ts|visual.spec.ts/,
      use: {
        storageState: process.env.E2E_AUTH_STATE ?? "/tmp/academia-auth.json",
      },
    },
  ],
});
