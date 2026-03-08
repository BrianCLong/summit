import { defineConfig } from '@playwright/test';

const useWebServer = process.env.PLAYWRIGHT_USE_WEBSERVER === 'true';

export default defineConfig({
  testDir: '.',
  testMatch: [
    'e2e/**/*.spec.ts',
    'tests/performance.spec.ts',
  ],
  testIgnore: 'tests/e2e/**',
  timeout: 60_000,
  retries: 2,
  reporter: [['html', { outputFolder: 'reports/playwright' }], ['list']],
  use: {
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
  // In CI, we use docker-compose which exposes port 3000, so we just check it
  ...((process.env.CI && !useWebServer)
    ? {
        webServer: {
          command: 'sleep 120',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 120_000,
        }
      }
    : {})
});
