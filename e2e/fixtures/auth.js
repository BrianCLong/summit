"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.expect = exports.test = exports.authFixtures = void 0;
const test_1 = require("@playwright/test");
Object.defineProperty(exports, "expect", { enumerable: true, get: function () { return test_1.expect; } });
exports.authFixtures = {
    login: async ({ page }, use) => {
        // Define the login logic
        const login = async () => {
            // Use the mock callback for faster and more reliable testing in dev/CI
            await page.goto('/maestro/auth/callback?code=mock_code&state=mock_state');
            // Wait for app to be ready
            await (0, test_1.expect)(page.locator('#root')).toBeAttached();
            // Ensure we are on a valid page (dashboard or similar)
            await (0, test_1.expect)(page).not.toHaveURL(/.*login/);
        };
        await use(login);
    },
};
exports.test = test_1.test.extend(exports.authFixtures);
