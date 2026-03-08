"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const pages = [
    '/',
    '/reference/',
    '/tutorials/first-ingest',
    '/how-to/zip-export',
];
for (const p of pages) {
    (0, test_1.test)(`navigates ${p}`, async ({ page }) => {
        await page.goto(process.env.BASE_URL || 'http://localhost:3000' + p);
        await (0, test_1.expect)(page).toHaveTitle(/IntelGraph/);
        const links = await page.locator('a').all();
        (0, test_1.expect)(links.length).toBeGreaterThan(10);
    });
}
