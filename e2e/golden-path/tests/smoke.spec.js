"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
test_1.test.describe('golden-path: smoke', () => {
    // Kill switch: skip if not enabled
    test_1.test.skip(process.env.GOLDEN_PATH_E2E_ENABLED !== '1', 'GOLDEN_PATH_E2E_ENABLED!=1');
    (0, test_1.test)('loads consolidated frontend home', async ({ page }) => {
        const baseURL = process.env.BASE_URL || 'http://localhost:3000';
        console.log(`Navigating to ${baseURL}`);
        await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
        // Check for title or root element
        const title = await page.title();
        console.log(`Page title: ${title}`);
        (0, test_1.expect)(title).toBeTruthy();
        // Verify root element is attached (React usually mounts here)
        await (0, test_1.expect)(page.locator('#root')).toBeAttached();
    });
});
