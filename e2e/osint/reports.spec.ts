import { expect } from '@playwright/test';
import { test } from '../fixtures/osint-fixtures';

test.describe('OSINT reports and exports @osint-p0', () => {
  test('generates an investigation report and renders it', async ({ page, osintMocks }) => {
    void osintMocks;
    const reportData = {
      title: 'OSINT Investigation Report',
      investigationId: 'INV-2025-001',
      findings: [
        'Open port 8080 found on target host.',
        'Suspicious DNS queries detected to known C2 domains.',
      ],
      evidence: [
        'Nmap scan results showing port 8080 open.',
        'DNS logs timestamped 2025-05-20.',
      ],
      metadata: {
        analyst: 'Jules',
        classification: 'CONFIDENTIAL',
      },
      format: 'html',
    };

    const response = await page.evaluate(async (payload) => {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return res.json();
    }, reportData);

    expect(response.success).toBe(true);
    expect(response.url).toContain('/uploads/reports/');

    await page.goto(response.url);
    await expect(page).toHaveTitle(/OSINT Investigation Report/);
    await expect(page.locator('h1')).toHaveText('OSINT Investigation Report');
    await expect(page.locator('.findings')).toContainText('Open port 8080');
    await expect(page.locator('.evidence')).toContainText('Nmap scan results');
  });

  test('supports concurrent report generation without race conditions', async ({
    page,
    osintMocks,
  }) => {
    void osintMocks;
    const payloads = Array.from({ length: 5 }).map((_, i) => ({
      title: `Concurrent Report ${i}`,
      findings: [`Finding ${i}`],
      evidence: [`Evidence ${i}`],
      format: 'html',
    }));

    const results = await page.evaluate(async (items) => {
      return Promise.all(
        items.map(async (payload) => {
          const res = await fetch('/api/reports/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          return res.json();
        })
      );
    }, payloads);

    for (const result of results) {
      expect(result.success).toBe(true);
      expect(result.url).toContain('/uploads/reports/');
    }
  });
});
