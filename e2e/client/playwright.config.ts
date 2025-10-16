import { defineConfig } from '@playwright/test';
export default defineConfig({
  timeout: 60_000,
  retries: 1,
  reporter: [['html', { open: 'never' }]],
  use: { baseURL: process.env.WEB_URL, trace: 'on-first-retry' },
});
