import { test, expect } from '@playwright/test';

test.describe('IntelGraph Canvas', () => {
  test('should display the graph canvas and panels', async ({ page }) => {
    await page.goto('/graph/new-canvas');

    // Expect the graph container to be visible
    const graphContainer = page.locator(
      'div[style*="width: 100%"][style*="height: 100%"][style*="border: 1px solid rgb(204, 204, 204)"]',
    );
    await expect(graphContainer).toBeVisible();

    // Expect the panels to be visible
    await expect(page.getByText('Entities')).toBeVisible();
    await expect(page.getByText('Relationships')).toBeVisible();
    await expect(page.getByText('AI Suggestions')).toBeVisible();
    await expect(page.getByText('Copilot Runs')).toBeVisible();

    // Optional: Check for loading indicator if it's still present for a very short time
    // await expect(page.getByText('Loading Graph Data...')).not.toBeVisible();
  });
});
