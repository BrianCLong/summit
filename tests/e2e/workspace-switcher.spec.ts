import { expect, test } from '@playwright/test'

test.describe('Workspace switcher', () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      window.localStorage.setItem('feature.ui.workspaces', 'true')
      window.localStorage.setItem('auth_token', 'test-token')

      const originalFetch = window.fetch
      window.fetch = (input, init) => {
        if (typeof input === 'string' && input.includes('/users/me')) {
          return Promise.resolve(
            new Response(
              JSON.stringify({
                id: 'playwright-user',
                name: 'Playwright User',
                role: 'analyst',
                permissions: [],
              }),
              {
                status: 200,
                headers: {
                  'Content-Type': 'application/json',
                },
              }
            )
          )
        }
        return originalFetch(input, init)
      }
    })
  })

  test('switching workspaces persists layout after reload', async ({ page }) => {
    await page.goto('/analysis/tri-pane')

    await page.waitForSelector('[data-testid="workspace-pill"]')
    await page.getByTestId('workspace-pill').click()
    await page.getByRole('menuitem', { name: /Briefing/ }).click()

    const mapPanel = page.locator('[data-workspace-panel="map"]')
    await expect(mapPanel).toHaveAttribute('data-visible', 'false')

    await page.reload()

    await expect(page.getByTestId('workspace-pill')).toContainText('Briefing')
    await expect(mapPanel).toHaveAttribute('data-visible', 'false')
  })
})
