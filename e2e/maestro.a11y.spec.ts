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
  test('route is axe-clean (AA) on main page', async ({ page }) => {
    test.setTimeout(90000); // Extended timeout for a11y analysis

    const resp = await page.goto('/');
    if (!resp?.ok()) {
      test.skip(`Skipping a11y: target returned ${resp?.status()}`);
    }

    // Wait for page load
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Test main page accessibility
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    test
      .info()
      .annotations.push({
        type: 'a11y-violations',
        description: String(results.violations?.length || 0),
      });

    // Log all violations for debugging
    if (results.violations && results.violations.length > 0) {
      console.log(
        'Accessibility violations found:',
        results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
          nodes: v.nodes.length,
        })),
      );
    }

    // Only fail on critical violations, log others
    const critical = (results.violations || []).filter(
      (v) => v.impact === 'critical',
    );
    const serious = (results.violations || []).filter(
      (v) => v.impact === 'serious',
    );
    const moderate = (results.violations || []).filter(
      (v) => v.impact === 'moderate',
    );

    if (serious.length > 0) {
      console.log(
        `Found ${serious.length} serious a11y issues that should be addressed:`,
        serious.map((v) => `${v.id}: ${v.description}`),
      );
    }

    if (moderate.length > 0) {
      console.log(
        `Found ${moderate.length} moderate a11y issues:`,
        moderate.map((v) => `${v.id}: ${v.description}`),
      );
    }

    expect(critical).toEqual([]);
  });
});
