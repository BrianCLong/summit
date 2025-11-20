/**
 * Visual Regression Testing Suite
 *
 * Uses Playwright's screenshot comparison to detect visual regressions
 * across critical UI components and user journeys.
 *
 * Screenshots are stored in tests/e2e/__screenshots__/ and compared
 * against baseline images to detect unexpected UI changes.
 */

import { test, expect, Page } from '@playwright/test';
import {
  dashboardFixtures,
  investigationFixtures,
  graphFixtures,
  copilotFixtures,
} from './fixtures';

/**
 * Configuration for visual regression tests
 */
const VISUAL_CONFIG = {
  // Threshold for pixel differences (0-1, where 1 = 100% different)
  threshold: 0.2,

  // Max difference in pixels
  maxDiffPixels: 100,

  // Max difference percentage
  maxDiffPixelRatio: 0.01,

  // Screenshot options
  screenshotOptions: {
    animations: 'disabled' as const,
    mask: [] as any[],
    fullPage: false,
  },
};

/**
 * Helper to take a screenshot with consistent settings
 */
async function takeScreenshot(
  page: Page,
  name: string,
  options?: {
    fullPage?: boolean;
    mask?: string[];
  },
) {
  const maskSelectors = options?.mask || [];

  // Hide dynamic elements that change on every render
  const dynamicSelectors = [
    '[data-testid*="timestamp"]',
    '[data-testid*="time"]',
    '[data-testid*="date"]',
    '[data-testid*="clock"]',
    ...maskSelectors,
  ];

  const mask = await Promise.all(
    dynamicSelectors.map((selector) =>
      page.locator(selector).all().catch(() => []),
    ),
  ).then((results) => results.flat());

  await expect(page).toHaveScreenshot(`${name}.png`, {
    ...VISUAL_CONFIG.screenshotOptions,
    fullPage: options?.fullPage || false,
    mask,
    threshold: VISUAL_CONFIG.threshold,
    maxDiffPixels: VISUAL_CONFIG.maxDiffPixels,
    maxDiffPixelRatio: VISUAL_CONFIG.maxDiffPixelRatio,
  });
}

test.describe('Visual Regression - Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test('dashboard overview', async ({ page }) => {
    await takeScreenshot(page, 'dashboard-overview', {
      fullPage: true,
      mask: ['[data-testid="activity-widget"]'], // Mask dynamic activity feed
    });
  });

  test('dashboard widgets collapsed', async ({ page }) => {
    // Collapse all widgets if possible
    const collapseButtons = page.locator('[data-testid*="collapse"]');
    const count = await collapseButtons.count();

    for (let i = 0; i < count; i++) {
      await collapseButtons.nth(i).click();
      await page.waitForTimeout(300);
    }

    await takeScreenshot(page, 'dashboard-widgets-collapsed');
  });

  test('dashboard mobile view', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'dashboard-mobile', {
      fullPage: true,
    });
  });

  test('dashboard tablet view', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'dashboard-tablet', {
      fullPage: true,
    });
  });
});

test.describe('Visual Regression - Investigation Graph', () => {
  test.beforeEach(async ({ page }) => {
    await investigationFixtures.goToInvestigation(
      page,
      investigationFixtures.demoInvestigation.id,
    );
    await page.waitForLoadState('networkidle');
  });

  test('graph default layout', async ({ page }) => {
    await takeScreenshot(page, 'investigation-graph-default');
  });

  test('graph force layout', async ({ page }) => {
    await graphFixtures.changeLayout(page, 'force');
    await takeScreenshot(page, 'investigation-graph-force');
  });

  test('graph hierarchical layout', async ({ page }) => {
    await graphFixtures.changeLayout(page, 'hierarchical');
    await takeScreenshot(page, 'investigation-graph-hierarchical');
  });

  test('graph circular layout', async ({ page }) => {
    await graphFixtures.changeLayout(page, 'circular');
    await takeScreenshot(page, 'investigation-graph-circular');
  });

  test('graph with entity selected', async ({ page }) => {
    await page.click('[data-testid="entity-alice-001"]');
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'investigation-graph-entity-selected');
  });

  test('graph with relationship highlighted', async ({ page }) => {
    await page.click('[data-testid*="relationship-"]');
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'investigation-graph-relationship-highlighted');
  });

  test('graph zoomed in', async ({ page }) => {
    await graphFixtures.zoom(page, 'in');
    await graphFixtures.zoom(page, 'in');
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'investigation-graph-zoomed-in');
  });

  test('graph with filter applied', async ({ page }) => {
    await graphFixtures.filterByType(page, 'Person');
    await page.waitForTimeout(500);

    await takeScreenshot(page, 'investigation-graph-filtered');
  });
});

