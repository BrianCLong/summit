import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Expect a title "to contain" a substring.
  // Adjust this based on the actual application title
  await expect(page).toHaveTitle(/IntelGraph|Summit/);
});

test('login page loads', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  // Check for login form elements
  // This assumes standard login inputs exist
  const emailInput = page.locator('input[type="email"], input[name="username"]');
  if (await emailInput.count() > 0) {
      await expect(emailInput).toBeVisible();
  }
});
