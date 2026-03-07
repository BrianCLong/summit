import { type Page, type Locator, expect } from "@playwright/test";
import { BasePage } from "./BasePage";

export class AgentSessionPage extends BasePage {
  readonly createSessionButton: Locator;
  readonly sessionList: Locator;
  readonly taskInput: Locator;
  readonly executeButton: Locator;
  readonly resultArea: Locator;
  readonly feedbackInput: Locator;
  readonly submitFeedbackButton: Locator;
  readonly createPRButton: Locator;

  constructor(page: Page) {
    super(page);
    // Using loose selectors that are likely to exist or be easily added
    this.createSessionButton = page.getByRole("button", { name: /new session|create session/i });
    this.sessionList = page.locator('[data-testid="session-list"], .session-list');
    this.taskInput = page.getByRole("textbox", { name: /task|prompt/i });
    this.executeButton = page.getByRole("button", { name: /execute|run/i });
    this.resultArea = page.locator('[data-testid="result-area"], .results');
    this.feedbackInput = page.getByRole("textbox", { name: /feedback/i });
    this.submitFeedbackButton = page.getByRole("button", { name: /submit/i });
    this.createPRButton = page.getByRole("button", { name: /create pr|pull request/i });
  }

  async goto() {
    await super.goto("/dashboards/command-center");
  }

  async createSession() {
    await this.createSessionButton.click();
  }

  async executeTask(description: string) {
    await this.taskInput.fill(description);
    await this.executeButton.click();
  }

  async getResultText() {
    return await this.resultArea.textContent();
  }

  async provideFeedback(feedback: string) {
    await this.feedbackInput.fill(feedback);
    await this.submitFeedbackButton.click();
  }

  async createPRFromSession() {
    await this.createPRButton.click();
  }
}
