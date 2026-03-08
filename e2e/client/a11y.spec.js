"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const playwright_1 = __importDefault(require("@axe-core/playwright"));
test_1.test.describe('WCAG 2.1 AA - key routes', () => {
    const routes = ['/', '/dashboard', '/graph'];
    for (const path of routes) {
        (0, test_1.test)(`a11y scan ${path}`, async ({ page }) => {
            await page.goto(`http://localhost:${process.env.CLIENT_PORT || 3000}${path}`);
            const results = await new playwright_1.default({ page })
                .withTags(['wcag2a', 'wcag2aa'])
                .analyze();
            // Log violations for CI artifact without failing immediately
            if (results.violations.length) {
                console.log(`Accessibility issues on ${path}:`, JSON.stringify(results.violations, null, 2));
            }
            (0, test_1.expect)(results.violations).toEqual([]);
        });
    }
});
