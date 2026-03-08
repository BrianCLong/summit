"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
exports.default = (0, test_1.defineConfig)({
    testDir: "tests/e2e",
    use: { baseURL: "http://localhost:3000" },
    webServer: {
        command: "pnpm dev",
        url: "http://localhost:3000",
        reuseExistingServer: true,
        timeout: 60000
    }
});
