import { defineConfig, devices } from "@playwright/test"

const PORT = 3005
// CAPTURE=1 runs only the @capture specs (README screenshots, demo video).
const capture = Boolean(process.env.CAPTURE)

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  grep: capture ? /@capture/ : undefined,
  grepInvert: capture ? undefined : /@capture/,
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: `npm run build && npm run start -- -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
})
