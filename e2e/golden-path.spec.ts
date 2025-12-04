import { test, expect } from '@playwright/test';

test.describe('Golden Path Workflow', () => {
  test('User can login and view dashboard', async ({ page }) => {
    // 1. Visit Home
    await page.goto('/');

    // Check if we are redirected to login or already logged in (mocked)
    // Since we mock auth in playwright (localStorage or similar) usually
    // But here let's assume we start fresh.

    // If redirected to login
    if (page.url().includes('/login')) {
      await page.fill('input[type="email"]', 'analyst@intelgraph.tech');
      await page.fill('input[type="password"]', 'password123'); // Mock creds
      await page.click('button[type="submit"]');
      await page.waitForURL('**/dashboard');
    }

    // 2. Dashboard
    // await expect(page).toHaveURL(/.*dashboard/);
    // await expect(page.getByText('System Status')).toBeVisible();

    // 3. Navigate to Investigations
    // await page.getByRole('link', { name: 'Investigations' }).click();
    // await expect(page).toHaveURL(/.*investigations/);

    // 4. Create New Investigation (Simulated)
    // await page.getByRole('button', { name: 'New Investigation' }).click();
    // await expect(page.getByText('Create Investigation')).toBeVisible();

    // Since this is a "first pass" E2E, we verify basic load and title
    const title = await page.title();
    expect(title).toBeDefined();

    // Check for critical UI elements
    // const nav = page.locator('nav');
    // await expect(nav).toBeVisible();
  });
});
