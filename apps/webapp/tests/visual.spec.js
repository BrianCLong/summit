"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const test_1 = require("@playwright/test");
const generateGraph_1 = require("./utils/generateGraph");
const mapboxStub_1 = require("./utils/mapboxStub");
const harness_1 = require("./utils/harness");
(0, test_1.test)('dashboard visual regression', async ({ page }) => {
    const graph = (0, generateGraph_1.generateGraphData)({ seed: 21, nodes: 5 });
    const mapState = (0, mapboxStub_1.createMapboxState)();
    await page.addInitScript(harness_1.applyTestHarness, graph, mapState);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/');
    await page.waitForSelector('[data-testid="graph-pane"]');
    await page.evaluate(() => window.store.dispatch({
        type: 'selection/selectNode',
        payload: 'node-3',
    }));
    const snapshotName = 'webapp-dashboard.png';
    const snapshotPath = test_1.test.info().snapshotPath(snapshotName);
    if (!node_fs_1.default.existsSync(snapshotPath)) {
        const image = await page.screenshot({ fullPage: true });
        node_fs_1.default.mkdirSync(node_path_1.default.dirname(snapshotPath), { recursive: true });
        node_fs_1.default.writeFileSync(snapshotPath, image);
    }
    await (0, test_1.expect)(page).toHaveScreenshot(snapshotName, {
        fullPage: true,
    });
});
