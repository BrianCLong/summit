import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function check(page: any, path: string) {
  await page.goto(path);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter(v => ['serious','critical'].includes(v.impact || ''));
  expect(serious).toEqual([]);
}

test('a11y smoke: /dashboard, /graph, /investigations/inv1', async ({ page }) => {
  await check(page, '/dashboard');
  await check(page, '/graph');
  await check(page, '/investigations/inv1');
});

