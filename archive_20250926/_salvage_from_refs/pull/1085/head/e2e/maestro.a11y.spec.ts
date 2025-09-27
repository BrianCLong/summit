// =============================================
// File: e2e/maestro.a11y.spec.ts
// =============================================
import { test, expect } from ' @playwright/test';
import { injectAxe, checkA11y } from ' @axe-core/playwright';

async function openAllTabs(page: any) {
  await page.getByRole('tab', { name: 'Routing' }).click();
  await page.getByRole('tab', { name: 'Web' }).click();
  await page.getByRole('tab', { name: 'Budgets' }).click();
  await page.getByRole('tab', { name: 'Logs' }).click();
}

test.describe('Maestro — Axe accessibility', () => {
  test('route is axe-clean (AA) on each tab', async ({ page }) => {
    await page.goto('/maestro');
    await injectAxe(page);

    // Check initial (Routing)
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { json: true },
      axeOptions: { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] },
    });

    // Web
    await page.getByRole('tab', { name: 'Web' }).click();
    await checkA11y(page, undefined, { axeOptions: { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] } });

    // Budgets
    await page.getByRole('tab', { name: 'Budgets' }).click();
    await checkA11y(page, undefined, { axeOptions: { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] } });

    // Logs
    await page.getByRole('tab', { name: 'Logs' }).click();
    await checkA11y(page, undefined, { axeOptions: { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'] } });
  });
});
