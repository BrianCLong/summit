import { test, expect } from '@playwright/test';

test('loads graph and shows timeline controls', async ({ page }) => {
  await page.goto('/graph');
  await expect(page.getByLabel('From')).toBeVisible();
  await expect(page.getByLabel('To')).toBeVisible();
});

test('shows enrichment panel when node selected (smoke)', async ({ page }) => {
  await page.goto('/graph');
  // Try to click near the center to select a node (depends on sample layout)
  const canvas = page.locator('canvas');
  await canvas.click({ position: { x: 200, y: 200 } });
  // Check that "Enrichment" text appears somewhere
  await expect(page.getByText(/Enrichment/i)).toBeVisible({ timeout: 2000 });
});

