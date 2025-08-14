// E2E skeleton (skipped) for right-click → expand → AI flow
import { test, expect } from '@playwright/test';

test.describe.skip('Advanced Graph Flow', () => {
  test('right-click expand and AI overlay', async ({ page }) => {
    await page.goto('/graph/advanced');
    await expect(page.getByText('AI Panel')).toBeVisible();
    // TODO: seed graph with a node, simulate right-click, select Expand Neighbors,
    // verify added nodes, then emit ai:insight (via mock or dev socket) and assert panel updates.
  });
});

