import { test, expect } from '@playwright/test';
import { performLogin } from '../utils/auth';
import { runAccessibilityScan } from '../utils/accessibility';
import { registerGraphQLMocks } from '../utils/graphql';

test.describe('Operations dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await registerGraphQLMocks(page);
    await performLogin(page);
  });

  test('surfaces the primary health metrics panels', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Stats Overview' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Live Activity' })).toBeVisible();
    await expect(page.getByRole('region', { name: /Overview stats/i })).toContainText('Total Entities');
    await expect(page.getByRole('heading', { name: /Latency/i })).toBeVisible();

    await runAccessibilityScan(page, { context: 'main' });
  });

  test('expands live activity feed and highlights incident severity', async ({ page }) => {
    await page.getByText('Live Activity', { exact: true }).click();

    const activityList = page.getByRole('list');
    await expect(activityList.locator('li')).toHaveCount(4);
    await expect(activityList).toContainText('New investigation started');
    await expect(activityList).toContainText('Potential threat identified');
  });

  test('persists dashboard navigation state after reload', async ({ page }) => {
    await page.reload();
    await expect(page.getByRole('heading', { name: 'Stats Overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('aria-current', 'page');
  });
});
