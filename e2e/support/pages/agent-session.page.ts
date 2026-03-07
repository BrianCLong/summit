import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class AgentSessionPage extends BasePage {
  readonly runInput: Locator;
  readonly runButton: Locator;
  readonly clearButton: Locator;
  readonly runSummaryCard: Locator;
  readonly tasksCard: Locator;
  readonly outputsCard: Locator;

  constructor(page: Page) {
    super(page);
    this.runInput = page.locator('textarea[placeholder*="Describe what you want Maestro to do"]');
    this.runButton = page.getByRole("button", { name: /Run with Maestro/i });
    this.clearButton = page.getByRole("button", { name: /Clear/i });
    this.runSummaryCard = page.locator(".card", { hasText: "Run Summary" });
    this.tasksCard = page.locator(".card", { hasText: "Tasks" });
    this.outputsCard = page.locator(".card", { hasText: "Outputs" });
  }

  async navigate() {
    await this.goto("/maestro/runs");
  }

  async startSession(prompt: string) {
    await this.runInput.fill(prompt);
    await this.runButton.click();
  }

  async waitForRunCompletion() {
    // Wait for the button to go back to "Run with Maestro" from "Running..."
    await expect(this.runButton).toContainText("Run with Maestro", { timeout: 30000 });
  }

  async verifyTaskStatus(
    description: string,
    status: "Queued" | "Running" | "Succeeded" | "Failed"
  ) {
    const taskRow = this.tasksCard.locator(".p-4", { hasText: description });
    await expect(taskRow).toContainText(status);
  }

  async verifyOutputContains(text: string) {
    await expect(this.outputsCard).toContainText(text);
  }

  async verifyCostSummaryVisible() {
    await expect(this.runSummaryCard).toContainText("Estimated Cost");
    await expect(this.runSummaryCard).toContainText("Input tokens");
  }
}
