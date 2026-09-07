import { defineConfig } from "@playwright/test";

const webPort = Number(process.env.E2E_WEB_PORT ?? "3000");
const apiPort = Number(process.env.E2E_API_PORT ?? "3001");
const reuseExistingServer = process.env.PLAYWRIGHT_REUSE_SERVER === "true";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  reporter: [["line"], ["json", { outputFile: ".artifacts/playwright/results.json" }]],
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  webServer: [
    {
      command: "pnpm dev:api",
      url: `http://127.0.0.1:${apiPort}/health/ready`,
      env: { PORT: String(apiPort), ALLOWED_ORIGINS: `http://127.0.0.1:${webPort}` },
      reuseExistingServer,
      timeout: 120_000,
    },
    {
      command: `pnpm --filter @thaarei/web-app exec next dev -p ${webPort}`,
      url: `http://127.0.0.1:${webPort}`,
      env: { API_INTERNAL_URL: `http://127.0.0.1:${apiPort}` },
      reuseExistingServer,
      timeout: 120_000,
    },
  ],
});
