import { test, expect } from '@playwright/test';
test('golden path', async ({ page }) => {
  await page.goto(process.env.BASE_URL!);
  await page.click('text=Login');
  await page.fill('#email', process.env.E2E_USER!);
  await page.fill('#password', process.env.E2E_PASS!);
  await page.click('text=Sign in');
  await expect(page.locator('text=Welcome')).toBeVisible();
  await page.fill('#q', 'graph');
  await page.press('#q', 'Enter');
  await expect(page.locator('[data-test=result]')).toHaveCountGreaterThan(0);
});
