import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'

// Extend base test with our custom fixtures
export const test = base.extend<{
  authenticatedPage: Page
}>({
  authenticatedPage: async ({ page }, use) => {
    // In a real app, we would inject a token into localStorage or cookies here.
    // For now, we assume the dev environment might have a bypass or we simulate login.
    // Given the strictness, we'll implement a bypass if possible, or just visit logic.

    // Simulate setting a token
    await page.addInitScript(() => {
      window.localStorage.setItem('auth_token', 'mock-e2e-token')
      window.localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'e2e-user',
          name: 'E2E User',
          role: 'admin',
        })
      )
    })

    await use(page)
  },
})

export { expect }
