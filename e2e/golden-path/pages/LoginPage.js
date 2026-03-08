"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoginPage = void 0;
const test_1 = require("@playwright/test");
class LoginPage {
    page;
    constructor(page) {
        this.page = page;
    }
    async goto() {
        await this.page.goto('/login');
    }
    async bypassAuth() {
        await this.page.goto('/maestro/auth/callback?code=mock_code&state=mock_state');
        await (0, test_1.expect)(this.page.locator('#root')).toBeAttached();
    }
    async login(email, password) {
        await this.goto();
        const loginButton = this.page.getByRole('button', { name: /login|sign in/i });
        if (await loginButton.isVisible()) {
            await loginButton.click();
        }
    }
}
exports.LoginPage = LoginPage;
