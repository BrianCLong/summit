import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('WCAG 2.1 AA - key routes', () => {
  const routes = ['/', '/dashboard', '/graph'];

  for (const path of routes) {
    test(`a11y scan ${path}`, async ({ page }) => {
      await page.goto(
        `http://localhost:${process.env.CLIENT_PORT || 3000}${path}`,
      );
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa'])
        .analyze();
      // Log violations for CI artifact without failing immediately
      if (results.violations.length) {
        console.log(
          `Accessibility issues on ${path}:`,
          JSON.stringify(results.violations, null, 2),
        );
      }
      expect(results.violations).toEqual([]);
    });
  }
});
