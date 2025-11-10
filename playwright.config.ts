import { defineConfig, devices } from '@playwright/test';

const PORT = process.env.E2E_PORT || '4173';
const HOST = process.env.E2E_HOST || '127.0.0.1';
const BASE_URL = process.env.E2E_BASE_URL || `http://${HOST}:${PORT}`;

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  fullyParallel: true,
  reporter: [ ['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }] ],
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: `npm run preview -- --host ${HOST} --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
      },
});
