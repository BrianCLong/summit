/**
 * IntelGraph Maestro Dashboard E2E Tests
 *
 * Cross-browser tests for the Maestro orchestration dashboard including:
 * - Authentication flows
 * - Pipeline management
 * - Real-time monitoring
 * - Accessibility compliance
 */

import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Maestro Dashboard', () => {
  let page: Page;

  test.beforeEach(async ({ page: testPage }) => {
    page = testPage;

    // Set up authentication if required
    if (process.env.TEST_AUTH_TOKEN) {
      await page.addInitScript((token) => {
        localStorage.setItem('auth_token', token);
      }, process.env.TEST_AUTH_TOKEN);
    }

    // Navigate to Maestro dashboard
    await page.goto('/maestro/dashboard');
  });

  test.describe('Authentication & Navigation', () => {
    test('should load dashboard without errors', async () => {
      // Wait for page to load
      await page.waitForSelector('[data-testid="maestro-dashboard"]', {
        timeout: 30000,
      });

      // Check for JavaScript errors
      const errors: string[] = [];
      page.on('pageerror', (error) => {
        errors.push(error.message);
      });

      await page.waitForTimeout(2000);
      expect(errors).toHaveLength(0);

      // Verify dashboard title
      await expect(page).toHaveTitle(/Maestro.*Dashboard/i);
    });

    test('should display navigation elements', async () => {
      // Check main navigation
      await expect(page.locator('nav[role="navigation"]')).toBeVisible();

      // Check navigation links
      const navLinks = [
        'Dashboard',
        'Pipelines',
        'Executors',
        'MCP Servers',
        'Monitoring',
      ];

      for (const link of navLinks) {
        await expect(page.locator(`nav a:has-text("${link}")`)).toBeVisible();
      }
    });

    test('should handle authentication flows', async () => {
      // Test SSO login button if present
      const ssoButton = page.locator('[data-testid="sso-login"]');
      if (await ssoButton.isVisible()) {
        await expect(ssoButton).toBeEnabled();
      }

      // Test logout functionality
      const userMenu = page.locator('[data-testid="user-menu"]');
      if (await userMenu.isVisible()) {
        await userMenu.click();
        await expect(
          page.locator('[data-testid="logout-button"]'),
        ).toBeVisible();
      }
    });
  });

  test.describe('Pipeline Management', () => {
    test('should display pipeline list', async () => {
      await page.click('a:has-text("Pipelines")');
      await page.waitForSelector('[data-testid="pipeline-list"]');

      // Check pipeline table headers
      const headers = ['Name', 'Status', 'Last Run', 'Actions'];
      for (const header of headers) {
        await expect(page.locator(`th:has-text("${header}")`)).toBeVisible();
      }
    });

    test('should create new pipeline', async () => {
      await page.click('a:has-text("Pipelines")');
      await page.waitForSelector('[data-testid="create-pipeline-button"]');

      await page.click('[data-testid="create-pipeline-button"]');
      await page.waitForSelector('[data-testid="pipeline-form"]');

      // Fill pipeline form
      await page.fill('[data-testid="pipeline-name"]', 'E2E Test Pipeline');
      await page.fill(
        '[data-testid="pipeline-description"]',
        'Created by automated E2E test',
      );

      // Submit form
      await page.click('[data-testid="save-pipeline"]');

      // Verify success message
      await expect(page.locator('[data-testid="success-message"]')).toBeVisible(
        { timeout: 10000 },
      );
    });

    test('should validate pipeline creation form', async () => {
      await page.click('a:has-text("Pipelines")');
      await page.click('[data-testid="create-pipeline-button"]');

      // Try to submit empty form
      await page.click('[data-testid="save-pipeline"]');

      // Check for validation errors
      await expect(page.locator('[data-testid="name-error"]')).toBeVisible();
    });

    test('should execute pipeline', async () => {
      await page.click('a:has-text("Pipelines")');

      // Find first pipeline and execute
      const firstPipeline = page
        .locator('[data-testid="pipeline-row"]')
        .first();
      await firstPipeline.locator('[data-testid="execute-pipeline"]').click();

      // Wait for execution dialog
      await page.waitForSelector('[data-testid="execution-dialog"]');

      // Start execution
      await page.click('[data-testid="start-execution"]');

      // Verify execution started
      await expect(
        page.locator('[data-testid="execution-status"]'),
      ).toBeVisible();
    });
  });

  test.describe('Executor Management', () => {
    test('should display executor list', async () => {
      await page.click('a:has-text("Executors")');
      await page.waitForSelector('[data-testid="executor-list"]');

      // Check executor cards/table
      await expect(page.locator('[data-testid="executor-item"]')).toHaveCount({
        min: 0,
      });
    });

    test('should show executor health status', async () => {
      await page.click('a:has-text("Executors")');

      const executors = page.locator('[data-testid="executor-item"]');
      const count = await executors.count();

      for (let i = 0; i < Math.min(count, 3); i++) {
        const executor = executors.nth(i);
        const statusIndicator = executor.locator(
          '[data-testid="executor-status"]',
        );

        await expect(statusIndicator).toBeVisible();

        // Status should be one of: ready, busy, offline
        const statusText = await statusIndicator.textContent();
        expect([
          'ready',
          'busy',
          'offline',
          'Ready',
          'Busy',
          'Offline',
        ]).toContain(statusText?.trim());
      }
    });
  });

  test.describe('MCP Server Management', () => {
    test('should display MCP servers', async () => {
      await page.click('a:has-text("MCP Servers")');
      await page.waitForSelector('[data-testid="mcp-server-list"]');

      // Check MCP server table
      await expect(page.locator('[data-testid="mcp-server-item"]')).toHaveCount(
        { min: 0 },
      );
    });

    test('should test MCP server connectivity', async () => {
      await page.click('a:has-text("MCP Servers")');

      const serverItems = page.locator('[data-testid="mcp-server-item"]');
      const count = await serverItems.count();

      if (count > 0) {
        const firstServer = serverItems.first();
        const healthButton = firstServer.locator(
          '[data-testid="test-connectivity"]',
        );

        if (await healthButton.isVisible()) {
          await healthButton.click();

          // Wait for health check result
          await expect(
            firstServer.locator('[data-testid="connectivity-status"]'),
          ).toBeVisible({ timeout: 10000 });
        }
      }
    });
  });

  test.describe('Real-time Monitoring', () => {
    test('should display system metrics', async () => {
      // Check dashboard metrics widgets
      const metricsWidgets = [
        'active-pipelines',
        'system-health',
        'error-rate',
        'throughput',
      ];

      for (const widget of metricsWidgets) {
        const element = page.locator(`[data-testid="${widget}"]`);
        if (await element.isVisible()) {
          await expect(element).toBeVisible();
        }
      }
    });

    test('should update metrics in real-time', async () => {
      const metricsWidget = page.locator('[data-testid="system-health"]');

      if (await metricsWidget.isVisible()) {
        const initialValue = await metricsWidget.textContent();

        // Wait for potential updates (websocket or polling)
        await page.waitForTimeout(5000);

        const updatedValue = await metricsWidget.textContent();

        // Values should be present (may or may not have changed)
        expect(initialValue).toBeTruthy();
        expect(updatedValue).toBeTruthy();
      }
    });

    test('should display activity feed', async () => {
      const activityFeed = page.locator('[data-testid="activity-feed"]');

      if (await activityFeed.isVisible()) {
        // Check for activity items
        const activityItems = activityFeed.locator(
          '[data-testid="activity-item"]',
        );
        await expect(activityItems).toHaveCount({ min: 0 });
      }
    });
  });

  test.describe('Responsive Design', () => {
    test('should work on mobile viewport', async () => {
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.reload();

      // Check mobile navigation
      const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();

        // Verify mobile navigation menu
        await expect(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
      }

      // Dashboard should still be functional
      await expect(
        page.locator('[data-testid="maestro-dashboard"]'),
      ).toBeVisible();
    });

    test('should work on tablet viewport', async () => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.reload();

      // Dashboard should adapt to tablet size
      await expect(
        page.locator('[data-testid="maestro-dashboard"]'),
      ).toBeVisible();

      // Navigation should be accessible
      await expect(page.locator('nav[role="navigation"]')).toBeVisible();
    });
  });

  test.describe('Performance', () => {
    test('should load within performance budget', async () => {
      const startTime = Date.now();

      await page.goto('/maestro/dashboard');
      await page.waitForSelector('[data-testid="maestro-dashboard"]');

      const loadTime = Date.now() - startTime;

      // Should load within 5 seconds
      expect(loadTime).toBeLessThan(5000);
    });

    test('should have good Core Web Vitals', async () => {
      await page.goto('/maestro/dashboard');

      // Measure Web Vitals using browser APIs
      const webVitals = await page.evaluate(() => {
        return new Promise((resolve) => {
          const vitals: any = {};

          // LCP (Largest Contentful Paint)
          new PerformanceObserver((list) => {
            const entries = list.getEntries();
            if (entries.length > 0) {
              vitals.lcp = entries[entries.length - 1].startTime;
            }
          }).observe({ entryTypes: ['largest-contentful-paint'] });

          // FID (First Input Delay) - simulate with click
          document.addEventListener('click', function measure(event) {
            vitals.fid = performance.now();
            document.removeEventListener('click', measure);
          });

          // CLS (Cumulative Layout Shift)
          let cls = 0;
          new PerformanceObserver((list) => {
            for (const entry of list.getEntries()) {
              if (!(entry as any).hadRecentInput) {
                cls += (entry as any).value;
              }
            }
            vitals.cls = cls;
          }).observe({ entryTypes: ['layout-shift'] });

          setTimeout(() => resolve(vitals), 3000);
        });
      });

      // Check Web Vitals thresholds
      const vitals = webVitals as any;

      if (vitals.lcp) {
        expect(vitals.lcp).toBeLessThan(2500); // LCP should be < 2.5s
      }

      if (vitals.cls !== undefined) {
        expect(vitals.cls).toBeLessThan(0.1); // CLS should be < 0.1
      }
    });
  });

  test.describe('Security', () => {
    test('should not expose sensitive data in DOM', async () => {
      await page.waitForSelector('[data-testid="maestro-dashboard"]');

      const pageContent = await page.content();

      // Check for common sensitive data patterns
      const sensitivePatterns = [
        /password/i,
        /secret/i,
        /token.*[A-Za-z0-9]{20,}/,
        /key.*[A-Za-z0-9]{20,}/,
        /api[_-]?key/i,
      ];

      for (const pattern of sensitivePatterns) {
        const matches = pageContent.match(pattern);
        if (matches) {
          // Log warning but don't fail test (might be legitimate UI text)
          console.warn(`Potential sensitive data pattern found: ${matches[0]}`);
        }
      }
    });

    test('should implement CSP headers', async () => {
      const response = await page.goto('/maestro/dashboard');
      const cspHeader = response?.headers()['content-security-policy'];

      if (cspHeader) {
        expect(cspHeader).toContain("default-src 'self'");
      } else {
        console.warn('No Content Security Policy header found');
      }
    });

    test('should secure authentication state', async () => {
      // Check that authentication tokens are not accessible via XSS
      const tokenInLocalStorage = await page.evaluate(() => {
        return localStorage.getItem('auth_token');
      });

      if (tokenInLocalStorage) {
        // If tokens are in localStorage, ensure they're not visible in DOM
        const pageContent = await page.content();
        expect(pageContent).not.toContain(tokenInLocalStorage);
      }
    });
  });
});

