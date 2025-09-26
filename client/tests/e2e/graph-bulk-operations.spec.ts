import { test, expect } from '@playwright/test';

test.describe('Graph bulk selection toolbar', () => {
  test('toggles selection mode and disables destructive actions with no selection', async ({ page }) => {
    await page.goto('/graph/new-canvas');

    const selectionToggle = page.getByRole('button', { name: /bulk selection mode/i });
    await expect(selectionToggle).toHaveAttribute('aria-pressed', 'false');

    await selectionToggle.click();
    await expect(selectionToggle).toHaveAttribute('aria-pressed', 'true');

    const deleteButton = page.getByRole('button', {
      name: /delete selected nodes and edges/i,
    });
    await expect(deleteButton).toBeDisabled();

    const clearButton = page.getByRole('button', {
      name: /clear selected nodes and edges/i,
    });
    await expect(clearButton).toBeDisabled();
  });
});
