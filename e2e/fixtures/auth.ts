import { test as base, expect } from "@playwright/test";

export type AuthFixtures = {
  login: () => Promise<void>;
};

export const authFixtures = {
  login: async ({ page }, use) => {
    // Define the login logic
    const login = async () => {
      // Use the mock callback for faster and more reliable testing in dev/CI
      await page.goto("/maestro/auth/callback?code=mock_code&state=mock_state");
      // Wait for app to be ready
      await expect(page.locator("#root")).toBeAttached();
      // Ensure we are on a valid page (dashboard or similar)
      await expect(page).not.toHaveURL(/.*login/);
    };

    await use(login);
  },
};

export const test = base.extend<AuthFixtures>(authFixtures);

export { expect };
