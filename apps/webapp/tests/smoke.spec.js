"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const generateGraph_1 = require("./utils/generateGraph");
const mapboxStub_1 = require("./utils/mapboxStub");
const harness_1 = require("./utils/harness");
const BOOTSTRAP = async (page) => {
    const graph = (0, generateGraph_1.generateGraphData)({ seed: 7, nodes: 5 });
    const mapState = (0, mapboxStub_1.createMapboxState)();
    await page.addInitScript(harness_1.applyTestHarness, graph, mapState);
};
test_1.test.describe('Webapp smoke', () => {
    test_1.test.beforeEach(async ({ page }) => {
        await BOOTSTRAP(page);
        await page.goto('/');
    });
    (0, test_1.test)('loads the tri-pane layout and theme toggle', async ({ page }) => {
        await (0, test_1.expect)(page.getByTestId('graph-pane')).toBeVisible();
        await (0, test_1.expect)(page.getByTestId('timeline-pane')).toBeVisible();
        await (0, test_1.expect)(page.getByTestId('map-pane')).toBeVisible();
        const themeToggle = page.getByTestId('theme-toggle');
        await (0, test_1.expect)(themeToggle).toBeVisible();
        await themeToggle.click();
        await (0, test_1.expect)(themeToggle).toBeVisible();
    });
    (0, test_1.test)('command palette toggles with keyboard shortcut', async ({ page }) => {
        await page.keyboard.press('Control+K');
        await (0, test_1.expect)(page.getByRole('dialog')).toBeVisible();
        await page.keyboard.press('Escape');
        await (0, test_1.expect)(page.getByRole('dialog')).toBeHidden();
    });
});
