import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

async function runAxe(page: Parameters<typeof test>[0]['page']) {
  const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
  const results = await builder.analyze();
  const critical = results.violations.filter((v) => v.impact === 'critical');
  expect(critical, 'Critical accessibility regressions detected under stress mode').toHaveLength(0);
}

test.describe('Stress a11y modes', () => {
  test('handles text scaling', async ({ page, baseURL }) => {
    await page.goto(baseURL ?? 'http://localhost:3000');
    await page.addStyleTag({ content: 'html { font-size: 125%; }' });
    await runAxe(page);
  });

  test('handles RTL toggles', async ({ page, baseURL }) => {
    await page.goto(baseURL ?? 'http://localhost:3000');
    await page.evaluate(() => {
      document.documentElement.setAttribute('dir', 'rtl');
      document.body.setAttribute('dir', 'rtl');
    });
    await runAxe(page);
  });
});
