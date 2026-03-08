"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgentSessionPage = void 0;
const test_1 = require("@playwright/test");
const base_page_1 = require("./base.page");
class AgentSessionPage extends base_page_1.BasePage {
    runInput;
    runButton;
    clearButton;
    runSummaryCard;
    tasksCard;
    outputsCard;
    constructor(page) {
        super(page);
        this.runInput = page.locator('textarea[placeholder*="Describe what you want Maestro to do"]');
        this.runButton = page.getByRole('button', { name: /Run with Maestro/i });
        this.clearButton = page.getByRole('button', { name: /Clear/i });
        this.runSummaryCard = page.locator('.card', { hasText: 'Run Summary' });
        this.tasksCard = page.locator('.card', { hasText: 'Tasks' });
        this.outputsCard = page.locator('.card', { hasText: 'Outputs' });
    }
    async navigate() {
        await this.goto('/maestro/runs');
    }
    async startSession(prompt) {
        await this.runInput.fill(prompt);
        await this.runButton.click();
    }
    async waitForRunCompletion() {
        // Wait for the button to go back to "Run with Maestro" from "Running..."
        await (0, test_1.expect)(this.runButton).toContainText('Run with Maestro', { timeout: 30000 });
    }
    async verifyTaskStatus(description, status) {
        const taskRow = this.tasksCard.locator('.p-4', { hasText: description });
        await (0, test_1.expect)(taskRow).toContainText(status);
    }
    async verifyOutputContains(text) {
        await (0, test_1.expect)(this.outputsCard).toContainText(text);
    }
    async verifyCostSummaryVisible() {
        await (0, test_1.expect)(this.runSummaryCard).toContainText('Estimated Cost');
        await (0, test_1.expect)(this.runSummaryCard).toContainText('Input tokens');
    }
}
exports.AgentSessionPage = AgentSessionPage;
