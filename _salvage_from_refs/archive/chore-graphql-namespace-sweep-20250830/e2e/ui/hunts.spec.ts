import { test, expect } from '@playwright/test';

test('Hunt list and run page', async ({ page }) => {
  await page.goto('/hunts');
  await expect(page.getByText('Threat Hunts')).toBeVisible();
  await page.goto('/hunts/h1');
  await expect(page.getByText('Hunt Run')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Re-run' })).toBeVisible();
});

