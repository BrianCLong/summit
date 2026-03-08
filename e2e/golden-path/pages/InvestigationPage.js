"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InvestigationPage = void 0;
const test_1 = require("@playwright/test");
class InvestigationPage {
    page;
    constructor(page) {
        this.page = page;
    }
    async isLoaded() {
        await (0, test_1.expect)(this.page).toHaveURL(/.*investigation.*/);
    }
    async openInvestigation(name) {
        await this.page.click(`text=${name}`);
    }
    async verifyEntityVisible(name) {
        await (0, test_1.expect)(this.page.locator(`text=${name}`)).toBeVisible();
    }
    async switchToGraphView() {
        const graphTab = this.page.locator('button:has-text("Graph")');
        if (await graphTab.isVisible()) {
            await graphTab.click();
            // Verify canvas
            await (0, test_1.expect)(this.page.locator('canvas')).toBeVisible();
        }
        else {
            console.log("Graph tab not found, skipping graph verification");
        }
    }
}
exports.InvestigationPage = InvestigationPage;
