import { type Page, type Locator, expect } from '@playwright/test';

export class LoginPage {
  readonly page: Page;
  readonly loginButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.loginButton = page.getByRole('button', { name: /login|sign in/i });
  }

  async goto() {
    await this.page.goto('/login');
  }

  async login() {
    // TODO: Implement actual login logic
    if (await this.loginButton.isVisible()) {
      await this.loginButton.click();
    }
  }
}
