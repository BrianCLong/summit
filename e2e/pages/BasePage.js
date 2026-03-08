"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BasePage = void 0;
class BasePage {
    page;
    url;
    constructor(page, url = '/') {
        this.page = page;
        this.url = url;
    }
    async goto() {
        await this.page.goto(this.url);
    }
    async waitForUrl() {
        await this.page.waitForURL(this.url);
    }
    async getTitle() {
        return this.page.title();
    }
}
exports.BasePage = BasePage;
