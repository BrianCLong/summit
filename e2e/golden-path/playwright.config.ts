import { defineConfig, devices } from '@playwright/test';
import path from 'path';

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
<<<<<<< HEAD
  reporter: 'html',
=======
  reporter: [
    ['html', { outputFolder: '../../artifacts/e2e/playwright-report' }],
    ['list']
  ],
>>>>>>> 50f8d7925a (feat: add golden path E2E test harness for consolidated frontend)
  outputDir: '../../artifacts/e2e/playwright-output',
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
