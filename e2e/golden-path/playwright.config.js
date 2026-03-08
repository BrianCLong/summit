"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
exports.default = (0, test_1.defineConfig)({
    testDir: './tests',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html', { outputFolder: '../../artifacts/e2e/playwright-report' }],
        ['list']
    ],
    outputDir: '../../artifacts/e2e/playwright-output',
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3000',
        trace: 'retain-on-failure',
        video: 'retain-on-failure',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...test_1.devices['Desktop Chrome'] },
        },
    ],
});
