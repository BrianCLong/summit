import { test, expect } from '@playwright/test';

const pages = [
  '/',
  '/reference/',
  '/tutorials/first-ingest',
  '/how-to/zip-export',
];

for (const p of pages) {
  test(`navigates ${p}`, async ({ page }) => {
    await page.goto(process.env.BASE_URL || 'http://localhost:3000' + p);
    await expect(page).toHaveTitle(/IntelGraph/);
    const links = await page.locator('a').all();
    expect(links.length).toBeGreaterThan(10);
  });
}
