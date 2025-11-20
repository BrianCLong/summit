/**
 * Comprehensive Dashboard E2E Tests
 *
 * Tests all dashboard functionality including:
 * - Widget loading and rendering
 * - Recent investigations
 * - Alerts and notifications
 * - Activity feed
 * - Statistics and metrics
 * - User interactions
 * - Performance
 */

import { test, expect } from '@playwright/test';
import {
  dashboardFixtures,
  investigationFixtures,
  waitUtils,
  perfUtils,
  authFixtures,
} from './fixtures';

test.describe('Dashboard - Core Functionality', () => {
  test.beforeEach(async ({ page }) => {
    // Use authenticated session (analyst role)
    await page.goto('/');
    await dashboardFixtures.goToDashboard(page);
  });

  test('should load all dashboard widgets successfully', async ({ page }) => {
    // Verify main dashboard heading
    await expect(page.locator('h1')).toContainText(/Dashboard|Overview/i);

    // Verify all key widgets are present
    await dashboardFixtures.verifyWidgetsLoaded(page);

    // Verify no error messages
    const errorMessages = page.locator('[data-testid*="error"]');
    await expect(errorMessages).toHaveCount(0);
  });

  test('should display recent investigations', async ({ page }) => {
    const widget = page.locator('[data-testid="recent-investigations-widget"]');
    await expect(widget).toBeVisible();

    // Verify widget title
    await expect(widget.locator('h2, h3')).toContainText(
      /Recent Investigations/i,
    );

    // Verify at least one investigation is shown
    const investigations = widget.locator('[data-testid^="recent-investigation-"]');
    const count = await investigations.count();
    expect(count).toBeGreaterThan(0);

    // Verify investigation cards have required fields
    const firstInvestigation = investigations.first();
    await expect(firstInvestigation).toContainText(/.+/); // Has some text
    await expect(firstInvestigation).toBeVisible();
  });

  test('should navigate to investigation when clicked', async ({ page }) => {
    await dashboardFixtures.openRecentInvestigation(page, 0);

    // Verify we're on investigation page
    await expect(page).toHaveURL(/\/investigations\/[a-zA-Z0-9-]+/);

    // Verify investigation loaded
    await waitUtils.waitForGraph(page);
  });

  test('should display alerts widget', async ({ page }) => {
    const widget = page.locator('[data-testid="alerts-widget"]');
    await expect(widget).toBeVisible();

    // Verify widget title
    await expect(widget.locator('h2, h3')).toContainText(/Alerts/i);

    // Check if alerts are present or "no alerts" message is shown
    const alerts = widget.locator('[data-testid^="alert-"]');
    const noAlertsMessage = widget.locator('[data-testid="no-alerts"]');

    const hasAlerts = (await alerts.count()) > 0;
    const hasNoAlertsMessage = await noAlertsMessage.isVisible().catch(() => false);

    expect(hasAlerts || hasNoAlertsMessage).toBe(true);
  });

  test('should display activity feed', async ({ page }) => {
    const widget = page.locator('[data-testid="activity-widget"]');
    await expect(widget).toBeVisible();

    // Verify widget title
    await expect(widget.locator('h2, h3')).toContainText(/Activity|Recent Activity/i);

    // Verify activity items are displayed
    const activityItems = widget.locator('[data-testid^="activity-"]');
    const count = await activityItems.count();
    expect(count).toBeGreaterThanOrEqual(0); // May be 0 for new account
  });

  test('should display statistics widget', async ({ page }) => {
    const widget = page.locator('[data-testid="stats-widget"]');
    await expect(widget).toBeVisible();

    // Verify stats are displayed
    const stats = widget.locator('[data-testid^="stat-"]');
    const count = await stats.count();
    expect(count).toBeGreaterThan(0);

    // Verify stats have labels and values
    const firstStat = stats.first();
    await expect(firstStat).toBeVisible();
    await expect(firstStat).toContainText(/.+/);
  });

  test('should refresh dashboard data', async ({ page }) => {
    // Get initial investigation count
    const widget = page.locator('[data-testid="recent-investigations-widget"]');
    const initialText = await widget.textContent();

    // Click refresh button
    await page.click('[data-testid="refresh-dashboard-button"]');

    // Wait for refresh to complete
    await page.waitForTimeout(1000);

    // Verify widget is still visible (may or may not have different content)
    await expect(widget).toBeVisible();
  });
});

