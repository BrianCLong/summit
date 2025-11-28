import { test, expect } from '@playwright/test';
import { generateGraphData } from './utils/generateGraph';
import { createMapboxState } from './utils/mapboxStub';
import { applyTestHarness } from './utils/harness';

test.describe('Cross-pane integration', () => {
  test('selection propagates to summary and map stub', async ({ page }) => {
    const graph = generateGraphData({ seed: 3, nodes: 4 });
    const mapState = createMapboxState();
    await page.addInitScript(applyTestHarness, graph, mapState);
    await page.goto('/');

    await page.waitForSelector('[data-testid="selection-summary"]');
    await page.evaluate(() =>
      (window as any).store.dispatch({
        type: 'selection/selectNode',
        payload: 'node-2',
      }),
    );

    await expect(page.getByTestId('selected-node-label')).toContainText('node-2');
    const stubState = await page.evaluate(() => window.__MAPBOX_STATE__);
    expect(stubState?.focused).toBe('node-2');
    const markerCoords = (stubState?.markers as [number, number][])[0];
    expect(markerCoords).toEqual(graph.nodes[1].coords);
  });

  test('time range selection is reflected in the summary', async ({ page }) => {
    const graph = generateGraphData({ seed: 11, nodes: 3 });
    const mapState = createMapboxState();
    await page.addInitScript(applyTestHarness, graph, mapState);
    await page.goto('/');

    const [start, end] = [graph.nodes[0].timestamp, graph.nodes[2].timestamp];
    await page.evaluate(
      ({ startTime, endTime }) =>
        (window as any).store.dispatch({
          type: 'selection/setTimeRange',
          payload: [startTime, endTime],
        }),
      { startTime: start, endTime: end },
    );

    await expect(page.getByTestId('time-range-label')).toContainText(' - ');
    await expect(page.getByTestId('time-range-label')).toContainText('Mar');
  });

  test('selection made before graph data resolves still syncs to map', async ({
    page,
  }) => {
    const graph = generateGraphData({ seed: 17, nodes: 3 });
    const mapState = createMapboxState();
    await page.addInitScript(applyTestHarness, graph, mapState);
    await page.goto('/');

    await page.evaluate(() =>
      (window as any).store.dispatch({
        type: 'selection/selectNode',
        payload: 'node-1',
      }),
    );

    await expect(page.getByTestId('selected-node-label')).toContainText(
      'node-1',
    );
    await expect.poll(() => page.evaluate(() => window.__MAPBOX_STATE__)).toHaveProperty(
      'focused',
      'node-1',
    );
    const coords = (await page.evaluate(
      () => window.__MAPBOX_STATE__?.markers,
    )) as [number, number][];
    expect(coords?.[0]).toEqual(graph.nodes[0].coords);
  });
});
