"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiAgentPage = void 0;
const test_1 = require("@playwright/test");
const base_page_1 = require("./base.page");
class MultiAgentPage extends base_page_1.BasePage {
    routingTab;
    webTab;
    budgetsTab;
    logsTab;
    constructor(page) {
        super(page);
        this.routingTab = page.getByRole('button', { name: 'Routing' });
        this.webTab = page.getByRole('button', { name: 'Web' });
        this.budgetsTab = page.getByRole('button', { name: 'Budgets' });
        this.logsTab = page.getByRole('button', { name: 'Logs' });
    }
    async navigate() {
        await this.goto('/maestro');
    }
    async selectTab(tab) {
        switch (tab) {
            case 'routing':
                await this.routingTab.click();
                break;
            case 'web':
                await this.webTab.click();
                break;
            case 'budgets':
                await this.budgetsTab.click();
                break;
            case 'logs':
                await this.logsTab.click();
                break;
        }
    }
    async verifyTabActive(tab) {
        let locator;
        switch (tab) {
            case 'routing':
                locator = this.routingTab;
                break;
            case 'web':
                locator = this.webTab;
                break;
            case 'budgets':
                locator = this.budgetsTab;
                break;
            case 'logs':
                locator = this.logsTab;
                break;
        }
        await (0, test_1.expect)(locator).toHaveClass(/tab-active/);
    }
}
exports.MultiAgentPage = MultiAgentPage;
