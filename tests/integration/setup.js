"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect = exports.test = void 0;
const test_1 = require("@playwright/test");
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_1.expect; } });
exports.test = test_1.test.extend({
    authenticatedPage: async ({ page }, use) => {
        // Mock authentication by setting a token
        await page.addInitScript(() => {
            window.localStorage.setItem('auth_token', 'mock-token');
            window.localStorage.setItem('user', JSON.stringify({ id: 'test-user', tier: 'PRO' }));
        });
        await use(page);
    },
});
