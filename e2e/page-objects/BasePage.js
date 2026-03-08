"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePage = void 0;
const test_1 = require("@playwright/test");
class BasePage {
    page;
    constructor(page) {
        this.page = page;
    }
    async goto(path) {
        await this.page.goto(path);
    }
    async waitForUrl(url) {
        await this.page.waitForURL(url);
    }
    async takeScreenshot(name) {
        await (0, test_1.expect)(this.page).toHaveScreenshot(`${name}.png`);
    }
    /**
     * Checks accessibility violations using axe-core (requires @axe-core/playwright)
     */
    async checkAccessibility() {
        try {
            // Placeholder: Requires @axe-core/playwright to be installed
            // import { injectAxe, checkA11y } from 'axe-playwright';
            // await injectAxe(this.page);
            // await checkA11y(this.page);
            console.warn('Accessibility check skipped: axe-playwright integration pending package installation.');
        }
        catch (e) {
            console.error('Accessibility check failed:', e);
        }
    }
}
exports.BasePage = BasePage;
