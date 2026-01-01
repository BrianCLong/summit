import { defineConfig } from '@playwright/test'

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173'

export default defineConfig({
  testDir: 'e2e/a11y-keyboard',
  timeout: 90_000,
  fullyParallel: false,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/a11y-keyboard/playwright-html', open: 'never' }],
  ],
  use: {
    baseURL,
    headless: true,
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'off',
  },
  workers: 1,
  outputDir: 'reports/a11y-keyboard/.playwright-artifacts',
})
