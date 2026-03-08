"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const targetUrl = process.env.A11Y_LAB_TARGET_URL || 'http://localhost:3000';
exports.default = (0, test_1.defineConfig)({
    testDir: './tests',
    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 1 : 0,
    reporter: [['list'], ['html', { open: 'never', outputFolder: 'artifacts/playwright-report' }]],
    use: {
        baseURL: targetUrl,
        trace: 'on-first-retry',
        video: 'off',
        screenshot: 'only-on-failure',
        colorScheme: 'light',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...test_1.devices['Desktop Chrome'] },
        },
    ],
    metadata: {
        targetUrl,
    },
});
