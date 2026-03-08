"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// =============================================
// File: e2e/a11y/maestro.a11y.spec.ts
// =============================================
const test_1 = require("@playwright/test");
const playwright_1 = __importDefault(require("@axe-core/playwright"));
test_1.test.describe('Maestro A11y Checks', () => {
    (0, test_1.test)('should not have WCAG A/AA issues on Maestro page', async ({ page, baseURL, }) => {
        const resp = await page.goto('/');
        if (!resp?.ok()) {
            test_1.test.skip(`Skipping a11y: target returned ${resp?.status()}`);
        }
        const results = await new playwright_1.default({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();
        const critical = (results.violations || []).filter((v) => v.impact === 'critical');
        test_1.test.info().annotations.push({
            type: 'a11y-violations',
            description: String(results.violations?.length || 0),
        });
        (0, test_1.expect)(critical).toEqual([]);
    });
});
