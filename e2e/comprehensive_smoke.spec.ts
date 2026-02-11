import { test, expect } from '@playwright/test';

test.describe('Comprehensive Smoke Test', () => {
  test('sanity check application load', async ({ page }) => {
    await page.goto('/');

    // Basic verification
    const title = await page.title();
    console.log(`Page title: ${title}`);
    expect(title.length).toBeGreaterThan(0);

    // Ensure body is loaded
    await expect(page.locator('body')).toBeVisible();
  });
});
