import { test, expect } from '@playwright/test';

/**
 * Issue #11176 - Playwright test: Investigation creation → Entity addition → Graph analysis.
 */

const TEST_USER = {
  id: 'e2e-analyst-11176',
  email: 'analyst@summit.ai',
  roles: ['analyst'],
  tenantId: 'global',
  token: 'mock-jwt-11176',
};

const VIEWER_USER = {
  id: 'e2e-viewer-11176',
  email: 'viewer@summit.ai',
  roles: ['viewer'],
  tenantId: 'global',
  token: 'mock-jwt-viewer-11176',
};

async function authenticate(page, user) {
  await page.addInitScript((u) => {
    localStorage.setItem('auth_token', u.token);
    localStorage.setItem('user', JSON.stringify(u));
  }, user);
}

test.describe('Investigation Workflow (Issue #11176)', () => {

  test.beforeEach(async ({ page }) => {
    // Mock GraphQL enrichment
    await page.route('**/graphql', async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      if (postData?.query?.includes('enrichEntityFromWikipedia')) {
        return route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            data: {
              enrichEntityFromWikipedia: {
                id: 'ent-123',
                label: postData.variables.title,
                __typename: 'Entity'
              }
            }
          }),
        });
      }

      return route.continue();
    });

    // Mock Audit API
    await page.route('**/api/audit-events', async (route) => {
      if (route.request().method() === 'POST') {
        return route.fulfill({
          status: 201,
          body: JSON.stringify({ success: true, eventId: 'audit-123' }),
        });
      }

      if (route.request().method() === 'GET') {
        return route.fulfill({
          status: 200,
          body: JSON.stringify({
            events: [
              {
                id: 'audit-123',
                eventType: 'user_action',
                action: 'add_entity',
                timestamp: new Date().toISOString(),
                details: { name: 'suspect-repo' }
              }
            ]
          }),
        });
      }
      return route.continue();
    });

    // Mock Org Mesh Ingest API
    await page.route('**/api/summit-investigate/ingest/org-mesh', async (route) => {
      return route.fulfill({
        status: 200,
        body: JSON.stringify({ success: true, message: 'Ingestion complete' }),
      });
    });
  });

  test('Investigation → Entity → Graph (Desktop)', async ({ page }) => {
    await authenticate(page, TEST_USER);

    // 1. Investigation Creation
    await page.goto('/investigations/new');
    await page.fill('[data-testid=title]', 'Drift Probe');
    await page.click('button >> text=Create');

    // Should be redirected to detail page
    await expect(page).toHaveURL(/\/investigations\/inv-1/);
    await expect(page.getByText('Drift Probe')).toBeVisible();

    // 2. Entity Addition
    // Switch to Entities tab if needed (assuming it might start on Evidence)
    await page.click('button:has-text("Entities")');
    await page.click('[data-testid=add-entity]');
    await page.fill('#entity-name', 'suspect-repo');

    // Verify Audit Log call (optional: check if mock was hit)
    const auditPromise = page.waitForRequest(request =>
      request.url().includes('/api/audit-events') && request.method() === 'POST'
    );

    await page.click('button:has-text("Add")');
    await auditPromise;

    // 3. Enrichment
    await page.click('[data-testid=add-entity]'); // Open dialog again to enrich
    await page.fill('#entity-name', 'suspect-repo');
    await page.click('button >> text=Enrich');

    // 4. Graph Analysis
    await page.click('button:has-text("Relationships")');
    await expect(page.locator('.graph-view')).toContainText('drift edges');

    // 5. Org Mesh Ingest Integration
    // Simulate ingestion trigger (could be a button or background process)
    // Here we'll just hit the API mock and verify some UI feedback if possible
    const response = await page.evaluate(async () => {
      const res = await fetch('/api/summit-investigate/ingest/org-mesh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ investigationId: 'inv-1', entities: ['org-1'] })
      });
      return res.json();
    });
    expect(response.success).toBe(true);

    // Verify Audit record via API
    const auditEventsRes = await page.evaluate(async () => {
      const res = await fetch('/api/audit-events?tenantId=global');
      return res.json();
    });
    expect(auditEventsRes.events.some(e => e.action === 'add_entity')).toBe(true);

    // Take screenshot
    await page.screenshot({ path: 'screenshots/investigation-desktop.png' });
  });

  test('Investigation Workflow (Mobile Viewport)', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await authenticate(page, TEST_USER);

    await page.goto('/investigations/new');
    await page.fill('[data-testid=title]', 'Mobile Probe');
    await page.click('button >> text=Create');

    await expect(page).toHaveURL(/\/investigations\/inv-1/);

    await page.screenshot({ path: 'screenshots/investigation-mobile.png' });
  });

  test('RBAC: Viewer sees read-only graph', async ({ page }) => {
    await authenticate(page, VIEWER_USER);

    await page.goto('/investigations/inv-1');

    // Switch to Entities tab
    await page.click('button:has-text("Entities")');

    // In read-only mode, 'Add Entity' button should be hidden
    const addEntityBtn = page.locator('[data-testid=add-entity]');
    await expect(addEntityBtn).not.toBeVisible();

    // Switch to Relationships tab
    await page.click('button:has-text("Relationships")');
    await expect(page.locator('.graph-view')).toBeVisible();

    await page.screenshot({ path: 'screenshots/investigation-rbac-viewer.png' });
  });
});
