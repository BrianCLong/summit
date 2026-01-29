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
  }
}
