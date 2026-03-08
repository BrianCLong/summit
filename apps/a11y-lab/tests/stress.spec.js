"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const playwright_1 = __importDefault(require("@axe-core/playwright"));
async function runAxe(page) {
    const builder = new playwright_1.default({ page }).withTags(['wcag2a', 'wcag2aa']);
    const results = await builder.analyze();
    const critical = results.violations.filter((v) => v.impact === 'critical');
    (0, test_1.expect)(critical, 'Critical accessibility regressions detected under stress mode').toHaveLength(0);
}
test_1.test.describe('Stress a11y modes', () => {
    (0, test_1.test)('handles text scaling', async ({ page, baseURL }) => {
        await page.goto(baseURL ?? 'http://localhost:3000');
        await page.addStyleTag({ content: 'html { font-size: 125%; }' });
        await runAxe(page);
    });
    (0, test_1.test)('handles RTL toggles', async ({ page, baseURL }) => {
        await page.goto(baseURL ?? 'http://localhost:3000');
        await page.evaluate(() => {
            document.documentElement.setAttribute('dir', 'rtl');
            document.body.setAttribute('dir', 'rtl');
        });
        await runAxe(page);
    });
});
