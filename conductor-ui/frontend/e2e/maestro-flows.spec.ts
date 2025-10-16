import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

// Helper to mock authentication state
async function mockAuthentication(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('maestro_auth_access_token', 'mock-jwt-token');
    localStorage.setItem('maestro_auth_id_token', 'mock-id-token');
  });

  // Mock API calls
  await page.route('**/api/maestro/v1/**', async (route) => {
    const url = route.request().url();

    if (url.includes('/runs/run-123/actions')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: { success: true } }),
      });
    } else if (url.includes('/routing/candidates')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            candidates: [
              {
                provider: 'openai',
                model: 'gpt-4',
                score: 0.95,
                latency: 120,
                cost: 0.03,
                availability: 99.9,
              },
              {
                provider: 'anthropic',
                model: 'claude-3-sonnet',
                score: 0.92,
                latency: 110,
                cost: 0.025,
                availability: 99.8,
              },
            ],
          },
        }),
      });
    } else if (url.includes('/evidence/run/run-123')) {
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            id: 'evidence-bundle-456',
            runId: 'run-123',
            attestations: [
              { type: 'SLSA', level: 3, verified: true },
              { type: 'SBOM', verified: true },
            ],
            signature: 'sha256:abcd1234...',
            timestamp: '2025-01-15T10:30:00Z',
          },
        }),
      });
    } else {
      // Default mock response
      await route.fulfill({
        contentType: 'application/json',
        body: JSON.stringify({ data: {} }),
      });
    }
  });
}

