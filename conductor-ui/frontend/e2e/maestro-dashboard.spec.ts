import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Helper to mock authentication state
async function mockAuthentication(page: Page) {
  // Mock the auth storage
  await page.addInitScript(() => {
    localStorage.setItem('maestro_auth_access_token', 'mock-jwt-token');
    localStorage.setItem('maestro_auth_id_token', 'mock-id-token');
  });

  // Mock API responses
  await page.route('**/api/maestro/v1/summary', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          autonomy: { level: 3, canary: 0.15 },
          health: { success: 0.997, p95: 150, burn: 1.2 },
          budgets: { remaining: 15000, cap: 50000 },
          runs: [
            { id: 'run-123', status: 'running' },
            { id: 'run-124', status: 'completed' },
            { id: 'run-125', status: 'failed' },
          ],
          approvals: [],
          changes: [
            {
              at: '2025-01-15T10:00:00Z',
              title: 'Updated pipeline config',
              by: 'alice@example.com',
            },
            {
              at: '2025-01-15T09:30:00Z',
              title: 'Deployed v2.1.0',
              by: 'bob@example.com',
            },
          ],
        },
      }),
    });
  });

  await page.route('**/api/maestro/v1/runs**', async (route) => {
    await route.fulfill({
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          runs: [
            {
              id: 'run-123',
              pipeline: 'main-build',
              status: 'running',
              createdAt: '2025-01-15T10:00:00Z',
              duration: 120,
              trigger: 'webhook',
              environment: 'production',
            },
            {
              id: 'run-124',
              pipeline: 'test-suite',
              status: 'completed',
              createdAt: '2025-01-15T09:45:00Z',
              duration: 300,
              trigger: 'schedule',
              environment: 'staging',
            },
          ],
          pagination: {
            total: 2,
            hasMore: false,
          },
        },
      }),
    });
  });
}

test.describe('Maestro Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthentication(page);
    await page.goto(`${BASE_URL}/maestro`);
  });

  test('should display control hub overview', async ({ page }) => {
    // Wait for the page to load
    await expect(page.locator('h2:has-text("Release Overview")')).toBeVisible();

    // Check key metrics are displayed
    await expect(page.locator('text=Success Rate')).toBeVisible();
    await expect(page.locator('text=99.7%')).toBeVisible();

    // Check autonomy level
    await expect(page.locator('text=L3')).toBeVisible();

    // Check budget information
    await expect(page.locator('text=$15,000')).toBeVisible();
  });

  test('should navigate to runs page', async ({ page }) => {
    // Click on Runs navigation
    await page.click('a[href="/runs"]');

    // Should navigate to runs page
    await expect(page).toHaveURL(/.*\/maestro\/runs/);
    await expect(page.locator('h2:has-text("Runs & Pipelines")')).toBeVisible();

    // Should show runs table
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('text=run-123')).toBeVisible();
    await expect(page.locator('text=running')).toBeVisible();
  });

  test('should display run details', async ({ page }) => {
    await page.goto(`${BASE_URL}/maestro/runs`);

    // Mock individual run detail
    await page.route('**/api/maestro/v1/runs/run-123', async (route) => {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'run-123',
            pipeline: 'main-build',
            status: 'running',
            createdAt: '2025-01-15T10:00:00Z',
            duration: 120,
            steps: [
              {
                id: 'checkout',
                name: 'Checkout Code',
                status: 'completed',
                duration: 10,
              },
              {
                id: 'build',
                name: 'Build Application',
                status: 'running',
                duration: 90,
              },
              { id: 'test', name: 'Run Tests', status: 'pending', duration: 0 },
            ],
            artifacts: [],
            logs: ['Starting build process...', 'Compiling sources...'],
          },
        }),
      });
    });

    // Click on a run to view details
    await page.click('text=run-123');

    // Should navigate to run detail page
    await expect(page).toHaveURL(/.*\/maestro\/runs\/run-123/);
    await expect(page.locator('h1:has-text("run-123")')).toBeVisible();

    // Should show run timeline
    await expect(page.locator('text=Timeline')).toBeVisible();
    await expect(page.locator('text=Checkout Code')).toBeVisible();
    await expect(page.locator('text=Build Application')).toBeVisible();
  });

  test('should show user profile menu', async ({ page }) => {
    // Mock user profile API
    await page.addInitScript(() => {
      (window as any).__USER_MOCK__ = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user', 'operator'],
        permissions: ['runs:read', 'pipelines:read'],
        tenant: 'acme-corp',
      };
    });

    // Click on user profile (avatar)
    await page.click('[aria-label="User menu"]');

    // Should show user menu
    await expect(page.locator('text=test@example.com')).toBeVisible();
    await expect(page.locator('text=acme-corp')).toBeVisible();
    await expect(page.locator('text=via OIDC')).toBeVisible();

    // Should show roles
    await expect(page.locator('text=user')).toBeVisible();
    await expect(page.locator('text=operator')).toBeVisible();

    // Should have sign out button
    await expect(page.locator('button:has-text("Sign Out")')).toBeVisible();
  });

  test('should show observability dashboard', async ({ page }) => {
    await page.click('a[href="/observability"]');

    // Should navigate to observability page
    await expect(page).toHaveURL(/.*\/maestro\/observability/);
    await expect(
      page.locator('h2:has-text("Observability & SLOs")'),
    ).toBeVisible();

    // Should show SLO metrics
    await expect(page.locator('text=Error Budget')).toBeVisible();
    await expect(page.locator('text=P95 Latency')).toBeVisible();
    await expect(page.locator('text=Throughput')).toBeVisible();
  });

  test('should handle command palette', async ({ page }) => {
    // Press Cmd+K (or Ctrl+K on non-Mac)
    await page.keyboard.press('Meta+KeyK');

    // Should open command palette
    await expect(page.locator('[aria-label="Command palette"]')).toBeVisible();

    // Type to search
    await page.keyboard.type('runs');

    // Should show filtered results
    await expect(page.locator('text=Go to Runs')).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');

    // Should close command palette
    await expect(page.locator('[aria-label="Command palette"]')).toBeHidden();
  });

  test('should handle responsive navigation', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 640, height: 800 });

    // Navigation should still be accessible
    await expect(page.locator('nav')).toBeVisible();

    // Key navigation items should be visible
    await expect(page.locator('a:has-text("Runs")')).toBeVisible();
    await expect(page.locator('a:has-text("Observability")')).toBeVisible();
  });
});
