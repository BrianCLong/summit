import { expect, test } from '@playwright/test';

test.describe('Theme mode integration', () => {
  const isDarkMode = (page: import('@playwright/test').Page) =>
    page.evaluate(() => document.documentElement.classList.contains('dark'));

  test('allows toggling dark mode and persists preference', async ({ page }) => {
    await page.goto('/login');

    const toggle = page.getByRole('button', { name: /toggle theme/i });
    await expect(toggle).toBeVisible();

    const initialMode = await isDarkMode(page);

    await toggle.click();
    await expect.poll(async () => isDarkMode(page)).toBe(!initialMode);

    const storedPreference = await page.evaluate(() => window.localStorage.getItem('summit.theme'));
    await expect(storedPreference).toBe(!initialMode ? 'dark' : 'light');

    await page.getByLabel(/email/i).fill('demo@summit.ai');
    await page.getByLabel(/password/i).fill('password');
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL('**/dashboard');
    await page.getByText('Intelligence Command Center', { exact: false }).waitFor();

    await expect.poll(async () => isDarkMode(page)).toBe(!initialMode);

    await page.reload();
    await expect.poll(async () => isDarkMode(page)).toBe(!initialMode);

    const persistedPreference = await page.evaluate(() => window.localStorage.getItem('summit.theme'));
    await expect(persistedPreference).toBe(!initialMode ? 'dark' : 'light');
  });
});
