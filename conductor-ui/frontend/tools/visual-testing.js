#!/usr/bin/env node

/**
 * Visual Testing and Screenshot Comparison Tool
 * Uses Playwright for visual regression testing
 */

import { chromium } from 'playwright';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
} from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const root = resolve(__dirname, '..');

class VisualTesting {
  constructor(baseUrl = 'http://localhost:5173') {
    this.baseUrl = baseUrl;
    this.browser = null;
    this.screenshotDir = join(root, 'test-results', 'screenshots');
    this.baselineDir = join(this.screenshotDir, 'baseline');
    this.currentDir = join(this.screenshotDir, 'current');
    this.diffDir = join(this.screenshotDir, 'diff');

    this.testCases = [
      {
        name: 'maestro-login',
        url: '/maestro/login',
        viewport: { width: 1280, height: 720 },
      },
      {
        name: 'maestro-dashboard',
        url: '/maestro',
        viewport: { width: 1280, height: 720 },
        requireAuth: true,
      },
      {
        name: 'maestro-runs-list',
        url: '/maestro/runs',
        viewport: { width: 1280, height: 720 },
        requireAuth: true,
      },
      {
        name: 'maestro-observability',
        url: '/maestro/observability',
        viewport: { width: 1280, height: 720 },
        requireAuth: true,
      },
      {
        name: 'maestro-routing-studio',
        url: '/maestro/routing',
        viewport: { width: 1280, height: 720 },
        requireAuth: true,
      },
      // Mobile viewports
      {
        name: 'maestro-dashboard-mobile',
        url: '/maestro',
        viewport: { width: 375, height: 667 },
        requireAuth: true,
      },
      {
        name: 'maestro-runs-mobile',
        url: '/maestro/runs',
        viewport: { width: 375, height: 667 },
        requireAuth: true,
      },
      // Dark mode variants
      {
        name: 'maestro-dashboard-dark',
        url: '/maestro',
        viewport: { width: 1280, height: 720 },
        requireAuth: true,
        colorScheme: 'dark',
      },
    ];
  }

