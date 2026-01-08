import { Page, Locator, expect } from "@playwright/test";
import { BasePage } from "./base.page";

export class MultiAgentPage extends BasePage {
  readonly routingTab: Locator;
  readonly webTab: Locator;
  readonly budgetsTab: Locator;
  readonly logsTab: Locator;

  constructor(page: Page) {
    super(page);
    this.routingTab = page.getByRole("button", { name: "Routing" });
    this.webTab = page.getByRole("button", { name: "Web" });
    this.budgetsTab = page.getByRole("button", { name: "Budgets" });
    this.logsTab = page.getByRole("button", { name: "Logs" });
  }

  async navigate() {
    await this.goto("/maestro");
  }

  async selectTab(tab: "routing" | "web" | "budgets" | "logs") {
    switch (tab) {
      case "routing":
        await this.routingTab.click();
        break;
      case "web":
        await this.webTab.click();
        break;
      case "budgets":
        await this.budgetsTab.click();
        break;
      case "logs":
        await this.logsTab.click();
        break;
    }
  }

  async verifyTabActive(tab: "routing" | "web" | "budgets" | "logs") {
    let locator;
    switch (tab) {
      case "routing":
        locator = this.routingTab;
        break;
      case "web":
        locator = this.webTab;
        break;
      case "budgets":
        locator = this.budgetsTab;
        break;
      case "logs":
        locator = this.logsTab;
        break;
    }
    await expect(locator).toHaveClass(/tab-active/);
  }
}
