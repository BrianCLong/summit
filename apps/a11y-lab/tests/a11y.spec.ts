import { test, expect } from '@playwright/test';
import AxeBuilder, { AxeViolation } from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';
import { walkFocusOrder } from '../src/focus-order';
import { getHeatmapSnippet } from '../src/heatmap-overlay';

const ARTIFACT_DIR = path.join(process.cwd(), 'artifacts');
const REPORT_PATH = path.join(ARTIFACT_DIR, 'axe-report.json');

function ensureArtifacts() {
  if (!fs.existsSync(ARTIFACT_DIR)) {
    fs.mkdirSync(ARTIFACT_DIR, { recursive: true });
  }
}

test.describe('Accessibility gates', () => {
  test.beforeEach(async ({ page, baseURL }) => {
    await page.goto(baseURL ?? 'http://localhost:3000');
  });

  test('axe-core finds no critical violations and captures artifacts', async ({ page }) => {
    const builder = new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']);
    const results = await builder.analyze();

    ensureArtifacts();
    fs.writeFileSync(REPORT_PATH, JSON.stringify({ ...results, violations: sanitize(results.violations) }, null, 2));

    const critical = results.violations.filter((v) => v.impact === 'critical');
    expect(critical, 'Critical accessibility regressions detected').toHaveLength(0);

    const contrastViolations = results.violations.filter((v) => v.id === 'color-contrast');
    const contrastBudget = contrastViolations.length;
    // contrast budget: flag loudly if it exceeds 2
    expect(contrastBudget, 'Contrast budget exceeded').toBeLessThanOrEqual(2);

    // store an analytics-free heatmap snippet for optional embedding
    const snippet = getHeatmapSnippet({ ...results, violations: sanitize(results.violations) } as any);
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'heatmap-snippet.js'), snippet);
  });

  test('focus order walk does not get trapped', async ({ page }) => {
    const focusMap = await walkFocusOrder(page);
    ensureArtifacts();
    fs.writeFileSync(path.join(ARTIFACT_DIR, 'focus-order.json'), JSON.stringify(focusMap, null, 2));
    expect(focusMap.trapped, 'Keyboard trap detected while tabbing through the page').toBeFalsy();
  });
});

function sanitize(violations: AxeViolation[]) {
  return violations.map(({ id, impact, description, nodes, helpUrl }) => ({
    id,
    impact,
    description,
    helpUrl,
    nodes: nodes.map((node) => ({
      impact: node.impact,
      html: undefined,
      target: node.target,
      failureSummary: node.failureSummary,
    })),
  }));
}
