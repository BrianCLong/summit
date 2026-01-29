<<<<<<< HEAD
import { type Page, type Locator, expect } from '@playwright/test';

export class DashboardPage {
  readonly page: Page;
  readonly header: Locator;

  constructor(page: Page) {
    this.page = page;
    // Matching the text from App.router.jsx
    this.header = page.getByText('Intelligence Command Center');
  }

  async goto() {
    await this.page.goto('/dashboard');
  }

  async verifyLoaded() {
    await expect(this.header).toBeVisible();
=======
import { Page, expect } from '@playwright/test';

export class DashboardPage {
  constructor(private page: Page) {}

  async isLoaded() {
    await expect(this.page).toHaveURL(/.*dashboard/);
    await expect(this.page.locator('#root')).toBeAttached();
  }

  async navigateToInvestigations() {
    await this.page.click('text=Investigations');
>>>>>>> 50f8d7925a (feat: add golden path E2E test harness for consolidated frontend)
  }
}
