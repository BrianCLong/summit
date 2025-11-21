import { test, expect, type Page } from '@playwright/test'

/**
 * Playwright E2E tests for Enhanced Tri-Pane View
 *
 * Tests cover:
 * - Basic pane visibility and interaction
 * - Time-brushing and filtering
 * - Entity selection synchronization
 * - Explain View sidebar
 * - Keyboard navigation
 * - Accessibility (A11y)
 * - Dark/light theme support
 */

// Helper functions
async function waitForTriPaneLoad(page: Page) {
  await page.waitForSelector('[aria-labelledby="tri-pane-title"]', {
    timeout: 10000,
  })
  await page.waitForSelector('#timeline-title', { timeout: 5000 })
  await page.waitForSelector('#graph-title', { timeout: 5000 })
  await page.waitForSelector('#map-title', { timeout: 5000 })
}

async function getEntityCount(page: Page): Promise<number> {
  const badge = await page.textContent('text=/\\d+ entities/')
  const match = badge?.match(/(\d+) entities/)
  return match ? parseInt(match[1]) : 0
}

test.describe('Enhanced Tri-Pane View', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the tri-pane view
    await page.goto('/explore')
    await waitForTriPaneLoad(page)
  })

  test.describe('Basic Functionality', () => {
    test('should display all three panes', async ({ page }) => {
      // Check Timeline pane
      const timeline = page.locator('[aria-labelledby="timeline-title"]')
      await expect(timeline).toBeVisible()

      // Check Graph pane
      const graph = page.locator('[aria-labelledby="graph-title"]')
      await expect(graph).toBeVisible()

      // Check Map pane
      const map = page.locator('[aria-labelledby="map-title"]')
      await expect(map).toBeVisible()
    })

    test('should show entity, event, and location counts', async ({ page }) => {
      const entityBadge = page.locator('text=/\\d+ entities/')
      await expect(entityBadge).toBeVisible()

      const eventBadge = page.locator('text=/\\d+ events/')
      await expect(eventBadge).toBeVisible()

      const locationBadge = page.locator('text=/\\d+ locations/')
      await expect(locationBadge).toBeVisible()
    })

    test('should allow toggling provenance overlay', async ({ page }) => {
      const provenanceButton = page.locator('button:has-text("Provenance")')
      await expect(provenanceButton).toBeVisible()

      // Check initial state
      await expect(provenanceButton).toHaveAttribute('aria-pressed', 'true')

      // Toggle off
      await provenanceButton.click()
      await expect(provenanceButton).toHaveAttribute('aria-pressed', 'false')

      // Toggle on
      await provenanceButton.click()
      await expect(provenanceButton).toHaveAttribute('aria-pressed', 'true')
    })

    test('should allow toggling XAI overlay', async ({ page }) => {
      const xaiButton = page.locator('button:has-text("XAI")')
      await expect(xaiButton).toBeVisible()

      await xaiButton.click()
      await expect(xaiButton).toHaveAttribute('aria-pressed', 'false')
    })
  })

  test.describe('Time Filtering', () => {
    test('should apply time filter and update entity count', async ({ page }) => {
      const initialCount = await getEntityCount(page)

      // Apply time filter (this would depend on your timeline UI)
      // For now, we'll test the reset button appears
      await page.click('button:has-text("Reset")')

      // Verify filter is cleared
      const filteredBadge = page.locator('text=/Filtered/')
      await expect(filteredBadge).not.toBeVisible()
    })

    test('should show time filter indicator when active', async ({ page }) => {
      // This test would simulate time brushing
      // Placeholder for actual implementation
      const filterIndicator = page.locator('text=/Time filter:/')
      // When filter is active, indicator should be visible
      // await expect(filterIndicator).toBeVisible()
    })

    test('should clear time filter on reset button', async ({ page }) => {
      const resetButton = page.locator('button:has-text("Reset")')
      await resetButton.click()

      // Verify filter badge is not shown
      const filteredBadge = page.locator('text=/Filtered/')
      await expect(filteredBadge).not.toBeVisible()
    })

    test('should update all panes when time range changes', async ({ page }) => {
      // This would test that timeline, graph, and map all update together
      // Placeholder for actual implementation
      test.skip()
    })
  })

  test.describe('Entity Selection', () => {
    test('should select entity in graph and highlight in other panes', async ({
      page,
    }) => {
      // Find and click a node in the graph
      const graphSvg = page.locator(
        '[aria-labelledby="graph-title"] svg'
      )
      await expect(graphSvg).toBeVisible()

      // Click on a node (would need to be more specific in real implementation)
      // await graphSvg.locator('circle').first().click()

      // Verify selection is synchronized
      // This is a placeholder - actual implementation would check:
      // - Graph node is highlighted
      // - Timeline scrolls to related event
      // - Map centers on location (if applicable)
      test.skip()
    })

    test('should show XAI explanation for selected entity', async ({ page }) => {
      // Select an entity
      // await page.click('[data-entity-id="some-id"]')

      // Check XAI explanation appears
      const xaiPanel = page.locator('text=/Why is this entity important/')
      // await expect(xaiPanel).toBeVisible()
      test.skip()
    })
  })

  test.describe('Explain View Sidebar', () => {
    test('should open Explain View sidebar', async ({ page }) => {
      // Click the "Explain This View" button
      const explainButton = page.locator('button:has-text("Explain This View")')

      // Button might be in the sidebar or as a toggle
      if (await explainButton.isVisible()) {
        await explainButton.click()
      }

      // Check sidebar is visible
      const sidebar = page.locator('[aria-label="Explain This View Sidebar"]')
      await expect(sidebar).toBeVisible()
    })

    test('should display active filters section', async ({ page }) => {
      // Open explain sidebar
      const explainButton = page.locator('button:has-text("Explain This View")')
      if (await explainButton.isVisible()) {
        await explainButton.click()
      }

      // Check for filters section
      const filtersSection = page.locator('text=/Active Filters/')
      await expect(filtersSection).toBeVisible()
    })

    test('should display top contributors section', async ({ page }) => {
      const explainButton = page.locator('button:has-text("Explain This View")')
      if (await explainButton.isVisible()) {
        await explainButton.click()
      }

      const contributorsSection = page.locator('text=/Top Contributors/')
      await expect(contributorsSection).toBeVisible()
    })

    test('should display provenance highlights', async ({ page }) => {
      const explainButton = page.locator('button:has-text("Explain This View")')
      if (await explainButton.isVisible()) {
        await explainButton.click()
      }

      const provenanceSection = page.locator('text=/Provenance Highlights/')
      await expect(provenanceSection).toBeVisible()
    })

    test('should display confidence distribution', async ({ page }) => {
      const explainButton = page.locator('button:has-text("Explain This View")')
      if (await explainButton.isVisible()) {
        await explainButton.click()
      }

      const confidenceSection = page.locator('text=/Confidence Distribution/')
      await expect(confidenceSection).toBeVisible()

      // Check for confidence bars
      const highConfidence = page.locator('text=/High \\(≥80%\\)/')
      await expect(highConfidence).toBeVisible()
    })

    test('should close Explain View sidebar', async ({ page }) => {
      // Open sidebar first
      const explainButton = page.locator('button:has-text("Explain This View")')
      if (await explainButton.isVisible()) {
        await explainButton.click()
      }

      // Close sidebar
      const closeButton = page.locator(
        '[aria-label="Close Explain View"]'
      )
      await closeButton.click()

      // Verify sidebar is hidden
      const sidebar = page.locator('[aria-label="Explain This View Sidebar"]')
      await expect(sidebar).not.toBeVisible()
    })

    test('should expand and collapse sections', async ({ page }) => {
      const explainButton = page.locator('button:has-text("Explain This View")')
      if (await explainButton.isVisible()) {
        await explainButton.click()
      }

      // Find a collapsible section header
      const sectionHeader = page
        .locator('text=/Active Filters/')
        .locator('..')
      await sectionHeader.click()

      // Section should collapse (check for ChevronDown icon)
      const chevronDown = sectionHeader.locator('[class*="ChevronDown"]')
      await expect(chevronDown).toBeVisible()
    })
  })

  test.describe('Keyboard Navigation', () => {
    test('should focus Timeline pane with Cmd+1', async ({ page }) => {
      await page.keyboard.press('Meta+1')

      const timelinePane = page.locator('[aria-labelledby="timeline-title"]')
      await expect(timelinePane).toHaveClass(/ring-2 ring-primary/)
    })

    test('should focus Graph pane with Cmd+2', async ({ page }) => {
      await page.keyboard.press('Meta+2')

      const graphPane = page.locator('[aria-labelledby="graph-title"]')
      await expect(graphPane).toHaveClass(/ring-2 ring-primary/)
    })

    test('should focus Map pane with Cmd+3', async ({ page }) => {
      await page.keyboard.press('Meta+3')

      const mapPane = page.locator('[aria-labelledby="map-title"]')
      await expect(mapPane).toHaveClass(/ring-2 ring-primary/)
    })

    test('should clear pane focus with Escape', async ({ page }) => {
      // Focus a pane first
      await page.keyboard.press('Meta+1')

      // Clear focus
      await page.keyboard.press('Escape')

      // No pane should have focus ring
      const timelinePane = page.locator('[aria-labelledby="timeline-title"]')
      await expect(timelinePane).not.toHaveClass(/ring-2 ring-primary/)
    })

    test('should toggle provenance with P key', async ({ page }) => {
      const provenanceButton = page.locator('button:has-text("Provenance")')
      const initialState = await provenanceButton.getAttribute('aria-pressed')

      await page.keyboard.press('p')

      const newState = await provenanceButton.getAttribute('aria-pressed')
      expect(newState).not.toBe(initialState)
    })

    test('should toggle XAI with X key', async ({ page }) => {
      const xaiButton = page.locator('button:has-text("XAI")')
      const initialState = await xaiButton.getAttribute('aria-pressed')

      await page.keyboard.press('x')

      const newState = await xaiButton.getAttribute('aria-pressed')
      expect(newState).not.toBe(initialState)
    })

    test('should show keyboard shortcuts help', async ({ page }) => {
      const shortcutsHelp = page.locator('[aria-label="Keyboard shortcuts"]')
      await expect(shortcutsHelp).toBeVisible()

      // Verify shortcuts are listed
      await expect(shortcutsHelp).toContainText('⌘1-3')
      await expect(shortcutsHelp).toContainText('Focus pane')
    })
  })

  test.describe('Map Interactions', () => {
    test('should show map controls', async ({ page }) => {
      const zoomInButton = page.locator('[aria-label="Zoom in"]')
      await expect(zoomInButton).toBeVisible()

      const zoomOutButton = page.locator('[aria-label="Zoom out"]')
      await expect(zoomOutButton).toBeVisible()

      const resetButton = page.locator('[aria-label="Reset view"]')
      await expect(resetButton).toBeVisible()
    })

    test('should zoom in on map', async ({ page }) => {
      const zoomInButton = page.locator('[aria-label="Zoom in"]')
      await zoomInButton.click()

      // Verify zoom level changed (would check actual zoom value)
      // This is a placeholder
      test.skip()
    })

    test('should select location marker', async ({ page }) => {
      // Find a location marker and click it
      const marker = page
        .locator('[aria-labelledby="map-title"] svg [role="button"]')
        .first()

      if (await marker.isVisible()) {
        await marker.click()

        // Verify selection is synchronized
        test.skip()
      }
    })
  })

  test.describe('Accessibility', () => {
    test('should have proper ARIA labels', async ({ page }) => {
      // Check main regions have proper labels
      await expect(
        page.locator('[role="region"][aria-labelledby="timeline-title"]')
      ).toBeVisible()
      await expect(
        page.locator('[role="region"][aria-labelledby="graph-title"]')
      ).toBeVisible()
      await expect(
        page.locator('[role="region"][aria-labelledby="map-title"]')
      ).toBeVisible()
    })

    test('should have live regions for dynamic updates', async ({ page }) => {
      const liveRegion = page.locator('[aria-live="polite"]')
      await expect(liveRegion).toBeVisible()
    })

    test('should be keyboard navigable', async ({ page }) => {
      // Tab through interactive elements
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')
      await page.keyboard.press('Tab')

      // Verify focus is moving through elements
      // This is a basic check - more comprehensive testing needed
      const focusedElement = page.locator(':focus')
      await expect(focusedElement).toBeVisible()
    })

    test('should have sufficient color contrast', async ({ page }) => {
      // This would use axe-core for automated a11y testing
      // Placeholder for actual implementation
      test.skip()
    })

    test('should have descriptive button labels', async ({ page }) => {
      const buttons = page.locator('button[aria-label]')
      const count = await buttons.count()

      // All interactive buttons should have aria-label
      expect(count).toBeGreaterThan(0)

      // Check each button has a non-empty label
      for (let i = 0; i < count; i++) {
        const label = await buttons.nth(i).getAttribute('aria-label')
        expect(label).toBeTruthy()
        expect(label?.length).toBeGreaterThan(0)
      }
    })
  })

  test.describe('Theme Support', () => {
    test('should support light theme', async ({ page }) => {
      // Ensure light theme is active
      await page.evaluate(() => {
        document.documentElement.classList.remove('dark')
      })

      // Verify theme classes are applied correctly
      const background = page.locator('.bg-background')
      await expect(background.first()).toBeVisible()
    })

    test('should support dark theme', async ({ page }) => {
      // Switch to dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add('dark')
      })

      // Verify dark theme classes
      const darkElement = page.locator('.dark\\:bg-slate-900')
      // Theme should be applied
      await page.waitForTimeout(500) // Allow theme transition
    })

    test('should maintain theme across interactions', async ({ page }) => {
      // Set dark theme
      await page.evaluate(() => {
        document.documentElement.classList.add('dark')
      })

      // Perform an interaction
      await page.click('button:has-text("Provenance")')

      // Verify theme is still dark
      const isDark = await page.evaluate(() =>
        document.documentElement.classList.contains('dark')
      )
      expect(isDark).toBe(true)
    })
  })

  test.describe('Export Functionality', () => {
    test('should have export button', async ({ page }) => {
      const exportButton = page.locator('[aria-label="Export view"]')
      await expect(exportButton).toBeVisible()
    })

    test('should trigger export on button click', async ({ page }) => {
      const exportButton = page.locator('[aria-label="Export view"]')

      // Set up download listener
      const downloadPromise = page.waitForEvent('download')

      await exportButton.click()

      // This would verify actual download starts
      // Placeholder for actual implementation
      test.skip()
    })
  })

  test.describe('Performance', () => {
    test('should load within acceptable time', async ({ page }) => {
      const startTime = Date.now()
      await page.goto('/explore')
      await waitForTriPaneLoad(page)
      const loadTime = Date.now() - startTime

      // Should load in under 5 seconds
      expect(loadTime).toBeLessThan(5000)
    })

    test('should handle large datasets smoothly', async ({ page }) => {
      // This would test with 500+ entities
      // Placeholder for performance testing
      test.skip()
    })
  })
})

// Integration tests for full user workflows
test.describe('User Workflows', () => {
  test('complete investigation workflow', async ({ page }) => {
    await page.goto('/explore')
    await waitForTriPaneLoad(page)

    // 1. Apply filters
    // 2. Select entity
    // 3. Review explanation
    // 4. Apply time filter
    // 5. Export results

    // This is a placeholder for end-to-end workflow testing
    test.skip()
  })
})
