"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZKDeconflictionPage = void 0;
const test_1 = require("@playwright/test");
const BasePage_1 = require("./BasePage");
class ZKDeconflictionPage extends BasePage_1.BasePage {
    initiateButton;
    intersectionResult;
    privacyBadge;
    constructor(page) {
        super(page);
        this.initiateButton = page.getByRole('button', { name: /start deconfliction|initiate zk/i });
        this.intersectionResult = page.locator('[data-testid="intersection-result"]');
        this.privacyBadge = page.getByText(/zero knowledge|private/i);
    }
    async goto() {
        await super.goto('/admin/consistency');
    }
    async initiateDeconfliction() {
        await this.initiateButton.click();
    }
    async verifyIntersectionResult() {
        await (0, test_1.expect)(this.intersectionResult).toBeVisible();
    }
    async verifyPrivacyPreserved() {
        await (0, test_1.expect)(this.privacyBadge).toBeVisible();
    }
}
exports.ZKDeconflictionPage = ZKDeconflictionPage;
