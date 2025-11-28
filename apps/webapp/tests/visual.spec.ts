import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { generateGraphData } from './utils/generateGraph';
import { createMapboxState } from './utils/mapboxStub';
import { applyTestHarness } from './utils/harness';

test('dashboard visual regression', async ({ page }) => {
  const graph = generateGraphData({ seed: 21, nodes: 5 });
  const mapState = createMapboxState();
  await page.addInitScript(applyTestHarness, graph, mapState);
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.waitForSelector('[data-testid="graph-pane"]');
  await page.evaluate(() =>
    (window as any).store.dispatch({
      type: 'selection/selectNode',
      payload: 'node-3',
    }),
  );

  const snapshotName = 'webapp-dashboard.png';
  const snapshotPath = test.info().snapshotPath(snapshotName);
  if (!fs.existsSync(snapshotPath)) {
    const image = await page.screenshot({ fullPage: true });
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    fs.writeFileSync(snapshotPath, image);
  }

  await expect(page).toHaveScreenshot(snapshotName, {
    fullPage: true,
  });
});
