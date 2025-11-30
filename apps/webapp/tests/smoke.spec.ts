import type { Page } from '@playwright/test';
import { test, expect } from '@playwright/test';
import { generateGraphData } from './utils/generateGraph';
import { createMapboxState } from './utils/mapboxStub';
import { applyTestHarness } from './utils/harness';

const BOOTSTRAP = async (page: Page) => {
  const graph = generateGraphData({ seed: 7, nodes: 5 });
  const mapState = createMapboxState();
  await page.addInitScript(applyTestHarness, graph, mapState);
};

test.describe('Webapp smoke', () => {
  test.beforeEach(async ({ page }) => {
    await BOOTSTRAP(page);
    await page.goto('/');
  });

  test('loads the tri-pane layout and theme toggle', async ({ page }) => {
    await expect(page.getByTestId('graph-pane')).toBeVisible();
    await expect(page.getByTestId('timeline-pane')).toBeVisible();
    await expect(page.getByTestId('map-pane')).toBeVisible();

    const themeToggle = page.getByTestId('theme-toggle');
    await expect(themeToggle).toBeVisible();
    await themeToggle.click();
    await expect(themeToggle).toBeVisible();
  });

  test('command palette toggles with keyboard shortcut', async ({ page }) => {
    await page.keyboard.press('Control+K');
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toBeHidden();
  });
});
