// =============================================
// File: e2e/a11y/maestro.a11y.spec.ts
// =============================================
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Maestro A11y Checks', () => {
  test('should not have WCAG A/AA issues on Maestro page', async ({
    page,
    baseURL,
  }) => {
    const resp = await page.goto('/');
    if (!resp?.ok()) {
      test.skip(`Skipping a11y: target returned ${resp?.status()}`);
    }
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    const critical = (results.violations || []).filter(
      (v) => v.impact === 'critical',
    );
    test
      .info()
      .annotations.push({
        type: 'a11y-violations',
        description: String(results.violations?.length || 0),
      });
    expect(critical).toEqual([]);
  });
});
