import { test, expect } from '@playwright/test'

test.describe('Tri-Pane Analysis View', () => {
  test('should render all three panes and the explain sidebar', async ({ page }) => {
    // 1. Navigate to Tri-Pane page
    await page.goto('/tri-pane')

    // 2. Verify panes are visible
    await expect(page.getByText('Timeline', { exact: false })).toBeVisible() // 'Timeline' or 'Timeline Filtered'
    await expect(page.getByText('Entity Graph')).toBeVisible()
    await expect(page.getByText('Geographic View')).toBeVisible()

    // 3. Click Explain View button
    const explainButton = page.getByRole('button', { name: 'Explain View' })
    await expect(explainButton).toBeVisible()
    await explainButton.click()

    // 4. Verify Sidebar appears
    await expect(page.getByText('Explain This View')).toBeVisible()

    // 5. Verify Sections
    await expect(page.getByText('Active Filters')).toBeVisible()
    await expect(page.getByText('Key Assumptions')).toBeVisible()
    await expect(page.getByText('Top Contributors')).toBeVisible()
    await expect(page.getByText('Provenance', { exact: true })).toBeVisible()

    // 6. Verify Data content (Mock data)
    await expect(page.getByText('Linked entities via shared IP address')).toBeVisible()
    await expect(page.getByText('Trusted Sources')).toBeVisible()

    // 7. Close Sidebar
    await explainButton.click()
    await expect(page.getByText('Explain This View')).not.toBeVisible()
  })
})
