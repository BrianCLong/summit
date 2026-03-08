"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
(0, test_1.test)("home loads", async ({ page }) => {
    await page.goto("/");
    await (0, test_1.expect)(page).toHaveTitle(/Topicality/i);
});
(0, test_1.test)("summit loads", async ({ page }) => {
    await page.goto("/summit");
    await (0, test_1.expect)(page.locator("text=Summit")).toBeVisible();
});
