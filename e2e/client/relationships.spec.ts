import { test, expect } from '@playwright/test';

test('relationship controls present', async ({ page }) => {
  await page.goto('/graph');
  await expect(page.getByRole('button', { name: /Play/i })).toBeVisible();
});

