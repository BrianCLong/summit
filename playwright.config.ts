import { defineConfig } from '@playwright/test';

const useWebServer = process.env.PLAYWRIGHT_USE_WEBSERVER === 'true';

export default defineConfig({
  testDir: '.',
  testMatch: [
    'e2e/golden-path.spec.ts',
    'e2e/maestro.spec.ts',
    'e2e/osint/**/*.spec.ts',
    'e2e/**/*.a11y.spec.ts',
    'e2e/tests/**/*.spec.ts',
    'tests/e2e/**/*.spec.ts',
    'tests/performance.spec.ts',
    'e2e/simple.spec.ts',
  ],
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
            command: 'pnpm --filter @intelgraph/web dev',
            port: 3000,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
          {
            command: 'pnpm --filter intelgraph-server dev',
            port: 4000,
            reuseExistingServer: !process.env.CI,
            timeout: 120_000,
          },
        ],
      }
    : {}),
  // In CI, assume services are running
  ...((process.env.CI && !useWebServer)
    ? {
        webServer: {
          command: 'echo "CI uses make up or external services"',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 120_000,
        }
      }
    : {})
});
