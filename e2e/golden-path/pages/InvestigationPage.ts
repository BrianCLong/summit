import { Page, expect } from '@playwright/test';

export class InvestigationPage {
  constructor(private page: Page) {}

  async isLoaded() {
    await expect(this.page).toHaveURL(/.*investigation.*/);
  }

  async openInvestigation(name: string) {
    await this.page.click(`text=${name}`);
  }

  async verifyEntityVisible(name: string) {
    await expect(this.page.locator(`text=${name}`)).toBeVisible();
  }

  async switchToGraphView() {
    const graphTab = this.page.locator('button:has-text("Graph")');
    if (await graphTab.isVisible()) {
      await graphTab.click();
      // Verify canvas
      await expect(this.page.locator('canvas')).toBeVisible();
    } else {
        console.log("Graph tab not found, skipping graph verification");
    }
  }
}
