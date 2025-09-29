// =============================================
// File: e2e/a11y/maestro.a11y.spec.ts
// =============================================
import { test } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Maestro A11y Checks', () => {
  test('should not have any accessibility issues on Maestro page', async ({ page }) => {
    await page.goto('/maestro');
    await injectAxe(page);
    await checkA11y(page, null, {
      axeOptions: {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'best-practice'],
        },
      },
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });
});
