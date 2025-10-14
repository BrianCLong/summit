import { test, expect } from '@playwright/test';
test('accepting a suggestion creates an edge and shows toast', async ({ page }) => {
  await page.goto('http://localhost:3001/cases/c1');
  await page.getByText('Predictive Links').waitFor();
  const first = page.locator('.suggestion-item').first();
  await first.hover();
  await first.getByRole('button', { name: /Accept/ }).click();
  await expect(page.getByRole('status')).toContainText(/accepted/i);
});
