import { defineConfig, devices } from '@playwright/test';

const baseURL = process.env.BASE_URL || 'https://dev.topicality.co';

export default defineConfig({
  testDir: 'e2e',
  testMatch: ['e2e/maestro.spec.ts', 'e2e/**/*.a11y.spec.ts'],
  // Ignore legacy/speculative files requiring extra deps
  testIgnore: ['e2e/maestro.keyboard.spec.ts', 'e2e/maestro.policy.spec.ts'],
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retry-with-video',
    extraHTTPHeaders: {
      'User-Agent':
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124 Safari/537.36 IntelGraph-E2E',
      Accept: '*/*',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