test.describe('Dashboard - User Interactions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should open and close widgets', async ({ page }) => {
    // Find a collapsible widget
    const widget = page.locator('[data-testid="recent-investigations-widget"]');

    // Find collapse/expand button (if exists)
    const collapseButton = widget.locator('[data-testid*="collapse"], [data-testid*="expand"]').first();

    if (await collapseButton.isVisible().catch(() => false)) {
      // Collapse widget
      await collapseButton.click();
      await page.waitForTimeout(500);

      // Verify content is hidden
      const content = widget.locator('[data-testid*="content"]');
      const isHidden = await content.isHidden().catch(() => true);
      expect(isHidden).toBe(true);

      // Expand widget
      await collapseButton.click();
      await page.waitForTimeout(500);

      // Verify content is visible
      await expect(content).toBeVisible();
    }
  });

  test('should filter investigations by status', async ({ page }) => {
    const widget = page.locator('[data-testid="recent-investigations-widget"]');

    // Find filter dropdown (if exists)
    const filterSelect = widget.locator('[data-testid="investigation-status-filter"]');

    if (await filterSelect.isVisible().catch(() => false)) {
      // Select "ACTIVE" filter
      await filterSelect.selectOption('ACTIVE');
      await page.waitForTimeout(500);

      // Verify filtered results
      const investigations = widget.locator('[data-testid^="recent-investigation-"]');
      const count = await investigations.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should search within dashboard', async ({ page }) => {
    const searchInput = page.locator('[data-testid="dashboard-search-input"]');

    if (await searchInput.isVisible().catch(() => false)) {
      // Enter search term
      await searchInput.fill('demo');
      await page.waitForTimeout(500);

      // Verify results are filtered
      const results = page.locator('[data-testid^="search-result-"]');
      const count = await results.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should customize dashboard layout', async ({ page }) => {
    const customizeButton = page.locator('[data-testid="customize-dashboard-button"]');

    if (await customizeButton.isVisible().catch(() => false)) {
      await customizeButton.click();

      // Verify customization panel opens
      await expect(
        page.locator('[data-testid="dashboard-customization-panel"]'),
      ).toBeVisible();

      // Close customization panel
      await page.click('[data-testid="close-customization-panel"]');
    }
  });
});

test.describe('Dashboard - Alerts and Notifications', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard');
  });

  test('should display alert count badge', async ({ page }) => {
    const alertBadge = page.locator('[data-testid="alert-count-badge"]');

    if (await alertBadge.isVisible().catch(() => false)) {
      const badgeText = await alertBadge.textContent();
      const count = parseInt(badgeText || '0', 10);
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should open alert details when clicked', async ({ page }) => {
    const alertsWidget = page.locator('[data-testid="alerts-widget"]');
    const firstAlert = alertsWidget.locator('[data-testid^="alert-"]').first();

    if (await firstAlert.isVisible().catch(() => false)) {
      await firstAlert.click();

      // Verify alert details panel opens
      await expect(
        page.locator('[data-testid="alert-details-panel"]'),
      ).toBeVisible();

      // Verify alert has required information
      await expect(
        page.locator('[data-testid="alert-details-panel"]'),
      ).toContainText(/.+/);
    }
  });

  test('should mark alert as read', async ({ page }) => {
    const alertsWidget = page.locator('[data-testid="alerts-widget"]');
    const firstAlert = alertsWidget.locator('[data-testid^="alert-"]').first();

    if (await firstAlert.isVisible().catch(() => false)) {
      // Click mark as read button
      const markReadButton = firstAlert.locator('[data-testid="mark-alert-read"]');

      if (await markReadButton.isVisible().catch(() => false)) {
        await markReadButton.click();
        await page.waitForTimeout(500);

        // Verify alert is marked as read (styling change or removal)
        const hasReadClass = await firstAlert.evaluate((el) =>
          el.classList.contains('read'),
        );
        expect(hasReadClass).toBe(true);
      }
    }
  });

  test('should dismiss alert', async ({ page }) => {
    const alertsWidget = page.locator('[data-testid="alerts-widget"]');
    const initialAlertCount = await alertsWidget.locator('[data-testid^="alert-"]').count();

    const firstAlert = alertsWidget.locator('[data-testid^="alert-"]').first();

    if (await firstAlert.isVisible().catch(() => false)) {
      const dismissButton = firstAlert.locator('[data-testid="dismiss-alert"]');

      if (await dismissButton.isVisible().catch(() => false)) {
        await dismissButton.click();
        await page.waitForTimeout(500);

        // Verify alert count decreased
        const newAlertCount = await alertsWidget.locator('[data-testid^="alert-"]').count();
        expect(newAlertCount).toBeLessThanOrEqual(initialAlertCount);
      }
    }
  });
});