test.describe('Maestro Critical User Flows', () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthentication(page);
  });

  test('should complete run promotion flow', async ({ page }) => {
    await page.goto(`${BASE_URL}/maestro/runs/run-123`);

    // Should show run details page
    await expect(page.locator('h1:has-text("run-123")')).toBeVisible();

    // Find and click promote button
    const promoteButton = page.locator('button:has-text("Promote")');
    await expect(promoteButton).toBeVisible();
    await promoteButton.click();

    // Should show promotion modal/form
    await expect(page.locator('text=Promote Run')).toBeVisible();

    // Fill in promotion reason
    const reasonInput = page.locator('textarea[placeholder*="reason"]');
    if (await reasonInput.isVisible()) {
      await reasonInput.fill('Automated promotion after successful testing');
    }

    // Confirm promotion
    const confirmButton = page.locator('button:has-text("Confirm Promotion")');
    if (await confirmButton.isVisible()) {
      await confirmButton.click();
    }

    // Should show success message
    await expect(page.locator('text=promoted successfully')).toBeVisible();
  });

  test('should generate evidence bundle', async ({ page }) => {
    await page.goto(`${BASE_URL}/maestro/runs/run-123`);

    // Navigate to Evidence tab
    await page.click('button:has-text("Evidence")');

    // Should show evidence tab content
    await expect(page.locator('text=Evidence Bundle')).toBeVisible();

    // Click generate evidence bundle button
    const generateButton = page.locator(
      'button:has-text("Generate Evidence Bundle")',
    );
    await expect(generateButton).toBeVisible();
    await generateButton.click();

    // Should show loading state
    await expect(page.locator('text=Generating')).toBeVisible();

    // Should eventually show generated bundle
    await expect(page.locator('text=evidence-bundle-456')).toBeVisible();
    await expect(page.locator('text=SLSA Level 3')).toBeVisible();
    await expect(page.locator('text=Verified')).toBeVisible();
  });

  test('should configure routing preferences', async ({ page }) => {
    await page.goto(`${BASE_URL}/maestro/routing`);

    // Should show routing studio
    await expect(page.locator('h2:has-text("Routing Studio")')).toBeVisible();

    // Should display routing candidates
    await expect(page.locator('text=gpt-4')).toBeVisible();
    await expect(page.locator('text=claude-3-sonnet')).toBeVisible();

    // Should show scores and metrics
    await expect(page.locator('text=Score: 0.95')).toBeVisible();
    await expect(page.locator('text=120ms')).toBeVisible();

    // Pin a route
    const pinButton = page.locator('button:has-text("Pin Route")').first();
    await expect(pinButton).toBeVisible();
    await pinButton.click();

    // Should show pin configuration
    await expect(page.locator('text=Pin Route')).toBeVisible();

    // Set TTL and confirm
    const ttlInput = page.locator('input[placeholder*="TTL"]');
    if (await ttlInput.isVisible()) {
      await ttlInput.fill('3600'); // 1 hour
    }

    const confirmPinButton = page.locator('button:has-text("Confirm Pin")');
    if (await confirmPinButton.isVisible()) {
      await confirmPinButton.click();
    }

    // Should show success message
    await expect(page.locator('text=Route pinned')).toBeVisible();
  });

  test('should handle SLO monitoring workflow', async ({ page }) => {
    await page.goto(`${BASE_URL}/maestro/observability`);

    // Should show observability dashboard
    await expect(page.locator('h2:has-text("Observability")')).toBeVisible();

    // Should show SLO panels
    await expect(page.locator('text=Error Budget')).toBeVisible();
    await expect(page.locator('text=Burn Rate')).toBeVisible();

    // Click on an SLO to see details
    const sloCard = page.locator('[data-testid="slo-card"]').first();
    if (await sloCard.isVisible()) {
      await sloCard.click();
    }

    // Should show SLO detail view
    await expect(page.locator('text=SLO Details')).toBeVisible();

    // Should show historical data
    await expect(page.locator('text=Historical Performance')).toBeVisible();
  });

  test('should handle alert acknowledgment', async ({ page }) => {
    await page.goto(`${BASE_URL}/maestro/alertcenter`);

    // Should show alert center
    await expect(page.locator('h2:has-text("Alert Center")')).toBeVisible();

    // Should list active alerts
    const alertRow = page.locator('[data-testid="alert-row"]').first();
    if (await alertRow.isVisible()) {
      // Click acknowledge button
      const ackButton = alertRow.locator('button:has-text("Acknowledge")');
      await ackButton.click();

      // Should show acknowledgment form
      await expect(page.locator('text=Acknowledge Alert')).toBeVisible();

      // Fill assignee
      const assigneeInput = page.locator('input[placeholder*="assignee"]');
      if (await assigneeInput.isVisible()) {
        await assigneeInput.fill('ops-team@example.com');
      }

      // Add note
      const noteInput = page.locator('textarea[placeholder*="note"]');
      if (await noteInput.isVisible()) {
        await noteInput.fill('Investigating root cause');
      }

      // Submit acknowledgment
      const submitButton = page.locator('button:has-text("Acknowledge")');
      await submitButton.click();

      // Should show success message
      await expect(page.locator('text=Alert acknowledged')).toBeVisible();
    }
  });

  test('should handle budget management', async ({ page }) => {
    await page.goto(`${BASE_URL}/maestro/cost`);

    // Should show cost dashboard
    await expect(page.locator('h2:has-text("Costs & Budgets")')).toBeVisible();

    // Should show current spend
    await expect(page.locator('text=Today:')).toBeVisible();
    await expect(page.locator('text=Hard cap:')).toBeVisible();

    // Edit budget cap
    const capInput = page.locator('input[id="cap"]');
    await expect(capInput).toBeVisible();
    await capInput.clear();
    await capInput.fill('60000');

    // Save budget changes
    const saveButton = page.locator('button:has-text("Save")');
    await saveButton.click();

    // Should show save confirmation
    await expect(page.locator('text=Saved')).toBeVisible();
  });

  test('should handle pipeline simulation', async ({ page }) => {
    await page.goto(`${BASE_URL}/maestro/pipelines/pipeline-123`);

    // Should show pipeline detail
    await expect(page.locator('h1:has-text("pipeline-123")')).toBeVisible();

    // Find simulate button
    const simulateButton = page.locator('button:has-text("Simulate")');
    if (await simulateButton.isVisible()) {
      await simulateButton.click();

      // Should show simulation dialog
      await expect(page.locator('text=Pipeline Simulation')).toBeVisible();

      // Make a simulated change
      const changeInput = page.locator('textarea[placeholder*="changes"]');
      if (await changeInput.isVisible()) {
        await changeInput.fill('{"timeout": 300}');
      }

      // Run simulation
      const runSimButton = page.locator('button:has-text("Run Simulation")');
      await runSimButton.click();

      // Should show simulation results
      await expect(page.locator('text=Simulation Results')).toBeVisible();
      await expect(page.locator('text=Impact Analysis')).toBeVisible();
    }
  });

  test('should handle role-based access', async ({ page }) => {
    // Test access to admin-only features
    await page.goto(`${BASE_URL}/maestro/admin`);

    // Might show access denied or admin interface depending on mock user roles
    const heading = page.locator('h2');
    const headingText = await heading.textContent();

    expect(headingText).toMatch(/(Admin Studio|Access Denied)/);

    // Test access to operator features
    await page.goto(`${BASE_URL}/maestro/autonomy`);

    // Should show autonomy controls if user has operator role
    await expect(page.locator('h2:has-text("Autonomy")')).toBeVisible();
  });
});