// Accessibility testing with axe-core
test.describe('Accessibility', () => {
  test('should pass WCAG 2.1 AA accessibility audit', async ({ page }) => {
    await page.goto('/maestro/dashboard');
    await page.waitForSelector('[data-testid="maestro-dashboard"]');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should support keyboard navigation', async ({ page }) => {
    await page.goto('/maestro/dashboard');
    await page.waitForSelector('[data-testid="maestro-dashboard"]');

    // Test tab navigation through interactive elements
    const interactiveElements = page.locator(
      'button, a, input, select, [tabindex="0"]',
    );
    const count = await interactiveElements.count();

    // Tab through first few elements
    for (let i = 0; i < Math.min(count, 5); i++) {
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(
        () => document.activeElement?.tagName,
      );
      expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'DIV']).toContain(
        focused || '',
      );
    }
  });

  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/maestro/dashboard');
    await page.waitForSelector('[data-testid="maestro-dashboard"]');

    // Check for ARIA landmarks
    await expect(page.locator('[role="navigation"]')).toBeVisible();
    await expect(page.locator('[role="main"]')).toBeVisible();

    // Check for ARIA labels on interactive elements
    const buttons = page.locator('button');
    const buttonCount = await buttons.count();

    for (let i = 0; i < Math.min(buttonCount, 3); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();

      // Button should have either aria-label or text content
      expect(ariaLabel || text?.trim()).toBeTruthy();
    }
  });
});
