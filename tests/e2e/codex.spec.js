"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)('drag entity into Codex and export HTML', async ({ page }) => {
    await page.goto('/case/CASE-1');
    await page.keyboard.press('KeyN'); // open Codex
    await page.dragAndDrop('[data-node-id="E-1"]', '[aria-label="Codex"]');
    await (0, test_1.expect)(page.locator('[data-test="codex-card"]').first()).toBeVisible();
    await page.click('button:has-text("Export HTML")');
    await (0, test_1.expect)(page.locator('[data-test="export-success"]')).toBeVisible();
});
