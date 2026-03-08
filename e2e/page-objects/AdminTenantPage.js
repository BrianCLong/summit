"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminTenantPage = void 0;
const test_1 = require("@playwright/test");
const BasePage_1 = require("./BasePage");
class AdminTenantPage extends BasePage_1.BasePage {
    tenantList;
    createTenantButton;
    constructor(page) {
        super(page);
        this.tenantList = page.locator('[data-testid="tenant-list"]');
        this.createTenantButton = page.getByRole('button', { name: /create tenant/i });
    }
    async goto() {
        await super.goto('/admin');
    }
    async verifyTenantListVisible() {
        await (0, test_1.expect)(this.tenantList).toBeVisible();
    }
    async verifyAccessDenied() {
        await (0, test_1.expect)(this.page.locator('text=Access Denied')).toBeVisible();
    }
}
exports.AdminTenantPage = AdminTenantPage;
