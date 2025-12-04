import { defineConfig } from '@playwright/test';

const useWebServer = process.env.PLAYWRIGHT_USE_WEBSERVER === 'true';

export default defineConfig({
  testDir: 'e2e',
  testMatch: [
    'e2e/maestro.spec.ts',
    'e2e/**/*.a11y.spec.ts',
    'tests/e2e/**/*.spec.ts',
  ],
  timeout: 30_000,
  retries: 2,
  reporter: [['html', { outputFolder: 'reports/playwright' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000', // Defaulting to 3000 for apps/web
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  ...(useWebServer
    ? {
        webServer: [
          {
            command: 'npm run web:dev',
            port: 3000,
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
