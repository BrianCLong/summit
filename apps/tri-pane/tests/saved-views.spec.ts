import { test, expect } from '@playwright/test';

test.describe('Saved views', () => {
  test('saves, reloads, and restores the brushed window', async ({ page }) => {
    await page.goto('/');

    await page.getByLabel('Name').fill('Morning brush');
    await page.locator('#range-start').evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = '6';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.locator('#range-end').evaluate((el) => {
      const input = el as HTMLInputElement;
      input.value = '12';
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.getByRole('button', { name: /Save view/i }).click();

    await page.reload();

    await page.getByRole('button', { name: /Morning brush/i }).click();
    await expect(page.getByText(/Start 6/)).toBeVisible();
    await expect(page.getByText(/End 12/)).toBeVisible();
  });
});
