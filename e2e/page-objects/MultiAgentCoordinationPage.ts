import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class MultiAgentCoordinationPage extends BasePage {
  readonly coordinationStatus: Locator;
  readonly agentList: Locator;
  readonly conflictAlert: Locator;

  constructor(page: Page) {
    super(page);
    this.coordinationStatus = page.locator('[data-testid="coordination-status"], .status-badge');
    this.agentList = page.locator('[data-testid="active-agents"], .agents-grid');
    this.conflictAlert = page.getByRole("alert");
  }

  async goto() {
    await super.goto("/analysis/narrative");
  }

  async verifyCoordinationStatus(status: string) {
    await expect(this.coordinationStatus).toContainText(status);
  }

  async getActiveAgentsCount() {
    return await this.agentList.locator(".agent-card").count();
  }

  async resolveConflict() {
    if (await this.conflictAlert.isVisible()) {
      await this.conflictAlert.getByRole("button", { name: /resolve|fix/i }).click();
    }
  }
}
