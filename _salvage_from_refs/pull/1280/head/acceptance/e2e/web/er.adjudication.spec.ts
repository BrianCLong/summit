import { test, expect } from '@playwright/test';

test('ER queue processes HIGH automatically, MID requires review', async ({ page }) => {
  await page.goto(process.env.WEB_URL!);
  await page.click('text=ER Adjudication');
  await page.waitForSelector('[data-row-id="k-1"][data-status="merged"]');
  await page.click('[data-filter="MID"]');
  await expect(page.locator('[data-row-id="k-2"]').first()).toBeVisible();
});
