"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardPage = void 0;
const test_1 = require("@playwright/test");
class DashboardPage {
    page;
    constructor(page) {
        this.page = page;
    }
    async goto() {
        await this.page.goto('/dashboard');
    }
    async isLoaded() {
        await (0, test_1.expect)(this.page).toHaveURL(/.*dashboard/);
        await (0, test_1.expect)(this.page.locator('#root')).toBeAttached();
    }
    async verifyLoaded() {
        await (0, test_1.expect)(this.page.getByText('Intelligence Command Center')).toBeVisible();
    }
    async navigateToInvestigations() {
        await this.page.click('text=Investigations');
    }
}
exports.DashboardPage = DashboardPage;
