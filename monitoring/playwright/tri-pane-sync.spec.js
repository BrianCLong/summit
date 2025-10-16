// Playwright E2E Test - UI Overlays & Tri-Pane Synchronization
// Tests the enhanced UI features from GA-Core Integration Train
import { test, expect } from '@playwright/test';

test.describe('GA-Core UI Features - Tri-Pane & Overlays', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto(process.env.UI_URL || 'http://localhost:4000');

    // Authentication flow
    await page.fill(
      '[data-test=login-email]',
      process.env.TEST_USER_EMAIL || 'test@intelgraph.com',
    );
    await page.fill(
      '[data-test=login-pass]',
      process.env.TEST_USER_PASS || 'testpass123',
    );
    await page.click('[data-test=login-submit]');

    // Wait for dashboard to load
    await page.waitForSelector('[data-test=dashboard]', { timeout: 10000 });
  });

  test('tri-pane sync + XAI/provenance overlays', async ({ page }) => {
    // Navigate to cases
    await page.getByText('Cases').click();
    await page.waitForSelector('[data-test=cases-list]');

    // Open a specific case
    await page.getByRole('row', { name: /CASE-123/ }).click();
    await page.waitForSelector('[data-test=tri-pane-explorer]');

    // Verify tri-pane layout is present
    await expect(page.locator('[data-test=timeline-pane]')).toBeVisible();
    await expect(page.locator('[data-test=map-pane]')).toBeVisible();
    await expect(page.locator('[data-test=graph-pane]')).toBeVisible();

    // Toggle XAI overlay
    await page.click('[data-test=overlay-xai]');
    await page.waitForTimeout(1000); // Allow overlay to render

    // Verify XAI badges appear on graph nodes
    await expect(page.locator('[data-badge=xai]')).toHaveCountGreaterThan(1);

    // Toggle provenance overlay
    await page.click('[data-test=overlay-prov]');
    await page.waitForTimeout(1000);

    // Verify provenance badges appear
    await expect(page.locator('[data-badge=prov]')).toHaveCountGreaterThan(1);

    // Test tri-pane synchronization
    // Timeline scrub should update graph selection
    await page.click('[data-test=timeline-scrub-10m]');
    await page.waitForTimeout(500);

    // Verify graph selection updates
    await expect(page.locator('[data-test=graph-selection]')).toBeVisible();
    await expect(
      page.locator('[data-test=selected-entities]'),
    ).toHaveCountGreaterThan(0);

    // Verify map pane also updates with selected entities
    await expect(
      page.locator('[data-test=map-markers]'),
    ).toHaveCountGreaterThan(0);
  });

  test('keyboard shortcuts and navigation', async ({ page }) => {
    await page.getByText('Cases').click();
    await page.getByRole('row', { name: /CASE-123/ }).click();

    // Test keyboard shortcuts for pane navigation
    await page.keyboard.press('Control+1'); // Timeline pane
    await expect(page.locator('[data-test=timeline-pane]')).toBeFocused();

    await page.keyboard.press('Control+2'); // Map pane
    await expect(page.locator('[data-test=map-pane]')).toBeFocused();

    await page.keyboard.press('Control+3'); // Graph pane
    await expect(page.locator('[data-test=graph-pane]')).toBeFocused();

    // Test overlay shortcuts
    await page.keyboard.press('Control+X'); // XAI overlay toggle
    await page.waitForTimeout(500);

    await page.keyboard.press('Control+P'); // Provenance overlay toggle
    await page.waitForTimeout(500);

    // Verify overlays are active
    const xaiOverlay = page.locator('[data-test=overlay-xai]');
    const provOverlay = page.locator('[data-test=overlay-prov]');

    await expect(xaiOverlay).toHaveAttribute('aria-pressed', 'true');
    await expect(provOverlay).toHaveAttribute('aria-pressed', 'true');
  });

  test('golden path demo mode', async ({ page }) => {
    // Navigate to demo mode
    await page.click('[data-test=demo-mode]');
    await page.waitForSelector('[data-test=golden-path-demo]');

    // Start automated demo
    await page.click('[data-test=start-demo]');

    // Verify 4-step demo progression
    // Step 1: Data ingestion
    await expect(page.locator('[data-test=demo-step-1]')).toBeVisible();
    await page.waitForSelector('[data-test=demo-step-1-complete]', {
      timeout: 10000,
    });

    // Step 2: XAI explanation
    await expect(page.locator('[data-test=demo-step-2]')).toBeVisible();
    await page.waitForSelector('[data-test=demo-step-2-complete]', {
      timeout: 10000,
    });

    // Step 3: Provenance verification
    await expect(page.locator('[data-test=demo-step-3]')).toBeVisible();
    await page.waitForSelector('[data-test=demo-step-3-complete]', {
      timeout: 10000,
    });

    // Step 4: Export with authority binding
    await expect(page.locator('[data-test=demo-step-4]')).toBeVisible();
    await page.waitForSelector('[data-test=demo-step-4-complete]', {
      timeout: 10000,
    });

    // Verify demo completion
    await expect(page.locator('[data-test=demo-complete]')).toBeVisible();
    await expect(page.getByText('Golden Path Demo Complete')).toBeVisible();
  });

  test('real-time confidence scoring and source attribution', async ({
    page,
  }) => {
    await page.getByText('Cases').click();
    await page.getByRole('row', { name: /CASE-123/ }).click();

    // Enable XAI overlay to see confidence scores
    await page.click('[data-test=overlay-xai]');
    await page.waitForTimeout(1000);

    // Verify confidence indicators are present
    await expect(
      page.locator('[data-test=confidence-indicator]'),
    ).toHaveCountGreaterThan(0);

    // Check confidence score values are within expected range (0-100)
    const confidenceElements = await page
      .locator('[data-test=confidence-score]')
      .all();
    for (const element of confidenceElements) {
      const score = await element.textContent();
      const scoreValue = parseInt(score?.replace('%', '') || '0');
      expect(scoreValue).toBeGreaterThanOrEqual(0);
      expect(scoreValue).toBeLessThanOrEqual(100);
    }

    // Verify source attribution
    await expect(
      page.locator('[data-test=source-attribution]'),
    ).toHaveCountGreaterThan(0);

    // Click on an entity to see detailed attribution
    await page.locator('[data-test=graph-entity]').first().click();
    await expect(page.locator('[data-test=entity-details]')).toBeVisible();
    await expect(page.locator('[data-test=source-list]')).toBeVisible();
  });

  test('authority binding and clearance validation', async ({ page }) => {
    // Test with a restricted operation (export)
    await page.getByText('Cases').click();
    await page.getByRole('row', { name: /CASE-123/ }).click();

    // Attempt to export (should be restricted for test user)
    await page.click('[data-test=export-button]');

    // Should show authority binding dialog or denial
    const authorityDialog = page.locator('[data-test=authority-required]');
    const accessDenied = page.locator('[data-test=access-denied]');

    // Either authority dialog or access denied should appear
    await expect(authorityDialog.or(accessDenied)).toBeVisible({
      timeout: 5000,
    });

    // If authority dialog, verify it shows clearance requirements
    if (await authorityDialog.isVisible()) {
      await expect(page.locator('[data-test=clearance-level]')).toBeVisible();
      await expect(page.locator('[data-test=jurisdiction]')).toBeVisible();
      await expect(page.locator('[data-test=expiry-date]')).toBeVisible();
    }
  });

  test('performance budget compliance', async ({ page }) => {
    // Monitor Core Web Vitals during navigation
    let lcp = 0;
    let fid = 0;
    let cls = 0;

    // Capture web vitals
    await page.evaluateOnNewDocument(() => {
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === 'LCP') {
            window.lcp = entry.startTime;
          } else if (entry.name === 'FID') {
            window.fid = entry.duration;
          } else if (entry.name === 'CLS') {
            window.cls = entry.value;
          }
        }
      }).observe({ type: 'largest-contentful-paint', buffered: true });
    });

    // Navigate through the application
    await page.getByText('Cases').click();
    await page.waitForLoadState('networkidle');

    // Get performance metrics
    const metrics = await page.evaluate(() => ({
      lcp: window.lcp || 0,
      fid: window.fid || 0,
      cls: window.cls || 0,
    }));

    // Validate against Core Web Vitals thresholds
    expect(metrics.lcp).toBeLessThan(2500); // LCP < 2.5s
    expect(metrics.fid).toBeLessThan(100); // FID < 100ms
    expect(metrics.cls).toBeLessThan(0.1); // CLS < 0.1
  });
});

// Accessibility tests
test.describe('GA-Core Accessibility Compliance', () => {
  test('keyboard navigation and screen reader support', async ({ page }) => {
    await page.goto(process.env.UI_URL || 'http://localhost:4000');

    // Test tab navigation
    await page.keyboard.press('Tab');
    await expect(page.locator(':focus')).toBeVisible();

    // Continue tabbing through key elements
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      const focusedElement = page.locator(':focus');
      await expect(focusedElement).toBeVisible();

      // Verify focused element has proper ARIA attributes
      const ariaLabel = await focusedElement.getAttribute('aria-label');
      const ariaRole = await focusedElement.getAttribute('role');

      // At least one accessibility attribute should be present
      expect(ariaLabel || ariaRole).toBeTruthy();
    }
  });
});
