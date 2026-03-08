"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MultiAgentCoordinationPage = void 0;
const test_1 = require("@playwright/test");
const BasePage_1 = require("./BasePage");
class MultiAgentCoordinationPage extends BasePage_1.BasePage {
    coordinationStatus;
    agentList;
    conflictAlert;
    constructor(page) {
        super(page);
        this.coordinationStatus = page.locator('[data-testid="coordination-status"], .status-badge');
        this.agentList = page.locator('[data-testid="active-agents"], .agents-grid');
        this.conflictAlert = page.getByRole('alert');
    }
    async goto() {
        await super.goto('/analysis/narrative');
    }
    async verifyCoordinationStatus(status) {
        await (0, test_1.expect)(this.coordinationStatus).toContainText(status);
    }
    async getActiveAgentsCount() {
        return await this.agentList.locator('.agent-card').count();
    }
    async resolveConflict() {
        if (await this.conflictAlert.isVisible()) {
            await this.conflictAlert.getByRole('button', { name: /resolve|fix/i }).click();
        }
    }
}
exports.MultiAgentCoordinationPage = MultiAgentCoordinationPage;
