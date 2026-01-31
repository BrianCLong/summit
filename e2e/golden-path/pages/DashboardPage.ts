import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
  }

  async isLoaded() {
    await expect(this.page).toHaveURL(/.*dashboard/);
    await expect(this.page.locator('#root')).toBeAttached();
  }

  async verifyLoaded() {
    await expect(this.page.getByText('Intelligence Command Center')).toBeVisible();
  }

  async navigateToInvestigations() {
    await this.page.click('text=Investigations');
  }
}
