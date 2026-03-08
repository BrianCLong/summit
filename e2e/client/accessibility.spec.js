"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const playwright_1 = __importDefault(require("@axe-core/playwright")); // 1
test_1.test.describe('homepage accessibility and visual regression tests', () => {
    (0, test_1.test)('should not have any automatically detectable accessibility issues', async ({ page, }) => {
        await page.goto('/'); // Replace with your actual homepage URL
        const accessibilityScanResults = await new playwright_1.default({ page }).analyze(); // 2
        (0, test_1.expect)(accessibilityScanResults.violations).toEqual([]); // 3
    });
    (0, test_1.test)('should match the visual regression snapshot', async ({ page }) => {
        await page.goto('/'); // Replace with your actual homepage URL
        // Take a screenshot of the entire page
        await (0, test_1.expect)(page).toHaveScreenshot('homepage.png'); // 4
    });
});
