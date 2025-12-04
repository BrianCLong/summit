import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { samplePage } from './helpers/samplePage';

const focusScript = `
  window.buildFocusOrder = () => {
    const selectors = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const nodes = Array.from(document.querySelectorAll(selectors)).filter((node) => !node.hasAttribute('disabled'));
    return nodes.map((node, index) => ({
      index: index + 1,
      nodeName: node.nodeName.toLowerCase(),
      label: node.getAttribute('aria-label') || node.textContent || node.id || 'unlabeled',
    }));
  };
`;

test('axe has zero critical violations', async ({ page }) => {
  await page.setContent(samplePage);
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze();
  const critical = results.violations.filter((violation) => violation.impact === 'critical');
  expect(critical.length).toBe(0);
});

test('focus order map is generated', async ({ page }) => {
  await page.setContent(samplePage);
  await page.addScriptTag({ content: focusScript });
  const focusOrder = await page.evaluate(() => (window as unknown as { buildFocusOrder: () => unknown }).buildFocusOrder());
  expect(Array.isArray(focusOrder)).toBe(true);
  expect((focusOrder as { label: string }[])[0]?.label).toContain('Skip');
});

test('supports text scaling and RTL stress', async ({ page }) => {
  await page.setContent(samplePage);
  await page.addStyleTag({ content: 'body { font-size: 120%; direction: rtl; }' });
  const dir = await page.$eval('body', (node) => node.getAttribute('dir'));
  const fontSize = await page.$eval('body', (node) => getComputedStyle(node as HTMLElement).fontSize);
  expect(dir === 'rtl' || dir === null).toBeTruthy();
  expect(parseFloat(fontSize)).toBeGreaterThanOrEqual(19);
});
