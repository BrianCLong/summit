import { test, expect } from '@playwright/test';

test('IOC list and detail', async ({ page }) => {
  await page.goto('/ioc');
  await expect(page.getByText('IOCs')).toBeVisible();
  await page.goto('/ioc/ioc1');
  await expect(page.getByText('IOC —')).toBeVisible();
});