test.describe('Visual Regression - Copilot Panel', () => {
  test.beforeEach(async ({ page }) => {
    await investigationFixtures.goToInvestigation(
      page,
      investigationFixtures.demoInvestigation.id,
    );
    await copilotFixtures.openCopilot(page);
    await page.waitForLoadState('networkidle');
  });

  test('copilot panel opened', async ({ page }) => {
    await takeScreenshot(page, 'copilot-panel-opened');
  });

  test('copilot with response', async ({ page }) => {
    await copilotFixtures.askQuestion(
      page,
      'What connects Alice to GlobalSupply Inc?',
    );
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'copilot-with-response', {
      mask: ['[data-testid="response-metadata"]'], // Mask dynamic metadata
    });
  });

  test('copilot with why paths highlighted', async ({ page }) => {
    await copilotFixtures.askQuestion(
      page,
      'What connects Alice to GlobalSupply Inc?',
    );
    await page.waitForTimeout(1000);

    // Full page to capture highlighted paths
    await takeScreenshot(page, 'copilot-why-paths-highlighted', {
      fullPage: true,
      mask: ['[data-testid="response-metadata"]'],
    });
  });

  test('copilot error state', async ({ page }) => {
    // Ask a question that will fail
    await page.route('**/api/copilot/**', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Service unavailable' }),
      });
    });

    await copilotFixtures.askQuestion(page, 'Test question');
    await page.waitForTimeout(1000);

    await takeScreenshot(page, 'copilot-error-state');
  });
});

test.describe('Visual Regression - Entity Details', () => {
  test.beforeEach(async ({ page }) => {
    await investigationFixtures.goToInvestigation(
      page,
      investigationFixtures.demoInvestigation.id,
    );
  });

  test('entity details panel', async ({ page }) => {
    await page.click('[data-testid="entity-alice-001"]');
    await page.waitForTimeout(500);

    const detailsPanel = page.locator('[data-testid="entity-details"]');
    await expect(detailsPanel).toBeVisible();

    await takeScreenshot(page, 'entity-details-panel');
  });

  test('entity with all properties expanded', async ({ page }) => {
    await page.click('[data-testid="entity-alice-001"]');
    await page.waitForTimeout(500);

    // Expand all property sections
    const expandButtons = page.locator('[data-testid*="expand-properties"]');
    const count = await expandButtons.count();

    for (let i = 0; i < count; i++) {
      await expandButtons.nth(i).click();
      await page.waitForTimeout(200);
    }

    await takeScreenshot(page, 'entity-properties-expanded');
  });

  test('entity edit mode', async ({ page }) => {
    await page.click('[data-testid="entity-alice-001"]');
    await page.waitForTimeout(500);

    const editButton = page.locator('[data-testid="edit-entity-button"]');
    if (await editButton.isVisible().catch(() => false)) {
      await editButton.click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'entity-edit-mode');
    }
  });
});

test.describe('Visual Regression - Navigation and Menus', () => {
  test('main navigation', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    await takeScreenshot(page, 'main-navigation');
  });

  test('user menu opened', async ({ page }) => {
    await page.goto('/dashboard');
    await page.click('[data-testid="user-menu-button"]');
    await page.waitForTimeout(300);

    await takeScreenshot(page, 'user-menu-opened');
  });

  test('sidebar navigation', async ({ page }) => {
    await page.goto('/dashboard');

    const sidebar = page.locator('[data-testid="sidebar"]');
    if (await sidebar.isVisible().catch(() => false)) {
      await takeScreenshot(page, 'sidebar-navigation');
    }
  });

  test('mobile navigation menu', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');

    const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenu.isVisible().catch(() => false)) {
      await mobileMenu.click();
      await page.waitForTimeout(300);

      await takeScreenshot(page, 'mobile-navigation-menu');
    }
  });
});

