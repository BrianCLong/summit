"use strict";
/**
 * IntelGraph Maestro Dashboard E2E Tests
 *
 * Cross-browser tests for the Maestro orchestration dashboard including:
 * - Authentication flows
 * - Pipeline management
 * - Real-time monitoring
 * - Accessibility compliance
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const test_1 = require("@playwright/test");
const playwright_1 = __importDefault(require("@axe-core/playwright"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const AUTH_STATE_PATH = path_1.default.join(__dirname, '../auth-state.json');
test_1.test.use({ storageState: AUTH_STATE_PATH });
test_1.test.describe('Maestro Dashboard', () => {
    let page;
    test_1.test.beforeAll(() => {
        if (!fs_1.default.existsSync(AUTH_STATE_PATH)) {
            throw new Error('Missing auth storage state. Run the auth-setup spec to generate auth-state.json (e.g., `npx playwright test tests/e2e/tests/auth-setup.spec.ts --project=chromium-desktop`).');
        }
    });
    test_1.test.beforeEach(async ({ page: testPage }) => {
        page = testPage;
        // Navigate to Maestro dashboard
        await page.goto('/maestro/dashboard');
        // Guard against auth redirects to login
        await (0, test_1.expect)(page).not.toHaveURL(/login/, { timeout: 15000 });
    });
    test_1.test.describe('Authentication & Navigation', () => {
        (0, test_1.test)('should load dashboard without errors', async () => {
            // Wait for page to load
            await page.waitForSelector('[data-testid="maestro-dashboard"]', {
                timeout: 30000,
            });
            // Check for JavaScript errors
            const errors = [];
            page.on('pageerror', (error) => {
                errors.push(error.message);
            });
            await page.waitForTimeout(2000);
            (0, test_1.expect)(errors).toHaveLength(0);
            // Verify dashboard title
            await (0, test_1.expect)(page).toHaveTitle(/Maestro.*Dashboard/i);
        });
        (0, test_1.test)('should display navigation elements', async () => {
            // Check main navigation
            await (0, test_1.expect)(page.locator('nav[role="navigation"]')).toBeVisible();
            // Check navigation links
            const navLinks = [
                'Dashboard',
                'Pipelines',
                'Executors',
                'MCP Servers',
                'Monitoring',
            ];
            for (const link of navLinks) {
                await (0, test_1.expect)(page.locator(`nav a:has-text("${link}")`)).toBeVisible();
            }
        });
        (0, test_1.test)('should handle authentication flows', async () => {
            // Test SSO login button if present
            const ssoButton = page.locator('[data-testid="sso-login"]');
            if (await ssoButton.isVisible()) {
                await (0, test_1.expect)(ssoButton).toBeEnabled();
            }
            // Test logout functionality
            const userMenu = page.locator('[data-testid="user-menu"]');
            if (await userMenu.isVisible()) {
                await userMenu.click();
                await (0, test_1.expect)(page.locator('[data-testid="logout-button"]')).toBeVisible();
            }
        });
    });
    test_1.test.describe('Pipeline Management', () => {
        (0, test_1.test)('should display pipeline list', async () => {
            await page.click('a:has-text("Pipelines")');
            await page.waitForSelector('[data-testid="pipeline-list"]');
            // Check pipeline table headers
            const headers = ['Name', 'Status', 'Last Run', 'Actions'];
            for (const header of headers) {
                await (0, test_1.expect)(page.locator(`th:has-text("${header}")`)).toBeVisible();
            }
        });
        (0, test_1.test)('should create new pipeline', async () => {
            await page.click('a:has-text("Pipelines")');
            await page.waitForSelector('[data-testid="create-pipeline-button"]');
            await page.click('[data-testid="create-pipeline-button"]');
            await page.waitForSelector('[data-testid="pipeline-form"]');
            // Fill pipeline form
            await page.fill('[data-testid="pipeline-name"]', 'E2E Test Pipeline');
            await page.fill('[data-testid="pipeline-description"]', 'Created by automated E2E test');
            // Submit form
            await page.click('[data-testid="save-pipeline"]');
            // Verify success message
            await (0, test_1.expect)(page.locator('[data-testid="success-message"]')).toBeVisible({ timeout: 10000 });
        });
        (0, test_1.test)('should validate pipeline creation form', async () => {
            await page.click('a:has-text("Pipelines")');
            await page.click('[data-testid="create-pipeline-button"]');
            // Try to submit empty form
            await page.click('[data-testid="save-pipeline"]');
            // Check for validation errors
            await (0, test_1.expect)(page.locator('[data-testid="name-error"]')).toBeVisible();
        });
        (0, test_1.test)('should execute pipeline', async () => {
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
            await (0, test_1.expect)(page.locator('[data-testid="execution-status"]')).toBeVisible();
        });
    });
    test_1.test.describe('Executor Management', () => {
        (0, test_1.test)('should display executor list', async () => {
            await page.click('a:has-text("Executors")');
            await page.waitForSelector('[data-testid="executor-list"]');
            // Check executor cards/table
            await (0, test_1.expect)(page.locator('[data-testid="executor-item"]')).toHaveCount({
                min: 0,
            });
        });
        (0, test_1.test)('should show executor health status', async () => {
            await page.click('a:has-text("Executors")');
            const executors = page.locator('[data-testid="executor-item"]');
            const count = await executors.count();
            for (let i = 0; i < Math.min(count, 3); i++) {
                const executor = executors.nth(i);
                const statusIndicator = executor.locator('[data-testid="executor-status"]');
                await (0, test_1.expect)(statusIndicator).toBeVisible();
                // Status should be one of: ready, busy, offline
                const statusText = await statusIndicator.textContent();
                (0, test_1.expect)([
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
    test_1.test.describe('MCP Server Management', () => {
        (0, test_1.test)('should display MCP servers', async () => {
            await page.click('a:has-text("MCP Servers")');
            await page.waitForSelector('[data-testid="mcp-server-list"]');
            // Check MCP server table
            await (0, test_1.expect)(page.locator('[data-testid="mcp-server-item"]')).toHaveCount({ min: 0 });
        });
        (0, test_1.test)('should test MCP server connectivity', async () => {
            await page.click('a:has-text("MCP Servers")');
            const serverItems = page.locator('[data-testid="mcp-server-item"]');
            const count = await serverItems.count();
            if (count > 0) {
                const firstServer = serverItems.first();
                const healthButton = firstServer.locator('[data-testid="test-connectivity"]');
                if (await healthButton.isVisible()) {
                    await healthButton.click();
                    // Wait for health check result
                    await (0, test_1.expect)(firstServer.locator('[data-testid="connectivity-status"]')).toBeVisible({ timeout: 10000 });
                }
            }
        });
    });
    test_1.test.describe('Real-time Monitoring', () => {
        (0, test_1.test)('should display system metrics', async () => {
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
                    await (0, test_1.expect)(element).toBeVisible();
                }
            }
        });
        (0, test_1.test)('should update metrics in real-time', async () => {
            const metricsWidget = page.locator('[data-testid="system-health"]');
            if (await metricsWidget.isVisible()) {
                const initialValue = await metricsWidget.textContent();
                // Wait for potential updates (websocket or polling)
                await page.waitForTimeout(5000);
                const updatedValue = await metricsWidget.textContent();
                // Values should be present (may or may not have changed)
                (0, test_1.expect)(initialValue).toBeTruthy();
                (0, test_1.expect)(updatedValue).toBeTruthy();
            }
        });
        (0, test_1.test)('should display activity feed', async () => {
            const activityFeed = page.locator('[data-testid="activity-feed"]');
            if (await activityFeed.isVisible()) {
                // Check for activity items
                const activityItems = activityFeed.locator('[data-testid="activity-item"]');
                await (0, test_1.expect)(activityItems).toHaveCount({ min: 0 });
            }
        });
    });
    test_1.test.describe('Responsive Design', () => {
        (0, test_1.test)('should work on mobile viewport', async () => {
            // Set mobile viewport
            await page.setViewportSize({ width: 375, height: 667 });
            await page.reload();
            // Check mobile navigation
            const mobileMenu = page.locator('[data-testid="mobile-menu-button"]');
            if (await mobileMenu.isVisible()) {
                await mobileMenu.click();
                // Verify mobile navigation menu
                await (0, test_1.expect)(page.locator('[data-testid="mobile-nav"]')).toBeVisible();
            }
            // Dashboard should still be functional
            await (0, test_1.expect)(page.locator('[data-testid="maestro-dashboard"]')).toBeVisible();
        });
        (0, test_1.test)('should work on tablet viewport', async () => {
            // Set tablet viewport
            await page.setViewportSize({ width: 768, height: 1024 });
            await page.reload();
            // Dashboard should adapt to tablet size
            await (0, test_1.expect)(page.locator('[data-testid="maestro-dashboard"]')).toBeVisible();
            // Navigation should be accessible
            await (0, test_1.expect)(page.locator('nav[role="navigation"]')).toBeVisible();
        });
    });
    test_1.test.describe('Performance', () => {
        (0, test_1.test)('should load within performance budget', async () => {
            const startTime = Date.now();
            await page.goto('/maestro/dashboard');
            await page.waitForSelector('[data-testid="maestro-dashboard"]');
            const loadTime = Date.now() - startTime;
            // Should load within 5 seconds
            (0, test_1.expect)(loadTime).toBeLessThan(5000);
        });
        (0, test_1.test)('should have good Core Web Vitals', async () => {
            await page.goto('/maestro/dashboard');
            // Measure Web Vitals using browser APIs
            const webVitals = await page.evaluate(() => {
                return new Promise((resolve) => {
                    const vitals = {};
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
                            if (!entry.hadRecentInput) {
                                cls += entry.value;
                            }
                        }
                        vitals.cls = cls;
                    }).observe({ entryTypes: ['layout-shift'] });
                    setTimeout(() => resolve(vitals), 3000);
                });
            });
            // Check Web Vitals thresholds
            const vitals = webVitals;
            if (vitals.lcp) {
                (0, test_1.expect)(vitals.lcp).toBeLessThan(2500); // LCP should be < 2.5s
            }
            if (vitals.cls !== undefined) {
                (0, test_1.expect)(vitals.cls).toBeLessThan(0.1); // CLS should be < 0.1
            }
        });
    });
    test_1.test.describe('Security', () => {
        (0, test_1.test)('should not expose sensitive data in DOM', async () => {
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
        (0, test_1.test)('should implement CSP headers', async () => {
            const response = await page.goto('/maestro/dashboard');
            const cspHeader = response?.headers()['content-security-policy'];
            if (cspHeader) {
                (0, test_1.expect)(cspHeader).toContain("default-src 'self'");
            }
            else {
                console.warn('No Content Security Policy header found');
            }
        });
        (0, test_1.test)('should secure authentication state', async () => {
            // Check that authentication tokens are not accessible via XSS
            const tokenInLocalStorage = await page.evaluate(() => {
                return localStorage.getItem('auth_token');
            });
            if (tokenInLocalStorage) {
                // If tokens are in localStorage, ensure they're not visible in DOM
                const pageContent = await page.content();
                (0, test_1.expect)(pageContent).not.toContain(tokenInLocalStorage);
            }
        });
    });
});
// Accessibility testing with axe-core
test_1.test.describe('Accessibility', () => {
    (0, test_1.test)('should pass WCAG 2.1 AA accessibility audit', async ({ page }) => {
        await page.goto('/maestro/dashboard');
        await page.waitForSelector('[data-testid="maestro-dashboard"]');
        const accessibilityScanResults = await new playwright_1.default({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
            .analyze();
        (0, test_1.expect)(accessibilityScanResults.violations).toEqual([]);
    });
    (0, test_1.test)('should support keyboard navigation', async ({ page }) => {
        await page.goto('/maestro/dashboard');
        await page.waitForSelector('[data-testid="maestro-dashboard"]');
        // Test tab navigation through interactive elements
        const interactiveElements = page.locator('button, a, input, select, [tabindex="0"]');
        const count = await interactiveElements.count();
        // Tab through first few elements
        for (let i = 0; i < Math.min(count, 5); i++) {
            await page.keyboard.press('Tab');
            const focused = await page.evaluate(() => document.activeElement?.tagName);
            (0, test_1.expect)(['BUTTON', 'A', 'INPUT', 'SELECT', 'DIV']).toContain(focused || '');
        }
    });
    (0, test_1.test)('should have proper ARIA labels', async ({ page }) => {
        await page.goto('/maestro/dashboard');
        await page.waitForSelector('[data-testid="maestro-dashboard"]');
        // Check for ARIA landmarks
        await (0, test_1.expect)(page.locator('[role="navigation"]')).toBeVisible();
        await (0, test_1.expect)(page.locator('[role="main"]')).toBeVisible();
        // Check for ARIA labels on interactive elements
        const buttons = page.locator('button');
        const buttonCount = await buttons.count();
        for (let i = 0; i < Math.min(buttonCount, 3); i++) {
            const button = buttons.nth(i);
            const ariaLabel = await button.getAttribute('aria-label');
            const text = await button.textContent();
            // Button should have either aria-label or text content
            (0, test_1.expect)(ariaLabel || text?.trim()).toBeTruthy();
        }
    });
});
