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
  }
}
