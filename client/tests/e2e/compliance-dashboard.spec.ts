import { test, expect } from '@playwright/test';

test.describe('Compliance dashboard', () => {
  test('displays audit, scan, and policy data with exports', async ({ page }) => {
    const now = new Date().toISOString();

    const complianceResponse = {
      data: {
        complianceDashboard: {
          generatedAt: now,
          auditLogs: [
            {
              id: 'audit-1',
              action: 'LOGIN',
              resourceType: 'User',
              resourceId: 'user-1',
              userId: 'user-1',
              userEmail: 'analyst@summit.dev',
              userRole: 'ANALYST',
              ipAddress: '127.0.0.1',
              userAgent: 'Playwright',
              details: { severity: 'info' },
              createdAt: now,
            },
          ],
          securityScans: [
            {
              id: 'scan-1',
              scanType: 'Trivy',
              target: 'registry/intelgraph-api:latest',
              status: 'passed',
              criticalCount: 0,
              highCount: 1,
              mediumCount: 2,
              lowCount: 3,
              totalFindings: 6,
              durationSeconds: 42,
              reportUrl: 'https://example.com/trivy/report',
              metadata: { source: 'trivy' },
              scannedAt: now,
            },
            {
              id: 'scan-2',
              scanType: 'OWASP ZAP',
              target: 'https://intelgraph.dev',
              status: 'failed',
              criticalCount: 1,
              highCount: 1,
              mediumCount: 0,
              lowCount: 0,
              totalFindings: 2,
              durationSeconds: 60,
              reportUrl: 'https://example.com/zap/report',
              metadata: { source: 'zap' },
              scannedAt: now,
            },
          ],
          policyValidations: [
            {
              id: 'policy-1',
              policy: 'access.enforce',
              decision: 'allow',
              allow: true,
              reason: 'OPA evaluation succeeded',
              metadata: { opaTrace: 'ok' },
              evaluatedAt: now,
            },
            {
              id: 'policy-2',
              policy: 'deployment.change',
              decision: 'deny',
              allow: false,
              reason: 'Change window closed',
              metadata: { window: 'maintenance' },
              evaluatedAt: now,
            },
          ],
          metrics: {
            openFindings: 5,
            scanSuccessRate: 0.5,
            policyPassRate: 0.5,
            promMetrics: [
              { name: 'compliance_scan_failures_total', value: 2, labels: { tenant: 'dev' } },
              { name: 'opa_policy_violations_total', value: 1, labels: { tenant: 'dev' } },
            ],
          },
        },
      },
    };

    await page.route('**/graphql*', async (route) => {
      const request = route.request();
      const method = request.method();
      const url = new URL(request.url());

      let operationName = url.searchParams.get('operationName');

      if (!operationName && method === 'POST') {
        try {
          const body = request.postDataJSON();
          operationName = body?.operationName ?? null;
          if (operationName === 'ComplianceDashboard') {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify(complianceResponse),
            });
            return;
          }
          if (operationName === 'CurrentUser') {
            await route.fulfill({
              status: 200,
              contentType: 'application/json',
              body: JSON.stringify({ data: { me: { id: '1', email: 'admin@summit.dev', role: 'ADMIN' } } }),
            });
            return;
          }
        } catch (error) {
          // Ignore JSON parse errors; fall back to GET handler
        }
      }

      if (operationName === 'ComplianceDashboard') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(complianceResponse),
        });
        return;
      }

      if (operationName === 'CurrentUser') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ data: { me: { id: '1', email: 'admin@summit.dev', role: 'ADMIN' } } }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto('/compliance');

    await expect(page.getByRole('heading', { name: /Compliance Dashboard/i })).toBeVisible();
    await expect(page.getByText('Open Findings')).toBeVisible();
    await expect(page.getByText('5')).toBeVisible();
    await expect(page.getByText('50.0%')).toBeVisible();
    await expect(page.getByText('Security Scans (Trivy & OWASP ZAP)')).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Trivy' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'OWASP ZAP' })).toBeVisible();
    await expect(page.getByText('OPA Policy Validations')).toBeVisible();
    await expect(page.getByText('ALLOW')).toBeVisible();
    await expect(page.getByText('DENY')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export CSV' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Export PDF' })).toBeVisible();
    await expect(page.getByText('compliance_scan_failures_total: 2.00')).toBeVisible();
  });
});
