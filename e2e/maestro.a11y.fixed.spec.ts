// =============================================
// File: e2e/maestro.a11y.fixed.spec.ts
// =============================================
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Maestro — Accessibility Testing', () => {
  test('main page should be accessible', async ({ page }) => {
    test.setTimeout(60000);

    const resp = await page.goto('/');
    if (!resp?.ok()) {
      test.skip(`Skipping a11y: target returned ${resp?.status()}`);
    }

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle', { timeout: 30000 });

    // Run accessibility test on main page
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

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

    // Record the total number of violations
    test.info().annotations.push({
      type: 'a11y-total-violations',
      description: String(results.violations?.length || 0),
    });

    // Only fail on critical and serious violations
    const critical = (results.violations || []).filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    const minor = (results.violations || []).filter(
      (v) => v.impact === 'moderate' || v.impact === 'minor',
    );

    if (minor.length > 0) {
      console.log(
        `Found ${minor.length} minor/moderate a11y issues that should be addressed:`,
        minor.map((v) => `${v.id}: ${v.description}`),
      );
    }

    // Record critical violations count
    test.info().annotations.push({
      type: 'a11y-critical-violations',
      description: String(critical.length),
    });

    expect(critical).toEqual([]);
  });

  test('admin studio should be accessible', async ({ page }) => {
    test.setTimeout(60000);

    const resp = await page.goto('/admin');
    if (!resp?.ok()) {
      test.skip(`Skipping admin a11y: target returned ${resp?.status()}`);
    }

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    if (results.violations && results.violations.length > 0) {
      console.log(
        'Admin page violations:',
        results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
        })),
      );
    }

    test.info().annotations.push({
      type: 'a11y-admin-violations',
      description: String(results.violations?.length || 0),
    });

    const critical = (results.violations || []).filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(critical).toEqual([]);
  });

  test('observability page should be accessible', async ({ page }) => {
    test.setTimeout(60000);

    const resp = await page.goto('/observability');
    if (!resp?.ok()) {
      test.skip(
        `Skipping observability a11y: target returned ${resp?.status()}`,
      );
    }

    await page.waitForLoadState('networkidle', { timeout: 30000 });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    if (results.violations && results.violations.length > 0) {
      console.log(
        'Observability page violations:',
        results.violations.map((v) => ({
          id: v.id,
          impact: v.impact,
          description: v.description,
        })),
      );
    }

    test.info().annotations.push({
      type: 'a11y-observability-violations',
      description: String(results.violations?.length || 0),
    });

    const critical = (results.violations || []).filter(
      (v) => v.impact === 'critical' || v.impact === 'serious',
    );

    expect(critical).toEqual([]);
  });
});
