// conductor-ui/frontend/tests/e2e/run-detail-views.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Run Detail Views', () => {
  test('should display the run graph and streaming logs', async ({ page }) => {
    await page.goto('/runs/some-run-id');

    // Check for Graph View
    await expect(
      page.getByRole('heading', { name: 'Run Graph' }),
    ).toBeVisible();
    await expect(page.locator('div[style*="height: 400px"]')).toBeVisible(); // Placeholder for graph canvas

    // Check for Logs Pane
    await expect(
      page.getByRole('heading', { name: 'Streaming Logs' }),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: 'Pause' })).toBeVisible();
  });
});
