import { type Page, type Locator, expect } from '@playwright/test';

export class GraphExplorerPage {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto() {
    await this.page.goto('/graph');
  }

  async verifyLoaded() {
    await expect(this.page).toHaveURL(/.*graph/);
  }
}
