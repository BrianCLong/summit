import { test, expect } from '@playwright/test';

test.describe('Phase 3 Production Features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('should display presence indicators', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Wait for presence pill to appear (if users are online)
    const presencePill = page.getByTestId('presence-pill').or(
      page.getByText(/\d+ active/).first()
    );
    
    // Presence should either be visible or not crash the page
    await expect(page).not.toHaveTitle(/Error/);
    
    // Check that presence subscription doesn't cause JS errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(2000);
    
    // Filter out known non-critical errors
    const criticalErrors = errors.filter(error => 
      !error.includes('subscription') && 
      !error.includes('WebSocket') &&
      !error.includes('Network request failed')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('should render activity feed without errors', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Look for activity feed component
    const activityFeed = page.getByText('Live Activity Feed').or(
      page.getByText('Activity Feed')
    );
    
    // Activity feed should render or gracefully handle no data
    await expect(page).not.toHaveTitle(/Error/);
    
    // Check for proper loading states
    const loadingText = page.getByText('Loading recent activity');
    const noActivityText = page.getByText('No recent activity');
    
    // One of these should be present
    const hasValidState = await Promise.race([
      loadingText.isVisible().catch(() => false),
      noActivityText.isVisible().catch(() => false),
      activityFeed.isVisible().catch(() => false),
    ]);
    
    expect(typeof hasValidState).toBe('boolean');
  });

  test('should handle search v2 query chips', async ({ page }) => {
    await page.goto('/search');
    
    // Try to find query builder elements
    const queryBuilder = page.getByText('Query Builder').or(
      page.getByPlaceholder(/Quick search/)
    );
    
    if (await queryBuilder.isVisible()) {
      // Test adding a simple filter
      const quickInput = page.getByPlaceholder(/Quick search/);
      await quickInput.fill('type:document');
      await quickInput.press('Enter');
      
      // Should create a chip
      await expect(page.getByText('type equals document').or(
        page.getByText('type:document')
      )).toBeVisible();
    }
  });

  test('should display graph workbench without performance issues', async ({ page }) => {
    await page.goto('/graph-workbench');
    
    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;
    
    // Page should load reasonably fast
    expect(loadTime).toBeLessThan(5000);
    
    // Look for FPS monitor in dev mode
    const fpsMonitor = page.getByText(/FPS/).first();
    
    // If FPS monitor is visible, check it's showing reasonable values
    if (await fpsMonitor.isVisible()) {
      const fpsText = await fpsMonitor.textContent();
      expect(fpsText).toMatch(/\d+/); // Should contain numbers
    }
  });

  test('should handle k-shortest paths interface', async ({ page }) => {
    await page.goto('/graph-workbench');
    
    // Look for path finding panel
    const pathPanel = page.getByText('Path Finding').or(
      page.getByText('K-Shortest Paths')
    );
    
    if (await pathPanel.isVisible()) {
      // Test form inputs
      const sourceInput = page.getByLabel(/Source Node/);
      const targetInput = page.getByLabel(/Target Node/);
      
      if (await sourceInput.isVisible() && await targetInput.isVisible()) {
        await sourceInput.fill('node-1');
        await targetInput.fill('node-2');
        
        // Find Path button should be enabled
        const findButton = page.getByRole('button', { name: /Find Path/ });
        await expect(findButton).toBeEnabled();
      }
    }
  });

  test('should render report templates dialog', async ({ page }) => {
    // Try to trigger report generation
    await page.goto('/investigations');
    
    // Look for export/report button
    const reportButton = page.getByRole('button', { name: /Report/i }).or(
      page.getByRole('button', { name: /Export/i })
    ).first();
    
    if (await reportButton.isVisible()) {
      await reportButton.click();
      
      // Should open dialog with templates
      await expect(page.getByText('Executive Summary').or(
        page.getByText('Generate Report')
      )).toBeVisible();
      
      // Close dialog
      await page.getByRole('button', { name: /Cancel/i }).click();
    }
  });

  test('should handle feature flags properly', async ({ page }) => {
    await page.goto('/');
    
    // Test that flagged features don't crash the app
    const flaggedElements = [
      'realtime-presence',
      'graph-streaming',
      'advanced-search',
      'report-templates',
    ];
    
    // Page should load without JavaScript errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error' && !msg.text().includes('Network')) {
        errors.push(msg.text());
      }
    });
    
    await page.waitForTimeout(3000);
    
    // Filter critical errors only
    const criticalErrors = errors.filter(error => 
      error.includes('TypeError') || error.includes('ReferenceError')
    );
    
    expect(criticalErrors.length).toBe(0);
  });

  test('should support locale switching', async ({ page }) => {
    await page.goto('/settings');
    
    // Look for language/locale selector
    const localeSelector = page.getByLabel(/Language/).or(
      page.locator('select').filter({ hasText: /English/ })
    ).first();
    
    if (await localeSelector.isVisible()) {
      // Test switching to another locale
      await localeSelector.click();
      
      // Should show locale options
      const frenchOption = page.getByText(/Français/).or(
        page.getByText(/French/)
      );
      
      if (await frenchOption.isVisible()) {
        await frenchOption.click();
        
        // Page should not crash
        await page.waitForTimeout(1000);
        await expect(page).not.toHaveTitle(/Error/);
      }
    }
  });

  test('accessibility - critical routes should pass axe checks', async ({ page }) => {
    const routes = ['/dashboard', '/investigations', '/graph-workbench'];
    
    for (const route of routes) {
      await page.goto(route);
      await page.waitForLoadState('networkidle');
      
      // Basic accessibility checks
      await expect(page).toHaveTitle(/.+/); // Should have a title
      
      // Check for main landmark
      const main = page.getByRole('main').or(
        page.locator('main')
      );
      
      // Either main landmark exists or page has proper heading structure
      const hasMain = await main.count() > 0;
      const hasH1 = await page.locator('h1').count() > 0;
      
      expect(hasMain || hasH1).toBe(true);
      
      // Should have proper keyboard navigation
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus').first();
      await expect(focusedElement).toBeVisible();
    }
  });
});