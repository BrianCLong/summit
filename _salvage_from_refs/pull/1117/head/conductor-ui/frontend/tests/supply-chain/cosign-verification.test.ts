import { test, expect } from '@playwright/test';

test.describe('Supply Chain Verification @supply-chain', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/maestro/runs/run_001');
    await page.waitForLoadState('networkidle');
  });

  test('should display supply chain verification panel', async ({ page }) => {
    // Look for supply chain verification section
    const verificationPanel = page.locator('[data-testid="supply-chain-verification"]');
    await expect(verificationPanel).toBeVisible();

    // Check for key elements
    await expect(page.locator('text=Supply Chain Verification')).toBeVisible();
    await expect(
      page.locator('text=Cosign signatures, SBOM analysis, and SLSA provenance verification'),
    ).toBeVisible();
  });

  test('should show verification status for artifacts', async ({ page }) => {
    // Mock some artifacts for testing
    await page.route('/api/maestro/v1/runs/*/supply-chain/verify', async (route) => {
      const mockResults = {
        runId: 'run_001',
        results: [
          {
            artifact: 'ghcr.io/example/app:v1.0.0',
            cosignVerification: {
              verified: true,
              signatureValid: true,
              certificateValid: true,
              rekorEntryValid: true,
              fulcioIssuer: 'https://accounts.google.com',
              subject: 'user@example.com',
            },
            sbom: {
              success: true,
              format: 'spdx-json',
              sbom: {
                bomFormat: 'CycloneDX',
                specVersion: '1.4',
                components: [
                  { name: 'express', version: '4.18.0', type: 'library' },
                  { name: 'lodash', version: '4.17.21', type: 'library' },
                ],
              },
            },
            slsa: {
              success: true,
              predicateType: 'https://slsa.dev/provenance/v0.2',
              attestations: [
                {
                  predicate: {
                    builder: { id: 'https://github.com/actions/runner' },
                    buildType: 'https://github.com/actions/workflow',
                    metadata: { buildInvocationId: 'build-123' },
                  },
                },
              ],
            },
            timestamp: new Date().toISOString(),
          },
        ],
      };

      await route.fulfill({ json: mockResults });
    });

    // Click verify button
    await page.click('button:has-text("Verify All")');
    await page.waitForTimeout(1000);

    // Check verification results
    await expect(page.locator('text=✓ Verified')).toBeVisible();
    await expect(page.locator('text=ghcr.io/example/app:v1.0.0')).toBeVisible();
  });

  test('should expand verification details', async ({ page }) => {
    // Mock verification results
    await page.route('/api/maestro/v1/runs/*/supply-chain/verify', async (route) => {
      await route.fulfill({
        json: {
          runId: 'run_001',
          results: [
            {
              artifact: 'test/image:latest',
              cosignVerification: {
                verified: true,
                signatureValid: true,
                certificateValid: true,
                rekorEntryValid: true,
              },
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    });

    await page.click('button:has-text("Verify All")');
    await page.waitForTimeout(500);

    // Expand details
    await page.click('button:has-text("Show Details")');

    // Check detailed verification info
    await expect(page.locator('text=Cosign Signature')).toBeVisible();
    await expect(page.locator('text=✓ Valid')).toBeVisible();
  });

  test('should handle verification failures', async ({ page }) => {
    // Mock failed verification
    await page.route('/api/maestro/v1/runs/*/supply-chain/verify', async (route) => {
      await route.fulfill({
        json: {
          runId: 'run_001',
          results: [
            {
              artifact: 'insecure/image:latest',
              cosignVerification: {
                verified: false,
                signatureValid: false,
                error: 'No signature found',
              },
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    });

    await page.click('button:has-text("Verify All")');
    await page.waitForTimeout(500);

    // Check failure indicators
    await expect(page.locator('text=✗ Failed')).toBeVisible();
    await expect(page.locator('text=No signature found')).toBeVisible();
  });

  test('should show SBOM vulnerability information', async ({ page }) => {
    await page.route('/api/maestro/v1/runs/*/supply-chain/verify', async (route) => {
      await route.fulfill({
        json: {
          runId: 'run_001',
          results: [
            {
              artifact: 'vulnerable/image:latest',
              sbom: {
                success: true,
                sbom: {
                  components: [{ name: 'vulnerable-lib', version: '1.0.0' }],
                },
                vulnerabilities: [
                  {
                    id: 'CVE-2023-12345',
                    severity: 'critical',
                    component: 'vulnerable-lib',
                    version: '1.0.0',
                    fixedVersion: '1.0.1',
                  },
                ],
              },
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    });

    await page.click('button:has-text("Verify All")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Show Details")');

    // Check vulnerability information
    await expect(page.locator('text=CVE-2023-12345')).toBeVisible();
    await expect(page.locator('text=critical')).toBeVisible();
  });

  test('should display SLSA provenance levels', async ({ page }) => {
    await page.route('/api/maestro/v1/runs/*/supply-chain/verify', async (route) => {
      await route.fulfill({
        json: {
          runId: 'run_001',
          results: [
            {
              artifact: 'slsa/image:latest',
              slsa: {
                success: true,
                level: 3,
                buildPlatform: 'https://github.com/actions/runner',
                sourceRepository: 'https://github.com/org/repo',
              },
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    });

    await page.click('button:has-text("Verify All")');
    await page.waitForTimeout(500);
    await page.click('button:has-text("Show Details")');

    // Check SLSA level display
    await expect(page.locator('text=Level 3')).toBeVisible();
    await expect(page.locator('text=https://github.com/actions/runner')).toBeVisible();
  });

  test('should allow configuration of verification options', async ({ page }) => {
    // Check default options
    await expect(page.locator('input[type="checkbox"]:checked')).toHaveCount(2); // SBOM and SLSA required by default

    // Change SLSA level requirement
    await page.selectOption('select', '3');
    await expect(page.locator('select')).toHaveValue('3');

    // Toggle SBOM requirement
    await page.uncheck('input[type="checkbox"]');
    await expect(page.locator('input[type="checkbox"]:checked')).toHaveCount(1);
  });

  test('should show loading state during verification', async ({ page }) => {
    // Mock slow response
    await page.route('/api/maestro/v1/runs/*/supply-chain/verify', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      await route.fulfill({ json: { runId: 'run_001', results: [] } });
    });

    await page.click('button:has-text("Verify All")');

    // Check loading indicators
    await expect(page.locator('button:has-text("Verifying...")')).toBeVisible();
    await expect(page.locator('text=Verifying supply chain integrity...')).toBeVisible();
    await expect(page.locator('.animate-spin')).toBeVisible();
  });

  test('should display summary statistics', async ({ page }) => {
    await page.route('/api/maestro/v1/runs/*/supply-chain/verify', async (route) => {
      await route.fulfill({
        json: {
          runId: 'run_001',
          results: [
            {
              artifact: 'app1:v1',
              cosignVerification: { verified: true },
              sbom: { success: true, vulnerabilities: [] },
              slsa: { success: true, level: 2 },
            },
            {
              artifact: 'app2:v1',
              cosignVerification: { verified: false },
              sbom: { success: false },
              slsa: { success: false },
            },
          ],
        },
      });
    });

    await page.click('button:has-text("Verify All")');
    await page.waitForTimeout(500);

    // Check summary stats
    await expect(page.locator('text=2').first()).toBeVisible(); // Total
    await expect(page.locator('text=1').nth(1)).toBeVisible(); // Verified
    await expect(page.locator('text=1').nth(2)).toBeVisible(); // Failed
  });

  test('should be keyboard accessible', async ({ page }) => {
    // Tab to verify button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Should be able to trigger verification with Enter
    await page.keyboard.press('Enter');
    await page.waitForTimeout(100);

    // Should be able to navigate options with keyboard
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space'); // Toggle checkbox
  });

  test('should handle API errors gracefully', async ({ page }) => {
    await page.route('/api/maestro/v1/runs/*/supply-chain/verify', async (route) => {
      await route.fulfill({
        status: 500,
        json: { error: 'Verification service unavailable' },
      });
    });

    await page.click('button:has-text("Verify All")');
    await page.waitForTimeout(500);

    // Should show error message
    await expect(page.locator('text=Verification service unavailable')).toBeVisible();
  });

  test('should persist verification results', async ({ page }) => {
    await page.route('/api/maestro/v1/runs/*/supply-chain/verify', async (route) => {
      await route.fulfill({
        json: {
          runId: 'run_001',
          results: [
            {
              artifact: 'persistent/image:v1',
              cosignVerification: { verified: true },
              timestamp: new Date().toISOString(),
            },
          ],
        },
      });
    });

    await page.click('button:has-text("Verify All")');
    await page.waitForTimeout(500);

    // Results should persist after navigation
    await page.goBack();
    await page.goForward();

    await expect(page.locator('text=persistent/image:v1')).toBeVisible();
    await expect(page.locator('text=✓ Verified')).toBeVisible();
  });
});
