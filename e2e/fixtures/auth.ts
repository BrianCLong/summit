import { test as base, expect } from '@playwright/test';

export type AuthFixtures = {
  login: () => Promise<void>;
  loginAsAnalyst: () => Promise<void>;
};

export const authFixtures = {
  login: async ({ page }, use) => {
    const login = async () => {
      await page.goto('/maestro/auth/callback?code=mock_code&state=mock_state');
      await expect(page.locator('#root')).toBeAttached();
      await expect(page).not.toHaveURL(/.*login/);
    };
    await use(login);
  },
  loginAsAnalyst: async ({ page }, use) => {
    const loginAsAnalyst = async () => {
        await page.goto('/maestro/auth/callback?code=mock_code&state=mock_state');
        await expect(page.locator('#root')).toBeAttached();
        await expect(page).not.toHaveURL(/.*login/);
    };
    await use(loginAsAnalyst);
  }
};

export const test = base.extend<AuthFixtures>(authFixtures);

export { expect };
