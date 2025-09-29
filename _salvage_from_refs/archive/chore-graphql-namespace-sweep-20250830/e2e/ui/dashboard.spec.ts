import { test, expect } from '@playwright/test';

test('Dashboard Loads & Panels Render', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Stats Overview')).toBeVisible();
  await expect(page.getByText('p95 Latency')).toBeVisible();
  await expect(page.getByText('Error Ratio')).toBeVisible();
});

