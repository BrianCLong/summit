import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.WEBAPP_PORT ?? 5173);
const BASE_URL = process.env.WEBAPP_BASE_URL ?? `http://localhost:${PORT}`;

export default defineConfig({
  testDir: './tests',
  timeout: 60_000,
  fullyParallel: false,
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
  ],
  expect: {
    toMatchSnapshot: { maxDiffPixelRatio: 0.02 },
  },
  use: {
    baseURL: BASE_URL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    viewport: { width: 1280, height: 720 },
  },
  projects: [
    { name: 'smoke', testMatch: /smoke\.spec\.ts/ },
    { name: 'integration', testMatch: /integration\.spec\.ts/ },
    { name: 'visual', testMatch: /visual\.spec\.ts/, use: { screenshot: 'on' } },
  ],
  webServer: {
    command: `npm run dev -- --host --port ${PORT}`,
    port: PORT,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
