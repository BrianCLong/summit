import { defineConfig } from '@playwright/test';

const useWebServer = process.env.PLAYWRIGHT_USE_WEBSERVER === 'true';

export default defineConfig({
  testDir: '.',
  testMatch: [
    'e2e/golden-path.spec.ts',
    'e2e/maestro.spec.ts',
    'e2e/golden-path.spec.ts',
    'e2e/golden-path.spec.ts',
    'e2e/osint/**/*.spec.ts',
    'e2e/**/*.a11y.spec.ts',
    'tests/e2e/**/*.spec.ts',
    'tests/performance.spec.ts',
    'e2e/simple.spec.ts',
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
    baseURL: process.env.BASE_URL || (process.env.CI ? 'http://localhost:3000' : 'http://localhost:5173'),
    baseURL: process.env.BASE_URL || 'http://localhost:3000', // Defaulting to 3000 for apps/web
    trace: 'retain-on-failure',
    video: 'on',
  },
  ...(useWebServer
    ? {
        webServer: [
          {
            command: 'npm run client:dev',
            port: 3000, // Changed to 3000
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
  // In CI, we use docker-compose which exposes port 3000, so we just check it
  ...((process.env.CI && !useWebServer)
    ? {
        webServer: {
          command: 'echo "CI uses make up"',
          url: 'http://localhost:3000',
          reuseExistingServer: true,
          timeout: 120_000,
        }
      }
    : {})
});
