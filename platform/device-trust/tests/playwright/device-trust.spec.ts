import { test, expect } from '@playwright/test';
import fixtures from '../../fixtures/posture-fixtures.json';

const nonCompliant = fixtures[0];
const remediated = fixtures[1];

test('non-compliant → remediate → pass', async ({ page }) => {
  await page.setContent('<div id="status"></div><div id="actions"></div>');

  const evaluate = (fixture: typeof nonCompliant) => {
    const failed = fixture.localChecks.filter(check => !check.passed);
    return { passed: failed.length === 0, failed: failed.map(c => c.name) };
  };

  let result = evaluate(nonCompliant);
  await page.$eval('#status', (node, res: any) => {
    node.textContent = res.passed ? 'pass' : 'fail:' + res.failed.join(',');
  }, result);

  await expect(page.locator('#status')).toContainText('fail');

  result = evaluate(remediated);
  await page.$eval('#status', (node, res: any) => {
    node.textContent = res.passed ? 'pass' : 'fail:' + res.failed.join(',');
  }, result);

  await expect(page.locator('#status')).toHaveText('pass');
});
