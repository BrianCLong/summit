import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  timeout: 90_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 4 : undefined,
  reporter: [
    ['line'],
    ['junit', { outputFile: 'e2e/results/junit.xml' }],
    ['html', { outputFolder: 'e2e/results/html', open: 'never' }],
  ],
  globalSetup: './global-setup.ts',
  globalTeardown: './global-teardown.ts',
  outputDir: 'e2e/results/artifacts',
  use: {
    baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    navigationTimeout: 45_000,
    actionTimeout: 15_000,
    headless: process.env.CI ? true : undefined,
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
  ],
  coverageConfig: {
    provider: 'v8',
    include: ['client/src/**/*.{ts,tsx,js,jsx}'],
    reportDir: 'e2e/coverage',
    reports: ['html', ['lcov', { outputFile: 'lcov.info' }]],
  },
});
