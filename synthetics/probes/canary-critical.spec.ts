import { test, expect } from '@playwright/test';

const baseUrl = process.env.CANARY_BASE_URL ?? 'https://canary.intelgraph.local';

// Canary-critical journey: login -> search -> export
// Marked with canary label for dashboard splits
const userEmail = process.env.CANARY_USER_EMAIL ?? 'canary-tester@example.com';
const userPassword = process.env.CANARY_USER_PASSWORD ?? 'insecure-password';

async function login(page) {
  await page.goto(`${baseUrl}/login`, { waitUntil: 'networkidle' });
  await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  await page.getByLabel(/email/i).fill(userEmail);
  await page.getByLabel(/password/i).fill(userPassword);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page.getByTestId('nav-home')).toBeVisible();
}

test.describe('canary-critical', () => {
  test('login, search, and export stays healthy', async ({ page }) => {
    await login(page);

    await page.getByPlaceholder(/search/i).fill('threat intel');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('search-results')).toBeVisible({ timeout: 10000 });

    await page.getByRole('button', { name: /export/i }).click();
    await expect(page.getByText(/export started/i)).toBeVisible({ timeout: 5000 });

    const downloadToast = page.getByText(/download ready/i);
    await expect(downloadToast).toBeVisible({ timeout: 15000 });
  });
});
