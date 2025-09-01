// =============================================
// File: e2e/maestro.keyboard.spec.ts
// =============================================
import { test, expect } from ' @playwright/test';

const gotoMaestro = async (page: any) => {
  await page.goto('/maestro');
  await expect(page.getByRole('heading', { name: 'Maestro' })).toBeVisible();
};

test.describe('Maestro — ARIA tabs & keyboard', () => {
  test('tabs expose roles and keyboard navigation works', async ({ page }) => {
    await gotoMaestro(page);

    const routingTab = page.getByRole('tab', { name: 'Routing' });
    const webTab = page.getByRole('tab', { name: 'Web' });
    const budgetsTab = page.getByRole('tab', { name: 'Budgets' });
    const logsTab = page.getByRole('tab', { name: 'Logs' });

    await expect(routingTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Routing' })).toBeVisible();

    // ArrowRight → Web
    await routingTab.focus();
    await page.keyboard.press('ArrowRight');
    await expect(webTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Web' })).toBeVisible();

    // Home → Routing
    await page.keyboard.press('Home');
    await expect(routingTab).toHaveAttribute('aria-selected', 'true');

    // End → Logs
    await page.keyboard.press('End');
    await expect(logsTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByRole('tabpanel', { name: 'Logs' })).toBeVisible();

    // Click Budgets to ensure mouse also works
    await budgetsTab.click();
    await expect(budgetsTab).toHaveAttribute('aria-selected', 'true');
  });
});
