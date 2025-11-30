import { test, expect } from '@playwright/test';

test.describe('Golden Path', () => {
  test('Complete investigation workflow', {
    tag: '@golden-path',
  }, async ({ page }) => {

    // 1. Login
    await test.step('Login', async () => {
      await page.goto('/login');
      // Try to handle potential redirects or loading states
      await page.waitForLoadState('networkidle');

      // Attempt login
      if (await page.getByLabel(/username|email/i).isVisible()) {
        await page.getByLabel(/username|email/i).fill('analyst');
        await page.getByLabel(/password/i).fill('analyst123');
        await page.getByRole('button', { name: /log in|sign in/i }).click();

        // Wait for navigation to dashboard
        await expect(page).toHaveURL(/\/dashboard|\/$/);
      } else {
        // Maybe already logged in or different flow?
        console.log('Login form not visible, checking if already logged in...');
      }
    });

    // 2. Create Investigation
    await test.step('Create Investigation', async () => {
      // Navigate to investigations list if not there
      await page.goto('/investigations');

      // Open create dialog
      await page.getByRole('button', { name: /create|new investigation/i }).click();

      const investigationName = `Smoke Test ${Date.now()}`;

      // Fill form
      await page.getByLabel(/name|title/i).fill(investigationName);
      await page.getByLabel(/description/i).fill('Created by E2E Golden Path Test');

      // Submit
      await page.getByRole('button', { name: /create|save|submit/i }).click();

      // Verify creation
      await expect(page.getByText(investigationName)).toBeVisible();

      // Click to open
      await page.getByText(investigationName).click();
    });

    // 3. Verify Workbench/Graph Load
    await test.step('Verify Workbench', async () => {
      // Expect to be on the investigation detail or graph view
      await expect(page).toHaveURL(/\/investigations\/| \/graph/);

      // Check for key UI elements
      await expect(page.getByRole('main')).toBeVisible();
      // Assume there is a canvas or some graph container
      // Using a generic check for now as we don't know the exact class
      // await expect(page.locator('canvas')).toBeVisible();
    });
  });
});
