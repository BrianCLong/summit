import { test, expect } from '@playwright/test'

test.describe('Review Queue', () => {
  test('filter -> open item -> approve -> disappears from open list', async ({ page }) => {
    await page.goto('/review-queue')

    await page.selectOption('#filter-type', 'evidence')

    const target = page.getByText('Evidence snippet: anomalous fund transfer')
    await expect(target).toBeVisible()
    await target.click()

    await page.getByRole('button', { name: /approve/i }).click()

    await expect(
      page.getByText('Evidence snippet: anomalous fund transfer')
    ).not.toBeVisible()
  })
})
