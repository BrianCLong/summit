"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GraphExplorerPage = void 0;
const test_1 = require("@playwright/test");
class GraphExplorerPage {
    page;
    constructor(page) {
        this.page = page;
    }
    async goto() {
        await this.page.goto('/graph');
    }
    async verifyLoaded() {
        await (0, test_1.expect)(this.page).toHaveURL(/.*graph/);
    }
}
exports.GraphExplorerPage = GraphExplorerPage;
