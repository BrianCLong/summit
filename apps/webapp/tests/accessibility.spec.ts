import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from 'axe-playwright';

test.describe('Accessibility', () => {
  test('the main page should not have any automatically detectable accessibility issues', async ({
    page,
  }) => {
    await page.goto('/');
    await injectAxe(page);

    await expect(page.locator('[data-testid="graph-pane"]')).toBeVisible();

    await checkA11y(page, null, {
      detailedReport: true,
      detailedReportOptions: {
        html: true,
      },
    });
  });
});
