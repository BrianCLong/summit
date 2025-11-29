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
  timeout: 30_000,
  retries: 2,
  reporter: [['html', { outputFolder: 'reports/playwright' }], ['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:5173',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  ...(useWebServer
    ? {
        webServer: [
          {
            command: 'npm run client:dev',
            port: 5173,
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
