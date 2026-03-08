"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
exports.default = (0, test_1.defineConfig)({
    testDir: '.',
    timeout: 60_000,
    use: {
        baseURL: 'http://localhost:8080',
        headless: true,
    },
});
