import { test, expect } from '@playwright/test';

test('author -> preview -> deploy flow', async ({ page }) => {
  await page.goto('http://localhost:4100/ui');
  await page.fill('#sequence', 'login');
  await page.click('#add-seq');
  await page.fill('#window-duration', '1m');
  await page.click('#add-window');
  await expect(page.locator('#preview')).toContainText('Preview: AFTER login WINDOW TUMBLING 1m');
});
