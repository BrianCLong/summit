"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
exports.default = (0, test_1.defineConfig)({
    testDir: './tests',
    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:4173',
        trace: 'retain-on-failure',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure'
    },
    webServer: {
        command: 'pnpm --filter tri-pane dev -- --host 0.0.0.0 --port 4173',
        port: 4173,
        reuseExistingServer: true,
        timeout: 120_000
    }
});
