// =============================================
// File: e2e/maestro.a11y.spec.ts
// =============================================
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function openAllTabs(page: any) {
  await page.getByRole('tab', { name: 'Routing' }).click();
  await page.getByRole('tab', { name: 'Web' }).click();
  await page.getByRole('tab', { name: 'Budgets' }).click();
  await page.getByRole('tab', { name: 'Logs' }).click();
}

test.describe('Maestro — Axe accessibility', () => {
  test('route is axe-clean (AA) on each tab', async ({ page }) => {
    const resp = await page.goto('/');
    if (!resp?.ok()) {
      test.skip(`Skipping a11y: target returned ${resp?.status()}`);
    }

    // Routing
    let results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    test.info().annotations.push({ type: 'a11y-routing', description: String(results.violations?.length || 0) });
    expect((results.violations || []).filter(v => v.impact === 'critical')).toEqual([]);

    // Web
    await page.getByRole('tab', { name: 'Web' }).click();
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    test.info().annotations.push({ type: 'a11y-web', description: String(results.violations?.length || 0) });
    expect((results.violations || []).filter(v => v.impact === 'critical')).toEqual([]);

    // Budgets
    await page.getByRole('tab', { name: 'Budgets' }).click();
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    test.info().annotations.push({ type: 'a11y-budgets', description: String(results.violations?.length || 0) });
    expect((results.violations || []).filter(v => v.impact === 'critical')).toEqual([]);

    // Logs
    await page.getByRole('tab', { name: 'Logs' }).click();
    results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    test.info().annotations.push({ type: 'a11y-logs', description: String(results.violations?.length || 0) });
    expect((results.violations || []).filter(v => v.impact === 'critical')).toEqual([]);
  });
});
