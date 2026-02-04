import { test, expect } from '@playwright/test';

test.describe('golden-path: smoke', () => {
  // Kill switch: skip if not enabled
  test.skip(process.env.GOLDEN_PATH_E2E_ENABLED !== '1', 'GOLDEN_PATH_E2E_ENABLED!=1');

  test('loads consolidated frontend home', async ({ page }) => {
    const baseURL = process.env.BASE_URL || 'http://localhost:3000';
    console.log(`Navigating to ${baseURL}`);

    await page.goto(baseURL, { waitUntil: 'domcontentloaded' });

    // Check for title or root element
    const title = await page.title();
    console.log(`Page title: ${title}`);
    expect(title).toBeTruthy();

    // Verify root element is attached (React usually mounts here)
    await expect(page.locator('#root')).toBeAttached();
  });
});
