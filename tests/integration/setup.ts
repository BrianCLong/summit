import { test as base, expect } from '@playwright/test';

// Define custom fixtures if needed
type MyFixtures = {
  authenticatedPage: any;
};

export const test = base.extend<MyFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Mock authentication by setting a token
    await page.addInitScript(() => {
        window.localStorage.setItem('auth_token', 'mock-token');
        window.localStorage.setItem('user', JSON.stringify({ id: 'test-user', tier: 'PRO' }));
    });
    await use(page);
  },
});

export { expect };