  async setup() {
    console
      .log('🎭 Setting up visual testing...')

      [
        // Create directories
        (this.screenshotDir, this.baselineDir, this.currentDir, this.diffDir)
      ].forEach((dir) => {
        if (!existsSync(dir)) {
          mkdirSync(dir, { recursive: true });
        }
      });

    // Launch browser
    this.browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--font-render-hinting=none',
        '--disable-font-subpixel-positioning',
      ],
    });
  }

  async mockAuthentication(page) {
    // Mock authentication for testing
    await page.addInitScript(() => {
      localStorage.setItem('maestro_auth_access_token', 'mock-jwt-token');
      localStorage.setItem('maestro_auth_id_token', 'mock-id-token');

      // Mock user data
      window.__USER_MOCK__ = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
        roles: ['user', 'operator'],
        permissions: ['runs:read', 'pipelines:read'],
        tenant: 'test-corp',
      };
    });

    // Mock API responses
    await page.route('**/api/**', async (route) => {
      const url = route.request().url();

      // Mock different endpoints with appropriate responses
      if (url.includes('/summary')) {
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
              ],
            },
          }),
        });
      } else if (url.includes('/runs')) {
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
                },
              ],
            },
          }),
        });
      } else {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: {} }),
        });
      }
    });
  }

  async captureScreenshots() {
    console.log('📸 Capturing screenshots for all test cases...');

    const results = [];

    for (const testCase of this.testCases) {
      console.log(`  📷 Capturing: ${testCase.name}`);

      try {
        const context = await this.browser.newContext({
          viewport: testCase.viewport,
          colorScheme: testCase.colorScheme || 'light',
        });

        const page = await context.newPage();

        // Mock authentication if required
        if (testCase.requireAuth) {
          await this.mockAuthentication(page);
        }

        // Navigate to page
        await page.goto(`${this.baseUrl}${testCase.url}`, {
          waitUntil: 'networkidle',
        });

        // Wait for page to be fully loaded
        await page.waitForTimeout(2000);

        // Hide dynamic elements that cause flaky tests
        await page.addStyleTag({
          content: `
            /* Hide elements that change frequently */
            [data-testid="timestamp"],
            [data-testid="current-time"],
            .animate-spin {
              opacity: 0 !important;
            }
            
            /* Ensure consistent fonts */
            * {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif !important;
            }
          `,
        });

        // Take screenshot
        const screenshotPath = join(this.currentDir, `${testCase.name}.png`);
        await page.screenshot({
          path: screenshotPath,
          fullPage: true,
          animations: 'disabled',
        });

        results.push({
          name: testCase.name,
          status: 'captured',
          path: screenshotPath,
          viewport: testCase.viewport,
        });

        await context.close();
      } catch (error) {
        console.log(
          `    ❌ Failed to capture ${testCase.name}: ${error.message}`,
        );
        results.push({
          name: testCase.name,
          status: 'failed',
          error: error.message,
        });
      }
    }

    return results;
  }

  async compareWithBaseline() {
    console.log('🔍 Comparing screenshots with baseline...');

    const results = [];
    const currentFiles = readdirSync(this.currentDir).filter((f) =>
      f.endsWith('.png'),
    );

    for (const filename of currentFiles) {
      const name = filename.replace('.png', '');
      const currentPath = join(this.currentDir, filename);
      const baselinePath = join(this.baselineDir, filename);
      const diffPath = join(this.diffDir, filename);

      if (!existsSync(baselinePath)) {
        console.log(`  📁 No baseline for ${name}, creating new baseline`);

        // Copy current as new baseline
        const currentData = readFileSync(currentPath);
        writeFileSync(baselinePath, currentData);

        results.push({
          name,
          status: 'new_baseline',
          message: 'Created new baseline image',
        });
        continue;
      }

      try {
        // Use Playwright's built-in image comparison
        const context = await this.browser.newContext();
        const page = await context.newPage();

        // Create a comparison using Playwright's expect
        const currentBuffer = readFileSync(currentPath);
        const baselineBuffer = readFileSync(baselinePath);

        // Simple buffer comparison (in production, use proper image diff)
        const isIdentical = Buffer.compare(currentBuffer, baselineBuffer) === 0;

        if (isIdentical) {
          results.push({
            name,
            status: 'passed',
            message: 'Screenshots match',
          });
        } else {
          results.push({
            name,
            status: 'failed',
            message: 'Screenshots differ',
            diffPath,
          });

          console.log(`  ❌ Visual diff detected: ${name}`);
        }

        await context.close();
      } catch (error) {
        results.push({
          name,
          status: 'error',
          message: error.message,
        });
      }
    }

    return results;
  }

  async updateBaselines() {
    console.log('🔄 Updating baseline screenshots...');

    const currentFiles = readdirSync(this.currentDir).filter((f) =>
      f.endsWith('.png'),
    );
    let updated = 0;

    for (const filename of currentFiles) {
      const currentPath = join(this.currentDir, filename);
      const baselinePath = join(this.baselineDir, filename);

      const currentData = readFileSync(currentPath);
      writeFileSync(baselinePath, currentData);
      updated++;
    }

    console.log(`  ✅ Updated ${updated} baseline screenshots`);
  }

  async generateReport(captureResults, compareResults) {
    console.log('📄 Generating visual testing report...');

    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        total: captureResults.length,
        captured: captureResults.filter((r) => r.status === 'captured').length,
        failed: captureResults.filter((r) => r.status === 'failed').length,
        passed: compareResults.filter((r) => r.status === 'passed').length,
        newBaselines: compareResults.filter((r) => r.status === 'new_baseline')
          .length,
        diffs: compareResults.filter((r) => r.status === 'failed').length,
      },
      captures: captureResults,
      comparisons: compareResults,
    };

    // Write JSON report
    writeFileSync(
      join(this.screenshotDir, 'visual-report.json'),
      JSON.stringify(report, null, 2),
    );

    // Write HTML report
    const htmlReport = this.generateHTMLReport(report);
    writeFileSync(join(this.screenshotDir, 'visual-report.html'), htmlReport);

    return report;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Visual Testing Report</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 40px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin: 20px 0; }
        .metric { background: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 2em; font-weight: bold; }
        .metric-label { font-size: 0.9em; color: #666; margin-top: 5px; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin: 30px 0; }
        .test-card { border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: white; }
        .test-header { padding: 15px; font-weight: bold; display: flex; justify-content: space-between; align-items: center; }
        .test-image { width: 100%; height: 200px; object-fit: cover; }
        .test-info { padding: 15px; font-size: 0.9em; color: #666; }
        .status-passed { color: #28a745; }
        .status-failed { color: #dc3545; }
        .status-new { color: #17a2b8; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>👀 Visual Testing Report</h1>
            <p>Generated: ${report.timestamp}</p>
        </div>
        
        <div class="summary">
            <div class="metric">
                <div class="metric-value">${report.summary.total}</div>
                <div class="metric-label">Total Tests</div>
            </div>
            <div class="metric">
                <div class="metric-value status-passed">${report.summary.passed}</div>
                <div class="metric-label">Passed</div>
            </div>
            <div class="metric">
                <div class="metric-value status-failed">${report.summary.diffs}</div>
                <div class="metric-label">Visual Diffs</div>
            </div>
            <div class="metric">
                <div class="metric-value status-new">${report.summary.newBaselines}</div>
                <div class="metric-label">New Baselines</div>
            </div>
        </div>
        
        <div class="test-grid">
            ${report.captures
              .map((capture) => {
                const comparison = report.comparisons.find(
                  (c) => c.name === capture.name,
                );
                const status = comparison ? comparison.status : 'unknown';
                const statusClass =
                  status === 'passed'
                    ? 'status-passed'
                    : status === 'failed'
                      ? 'status-failed'
                      : status === 'new_baseline'
                        ? 'status-new'
                        : '';

                return `
                <div class="test-card">
                    <div class="test-header">
                        <span>${capture.name}</span>
                        <span class="${statusClass}">
                            ${status === 'passed' ? '✅' : status === 'failed' ? '❌' : status === 'new_baseline' ? '🆕' : '❓'}
                            ${status.toUpperCase()}
                        </span>
                    </div>
                    ${
                      capture.status === 'captured'
                        ? `
                        <img src="current/${capture.name}.png" alt="${capture.name}" class="test-image">
                        <div class="test-info">
                            Viewport: ${capture.viewport.width}×${capture.viewport.height}
                            ${comparison ? `<br>Result: ${comparison.message}` : ''}
                        </div>
                    `
                        : `
                        <div class="test-info" style="padding: 60px 15px; text-align: center; color: #dc3545;">
                            ❌ Failed to capture screenshot<br>
                            ${capture.error}
                        </div>
                    `
                    }
                </div>
              `;
              })
              .join('')}
        </div>
    </div>
</body>
</html>
    `;
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
    }
  }

  async run(options = {}) {
    const { updateBaselines = false, generateReport = true } = options;

    try {
      await this.setup();

      const captureResults = await this.captureScreenshots();

      let compareResults = [];
      if (!updateBaselines) {
        compareResults = await this.compareWithBaseline();
      } else {
        await this.updateBaselines();
        console.log('✅ Baselines updated successfully');
      }

      if (generateReport) {
        const report = await this.generateReport(
          captureResults,
          compareResults,
        );

        console.log('\n📋 Visual Testing Summary:');
        console.log(
          '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
        );
        console.log(`  Total Screenshots:  ${report.summary.total}`);
        console.log(`  Captured:           ${report.summary.captured}`);
        console.log(`  Passed:             ${report.summary.passed}`);
        console.log(`  Visual Diffs:       ${report.summary.diffs}`);
        console.log(`  New Baselines:      ${report.summary.newBaselines}`);
        console.log(`  Failed Captures:    ${report.summary.failed}`);

        if (report.summary.diffs > 0) {
          console.log(
            '\n⚠️  Visual differences detected. Review the report for details.',
          );
          console.log(
            `📄 Report: ${join(this.screenshotDir, 'visual-report.html')}`,
          );
        }
      }
    } finally {
      await this.cleanup();
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const options = {
    updateBaselines: args.includes('--update-baselines'),
    generateReport: !args.includes('--no-report'),
    baseUrl:
      args.find((arg) => arg.startsWith('--base-url='))?.split('=')[1] ||
      'http://localhost:5173',
  };

  const visualTesting = new VisualTesting(options.baseUrl);
  visualTesting.run(options).catch(console.error);
}

export default VisualTesting;
