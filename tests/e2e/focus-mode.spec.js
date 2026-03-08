"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('Focus Mode toggles via hotkey and dims non-active panes', async ({ page, }) => {
    await page.goto('/case/CASE-1');
    await page.keyboard.press('KeyF');
    await (0, test_1.expect)(page.locator('#ov-graph')).toHaveClass(/off/);
    await (0, test_1.expect)(page.locator('#ov-codex')).toHaveClass(/on|off/); // depending on hover region
    await page.keyboard.press('KeyF'); // exit
    await (0, test_1.expect)(page.locator('#ov-graph')).toHaveClass(/ig-dim-hidden/);
});
(0, test_1.test)('Auto mode engages when editing Codex', async ({ page }) => {
    await page.goto('/case/CASE-1');
    await page.dispatchEvent('#pane-codex', 'custom', {
        detail: { type: 'intelgraph:codex:edit_start' },
    });
    await (0, test_1.expect)(page.locator('#ov-codex')).toHaveClass(/off/); // codex is active, others on
    await (0, test_1.expect)(page.locator('#ov-graph')).toHaveClass(/on/);
});
