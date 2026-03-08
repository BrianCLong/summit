"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('load graph and select node', async ({ page }) => {
    await page.goto('http://localhost:5173/');
    await (0, test_1.expect)(page.getByLabel('toggle theme')).toBeVisible();
    // dispatch selection via exposed store
    await page.evaluate(() => {
        window.store.dispatch({
            type: 'selection/selectNode',
            payload: 'a',
        });
    });
    const selected = await page.evaluate(() => window.store.getState().selection.selectedNodeId);
    (0, test_1.expect)(selected).toBe('a');
});
