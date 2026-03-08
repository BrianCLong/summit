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
    async waitForUrl(urlPattern) {
        await this.page.waitForURL(urlPattern);
    }
    async click(selector) {
        await this.page.click(selector);
    }
    async fill(selector, value) {
        await this.page.fill(selector, value);
    }
    async waitForSelector(selector) {
        await this.page.waitForSelector(selector);
    }
    async getByText(text) {
        return this.page.getByText(text);
    }
    async getByRole(role, options) {
        return this.page.getByRole(role, options);
    }
    async expectTitle(title) {
        await (0, test_1.expect)(this.page).toHaveTitle(title);
    }
    async expectUrl(url) {
        await (0, test_1.expect)(this.page).toHaveURL(url);
    }
}
exports.BasePage = BasePage;
