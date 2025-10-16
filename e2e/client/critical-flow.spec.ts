import { test, expect } from '@playwright/test';

test.describe('Critical Flow: Sign-in and Search', () => {
  test('should allow a user to sign in and perform a search', async ({
    page,
  }) => {
    await page.goto('/login');
    await page.fill('input[name="username"]', 'testuser');
    await page.fill('input[name="password"]', 'password');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/dashboard');

    await page.fill('input[name="search"]', 'example query');
    await page.press('input[name="search"]', 'Enter');

    await expect(page.locator('.search-results')).toBeVisible();
  });
});
