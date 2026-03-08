"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const generateGraph_1 = require("./utils/generateGraph");
const mapboxStub_1 = require("./utils/mapboxStub");
const harness_1 = require("./utils/harness");
test_1.test.describe('Cross-pane integration', () => {
    (0, test_1.test)('selection propagates to summary and map stub', async ({ page }) => {
        const graph = (0, generateGraph_1.generateGraphData)({ seed: 3, nodes: 4 });
        const mapState = (0, mapboxStub_1.createMapboxState)();
        await page.addInitScript(harness_1.applyTestHarness, graph, mapState);
        await page.goto('/');
        await page.waitForSelector('[data-testid="selection-summary"]');
        await page.evaluate(() => window.store.dispatch({
            type: 'selection/selectNode',
            payload: 'node-2',
        }));
        await (0, test_1.expect)(page.getByTestId('selected-node-label')).toContainText('node-2');
        const stubState = await page.evaluate(() => window.__MAPBOX_STATE__);
        (0, test_1.expect)(stubState?.focused).toBe('node-2');
        const markerCoords = (stubState?.markers)[0];
        (0, test_1.expect)(markerCoords).toEqual(graph.nodes[1].coords);
    });
    (0, test_1.test)('time range selection is reflected in the summary', async ({ page }) => {
        const graph = (0, generateGraph_1.generateGraphData)({ seed: 11, nodes: 3 });
        const mapState = (0, mapboxStub_1.createMapboxState)();
        await page.addInitScript(harness_1.applyTestHarness, graph, mapState);
        await page.goto('/');
        const [start, end] = [graph.nodes[0].timestamp, graph.nodes[2].timestamp];
        await page.evaluate(({ startTime, endTime }) => window.store.dispatch({
            type: 'selection/setTimeRange',
            payload: [startTime, endTime],
        }), { startTime: start, endTime: end });
        await (0, test_1.expect)(page.getByTestId('time-range-label')).toContainText(' - ');
        await (0, test_1.expect)(page.getByTestId('time-range-label')).toContainText('Mar');
    });
    (0, test_1.test)('selection made before graph data resolves still syncs to map', async ({ page, }) => {
        const graph = (0, generateGraph_1.generateGraphData)({ seed: 17, nodes: 3 });
        const mapState = (0, mapboxStub_1.createMapboxState)();
        await page.addInitScript(harness_1.applyTestHarness, graph, mapState);
        await page.goto('/');
        await page.evaluate(() => window.store.dispatch({
            type: 'selection/selectNode',
            payload: 'node-1',
        }));
        await (0, test_1.expect)(page.getByTestId('selected-node-label')).toContainText('node-1');
        await test_1.expect.poll(() => page.evaluate(() => window.__MAPBOX_STATE__)).toHaveProperty('focused', 'node-1');
        const coords = (await page.evaluate(() => window.__MAPBOX_STATE__?.markers));
        (0, test_1.expect)(coords?.[0]).toEqual(graph.nodes[0].coords);
    });
});
