"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const playwright_1 = __importDefault(require("@axe-core/playwright"));
async function check(page, path) {
    await page.goto(path);
    const results = await new playwright_1.default({ page }).analyze();
    const serious = results.violations.filter((v) => ['serious', 'critical'].includes(v.impact || ''));
    (0, test_1.expect)(serious).toEqual([]);
}
(0, test_1.test)('a11y smoke: /dashboard, /graph, /investigations/inv1', async ({ page, }) => {
    await check(page, '/dashboard');
    await check(page, '/graph');
    await check(page, '/investigations/inv1');
});
