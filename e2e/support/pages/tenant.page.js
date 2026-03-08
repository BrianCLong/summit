"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TenantPage = void 0;
const test_1 = require("@playwright/test");
const base_page_1 = require("./base.page");
class TenantPage extends base_page_1.BasePage {
    tenantDropdown;
    constructor(page) {
        super(page);
        this.tenantDropdown = page.locator('[data-testid="tenant-dropdown"]');
    }
    async navigate() {
        await this.goto('/admin');
    }
    async switchTenant(tenantName) {
        // Assuming there is a mechanism to switch tenants
        // This is a placeholder as I don't see the AdminPage implementation detail
        // But following the requirements, I need to test tenant isolation.
        // Isolation is usually tested by logging in as different users or switching context.
    }
    async verifyAccessDenied() {
        await (0, test_1.expect)(this.page.getByText(/Access Denied/i)).toBeVisible();
    }
}
exports.TenantPage = TenantPage;
