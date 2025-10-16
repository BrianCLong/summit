import { test, expect } from '@playwright/test';

test('Alerts badge increments on ALERT_EVT and clears on navigation', async ({
  page,
}) => {
  await page.goto('/');
  // trigger UI event fallback to simulate new alert
  await page.evaluate(() =>
    window.dispatchEvent(new CustomEvent('ig:ALERT_EVT')),
  );
  // badge with number 1 should appear
  const badge = page.locator('text=1');
  await expect(badge).toBeVisible();

  // Click Alerts (opens Watchlists and should clear badge)
  await page.getByRole('button', { name: 'Alerts' }).click();
  await expect(badge).toHaveCount(0);
});
