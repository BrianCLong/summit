import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/login');
  }

  async bypassAuth() {
    await this.page.goto('/maestro/auth/callback?code=mock_code&state=mock_state');
    await expect(this.page.locator('#root')).toBeAttached();
  }

  async login(email?: string, password?: string) {
    await this.goto();
    const loginButton = this.page.getByRole('button', { name: /login|sign in/i });
    if (await loginButton.isVisible()) {
      await loginButton.click();
    }
  }
}
