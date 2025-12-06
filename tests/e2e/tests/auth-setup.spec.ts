import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const AUTH_STATE_PATH = path.join(__dirname, '../auth-state.json');

// Run serially so we only persist a single canonical auth state.
test.describe.configure({ mode: 'serial' });

test('bootstrap authenticated storage state', async ({ page }) => {
  // Ensure we start from a clean auth state snapshot
  if (fs.existsSync(AUTH_STATE_PATH)) {
    fs.rmSync(AUTH_STATE_PATH);
  }

  const email = process.env.E2E_TEST_EMAIL || 'test@intelgraph.ai';
  const password = process.env.E2E_TEST_PASSWORD || 'test-password-123';

  await page.goto('/login');

  await page.fill('input[name="email"]', email);
  await page.fill('input[name="password"]', password);
  await page.click('button[type="submit"]');

  await expect(page).not.toHaveURL(/login/, { timeout: 30000 });
  await expect(page).toHaveURL(/(dashboard|home|maestro)/, { timeout: 30000 });

  fs.mkdirSync(path.dirname(AUTH_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: AUTH_STATE_PATH });
});
