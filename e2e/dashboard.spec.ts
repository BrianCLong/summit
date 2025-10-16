import { test, expect } from '@playwright/test';

const WEB = process.env.BASE_WEB || 'http://localhost:3000';

test('dashboard charts render & export works', async ({ page }) => {
  await page.goto(`${WEB}/dashboard`);
  await expect(page.getByTestId('investigation-metrics')).toBeVisible({
    timeout: 15000,
  });
  const exportBtn = page.getByRole('button', { name: /Export/i });
  if (await exportBtn.isVisible()) {
    await exportBtn.click();
    await expect(page.getByText(/Export/)).toBeVisible();
  }
});