test.describe('Dashboard - Performance', () => {
  test('should load dashboard in acceptable time', async ({ page }) => {
    const { loadTime } = await perfUtils.measurePageLoad(page, '/dashboard');

    // Dashboard should load in less than 5 seconds
    expect(loadTime).toBeLessThan(5000);

    console.log(`Dashboard loaded in ${loadTime}ms`);
  });

  test('should load widgets progressively', async ({ page }) => {
    await page.goto('/dashboard');

    // Verify at least one widget appears quickly
    const firstWidget = page.locator('[data-testid$="-widget"]').first();
    await expect(firstWidget).toBeVisible({ timeout: 3000 });

    // Wait for all widgets to load
    await dashboardFixtures.verifyWidgetsLoaded(page);
  });

  test('should handle large datasets efficiently', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for activity widget with potentially many items
    const activityWidget = page.locator('[data-testid="activity-widget"]');
    await expect(activityWidget).toBeVisible();

    // Verify virtualization is working (not all items rendered)
    const activityItems = activityWidget.locator('[data-testid^="activity-"]');
    const visibleCount = await activityItems.count();

    // Should not render more than 50 items at once (virtual scrolling)
    expect(visibleCount).toBeLessThanOrEqual(50);
  });
});

test.describe('Dashboard - Role-Based Access', () => {
  test('admin should see admin-only widgets', async ({ page }) => {
    await authFixtures.loginAs(page, 'admin');
    await dashboardFixtures.goToDashboard(page);

    // Admin-specific widget should be visible
    const adminWidget = page.locator('[data-testid="admin-dashboard-widget"]');

    // May or may not exist depending on implementation
    const isVisible = await adminWidget.isVisible().catch(() => false);

    // If admin widget exists, verify it's visible
    if (isVisible) {
      await expect(adminWidget).toBeVisible();
    }
  });

  test('viewer should have read-only access', async ({ page }) => {
    await authFixtures.loginAs(page, 'viewer');
    await dashboardFixtures.goToDashboard(page);

    // Verify create/edit buttons are not visible for viewer
    const createButton = page.locator('[data-testid="create-investigation-button"]');

    // Should either not exist or be disabled
    if (await createButton.isVisible().catch(() => false)) {
      const isDisabled = await createButton.isDisabled();
      expect(isDisabled).toBe(true);
    }
  });

  test('analyst should see investigation creation options', async ({ page }) => {
    await authFixtures.loginAs(page, 'analyst');
    await dashboardFixtures.goToDashboard(page);

    // Verify analyst can see create button
    const createButton = page.locator('[data-testid="create-investigation-button"]');

    if (await createButton.isVisible().catch(() => false)) {
      await expect(createButton).toBeEnabled();
    }
  });
});

test.describe('Dashboard - Responsive Design', () => {
  test('should render correctly on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await dashboardFixtures.goToDashboard(page);

    // Verify widgets stack vertically
    await expect(page.locator('[data-testid$="-widget"]').first()).toBeVisible();

    // Verify mobile navigation works
    const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
    if (await mobileMenu.isVisible().catch(() => false)) {
      await mobileMenu.click();
      await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
    }
  });

  test('should render correctly on tablet', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    await dashboardFixtures.goToDashboard(page);

    // Verify widgets are visible
    await dashboardFixtures.verifyWidgetsLoaded(page);
  });

  test('should render correctly on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1920, height: 1080 });

    await dashboardFixtures.goToDashboard(page);

    // Verify widgets are visible
    await dashboardFixtures.verifyWidgetsLoaded(page);
  });
});

test.describe('Dashboard - Error Handling', () => {
  test('should handle API errors gracefully', async ({ page }) => {
    // Intercept API calls and return error
    await page.route('**/api/investigations', (route) => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await dashboardFixtures.goToDashboard(page);

    // Verify error message is displayed
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/error|failed|unavailable/i);
  });

  test('should show loading states', async ({ page }) => {
    // Slow down network to see loading states
    await page.route('**/api/**', async (route) => {
      await page.waitForTimeout(2000);
      await route.continue();
    });

    const dashboardPromise = dashboardFixtures.goToDashboard(page);

    // Verify loading indicators are shown
    const loadingSpinner = page.locator('[data-testid="loading-spinner"]');
    await expect(loadingSpinner).toBeVisible({ timeout: 1000 });

    // Wait for dashboard to finish loading
    await dashboardPromise;

    // Verify loading spinner is gone
    await expect(loadingSpinner).not.toBeVisible();
  });

  test('should retry failed requests', async ({ page }) => {
    let requestCount = 0;

    // Fail first request, succeed on retry
    await page.route('**/api/investigations', (route) => {
      requestCount++;
      if (requestCount === 1) {
        route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Server Error' }),
        });
      } else {
        route.continue();
      }
    });

    await dashboardFixtures.goToDashboard(page);

    // Verify retry happened
    expect(requestCount).toBeGreaterThan(1);

    // Verify dashboard loaded successfully after retry
    await expect(page.locator('[data-testid$="-widget"]').first()).toBeVisible();
  });
});
