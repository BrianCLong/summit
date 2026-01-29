<<<<<<< HEAD
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
=======
import { Page, expect } from '@playwright/test';

export class LoginPage {
  constructor(private page: Page) {}

  async bypassAuth() {
    await this.page.goto('/maestro/auth/callback?code=mock_code&state=mock_state');
    await expect(this.page.locator('#root')).toBeAttached();
  }

  async login(email: string, password: string) {
    await this.page.goto('/login');
    // TODO: implement real login when needed
>>>>>>> 50f8d7925a (feat: add golden path E2E test harness for consolidated frontend)
  }
}
