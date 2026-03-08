"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// conductor-ui/frontend/tests/e2e/accessibility.spec.ts
const test_1 = require("@playwright/test");
const playwright_1 = __importDefault(require("@axe-core/playwright"));
test_1.test.describe('Accessibility', () => {
    (0, test_1.test)('should not have any automatically detectable accessibility issues on the main pages', async ({ page, }) => {
        await page.goto('/');
        const accessibilityScanResults = await new playwright_1.default({ page }).analyze();
        (0, test_1.expect)(accessibilityScanResults.violations).toEqual([]);
        await page.goto('/incidents/1'); // Example incident page
        const incidentPageScanResults = await new playwright_1.default({ page }).analyze();
        (0, test_1.expect)(incidentPageScanResults.violations).toEqual([]);
    });
});
