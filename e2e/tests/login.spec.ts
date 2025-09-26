import { test, expect } from '@playwright/test';
import { performLogin } from '../utils/auth';
import { runAccessibilityScan } from '../utils/accessibility';
import { registerGraphQLMocks } from '../utils/graphql';

test.describe('User authentication', () => {
  test.beforeEach(async ({ page }) => {
    await registerGraphQLMocks(page);
    await page.goto('/login');
  });

  test('enforces credential requirements before submission', async ({ page }) => {
    await runAccessibilityScan(page, { context: 'body' });

    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByRole('alert')).toContainText('Please enter email and password');
  });

  test('allows analysts to sign in and reach the dashboard', async ({ page }) => {
    await page.getByLabel('Email').fill('analyst@example.com');
    await page.getByLabel('Password').fill('SuperSecure!123');
    await page.getByRole('button', { name: 'Sign In' }).click();

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: 'Stats Overview' })).toBeVisible();
    await runAccessibilityScan(page, { context: 'main' });
  });

  test('persists authentication token in local storage after login', async ({ page }) => {
    await performLogin(page);

    const token = await page.evaluate(() => window.localStorage.getItem('token'));
    expect(token).toBe('demo-token-12345');
  });
});
