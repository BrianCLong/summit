import { defineConfig } from '@playwright/test';

const useWebServer = process.env.PLAYWRIGHT_USE_WEBSERVER === 'true';

export default defineConfig({
  testDir: 'e2e',
  testMatch: [
    'e2e/maestro.spec.ts',
    'e2e/golden-path.spec.ts',
    'e2e/**/*.a11y.spec.ts',
    'tests/e2e/**/*.spec.ts',
  ],
  timeout: 60_000,
  retries: 2,
  reporter: [['html', { outputFolder: 'reports/playwright' }], ['list']],
  use: {
    // The client seems to be running on port 3000 now based on vite.config.js and curl check
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'on',
  },
  ...(useWebServer
    ? {
        webServer: [
          {
            command: 'npm run client:dev',
            port: 3000, // Changed to 3000
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
          {
            command: 'npm run server:dev',
            port: 4000,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ],
      }
    : {}),
});
