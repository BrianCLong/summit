// conductor-ui/frontend/tests/e2e/accessibility.spec.ts
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Accessibility', () => {
  test('should not have any automatically detectable accessibility issues on the main pages', async ({
    page,
  }) => {
    await page.goto('/');
    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();
    expect(accessibilityScanResults.violations).toEqual([]);

    await page.goto('/incidents/1'); // Example incident page
    const incidentPageScanResults = await new AxeBuilder({ page }).analyze();
    expect(incidentPageScanResults.violations).toEqual([]);
  });
});
