import { test, expect } from '@playwright/test';

test('Investigations list renders and navigates to detail', async ({
  page,
}) => {
  await page.goto('/investigations');
  await expect(page.getByText('Investigations')).toBeVisible();
  // Navigate to a detail page (mock id)
  await page.goto('/investigations/inv1');
  await expect(page.getByText('Investigation —')).toBeVisible();
  await expect(page.getByText('Export Report')).toBeVisible();
});
