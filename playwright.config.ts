import { defineConfig } from '@playwright/test';

const shouldStartServer = process.env.PLAYWRIGHT_USE_WEBSERVER !== 'false';
const baseURL =
  process.env.BASE_URL || (process.env.CI ? 'http://localhost:3000' : 'http://localhost:5173');

export default defineConfig({
  testDir: '.',
  testMatch: ['e2e/**/*.spec.ts', 'tests/e2e/**/*.spec.ts'],
  timeout: 90_000,
  fullyParallel: false,
  retries: process.env.CI ? 2 : 0,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/playwright', open: 'never' }],
  ],
  expect: {
    timeout: 10_000,
  },
  projects: [
    { name: 'osint-journeys', testMatch: /osint\/.*\.spec\.ts/ },
    { name: 'a11y', testMatch: /\.a11y\.spec\.ts/ },
  ],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    acceptDownloads: true,
  },
  webServer: shouldStartServer
    ? {
        command: 'npm run dev',
        port: 3000,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      }
    : undefined,
});
