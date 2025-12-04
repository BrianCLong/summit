import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from '@playwright/test';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const recordVideo = process.env.RECORD_GOLDEN_PATH_VIDEO === 'true';

export default defineConfig({
  timeout: 60_000,
  retries: 1,
  reporter: [
    [
      'html',
      { outputFolder: path.join(__dirname, 'playwright-report'), open: 'never' },
    ],
  ],
  outputDir: path.join(__dirname, 'test-results'),
  use: {
    baseURL: process.env.WEB_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    video: recordVideo ? 'on' : 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
});