test.describe('Visual Regression - Forms and Modals', () => {
  test('create investigation modal', async ({ page }) => {
    await page.goto('/investigations');

    const createButton = page.locator(
      '[data-testid="create-investigation-button"]',
    );
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'create-investigation-modal');
    }
  });

  test('create entity form', async ({ page }) => {
    await investigationFixtures.goToInvestigation(
      page,
      investigationFixtures.demoInvestigation.id,
    );

    const addEntityButton = page.locator('[data-testid="add-entity-button"]');
    if (await addEntityButton.isVisible().catch(() => false)) {
      await addEntityButton.click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'create-entity-form');
    }
  });

  test('form validation errors', async ({ page }) => {
    await page.goto('/investigations');

    const createButton = page.locator(
      '[data-testid="create-investigation-button"]',
    );
    if (await createButton.isVisible().catch(() => false)) {
      await createButton.click();
      await page.waitForTimeout(500);

      // Submit without filling required fields
      const submitButton = page.locator(
        '[data-testid="create-investigation-submit"]',
      );
      await submitButton.click();
      await page.waitForTimeout(500);

      await takeScreenshot(page, 'form-validation-errors');
    }
  });
});

test.describe('Visual Regression - Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Enable dark mode if available
    await page.goto('/dashboard');

    const darkModeToggle = page.locator('[data-testid="dark-mode-toggle"]');
    if (await darkModeToggle.isVisible().catch(() => false)) {
      await darkModeToggle.click();
      await page.waitForTimeout(500);
    }
  });

  test('dashboard dark mode', async ({ page }) => {
    await takeScreenshot(page, 'dashboard-dark-mode', {
      fullPage: true,
    });
  });

  test('investigation graph dark mode', async ({ page }) => {
    await investigationFixtures.goToInvestigation(
      page,
      investigationFixtures.demoInvestigation.id,
    );

    await takeScreenshot(page, 'investigation-graph-dark-mode');
  });

  test('copilot panel dark mode', async ({ page }) => {
    await investigationFixtures.goToInvestigation(
      page,
      investigationFixtures.demoInvestigation.id,
    );
    await copilotFixtures.openCopilot(page);

    await takeScreenshot(page, 'copilot-panel-dark-mode');
  });
});

test.describe('Visual Regression - Responsive Breakpoints', () => {
  const viewports = [
    { name: 'mobile-small', width: 320, height: 568 },
    { name: 'mobile', width: 375, height: 667 },
    { name: 'mobile-large', width: 414, height: 896 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'desktop', width: 1920, height: 1080 },
    { name: 'desktop-4k', width: 3840, height: 2160 },
  ];

  for (const viewport of viewports) {
    test(`dashboard at ${viewport.name}`, async ({ page }) => {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });

      await page.goto('/dashboard');
      await page.waitForLoadState('networkidle');

      await takeScreenshot(page, `dashboard-${viewport.name}`, {
        fullPage: false, // Viewport-specific screenshot
      });
    });
  }
});

test.describe('Visual Regression - Accessibility States', () => {
  test('focus states', async ({ page }) => {
    await page.goto('/dashboard');

    // Tab through several elements to show focus states
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);
    await page.keyboard.press('Tab');
    await page.waitForTimeout(200);

    await takeScreenshot(page, 'focus-states');
  });

  test('hover states', async ({ page }) => {
    await page.goto('/dashboard');

    const firstWidget = page.locator('[data-testid$="-widget"]').first();
    await firstWidget.hover();
    await page.waitForTimeout(300);

    await takeScreenshot(page, 'hover-states');
  });

  test('disabled states', async ({ page }) => {
    await page.goto('/dashboard');

    // Try to find disabled elements
    const disabledElements = page.locator(':disabled, [aria-disabled="true"]');
    if ((await disabledElements.count()) > 0) {
      await takeScreenshot(page, 'disabled-states');
    }
  });
});

test.describe('Visual Regression - Loading States', () => {
  test('loading skeletons', async ({ page }) => {
    // Delay network to capture loading state
    await page.route('**/api/**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 3000));
      await route.continue();
    });

    const navigationPromise = page.goto('/dashboard');

    // Capture loading state before data loads
    await page.waitForTimeout(500);
    await takeScreenshot(page, 'loading-skeletons');

    // Wait for navigation to complete
    await navigationPromise;
  });

  test('empty states', async ({ page }) => {
    // Mock empty data responses
    await page.route('**/api/investigations', (route) => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ investigations: [] }),
      });
    });

    await page.goto('/investigations');
    await page.waitForLoadState('networkidle');

    await takeScreenshot(page, 'empty-state-investigations');
  });
});
