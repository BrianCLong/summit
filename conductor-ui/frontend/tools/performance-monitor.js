#!/usr/bin/env node

/**
 * Performance Monitoring and Web Vitals Collection Tool
 */

import { chromium } from 'playwright';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

class PerformanceMonitor {
  constructor(baseUrl = 'http://localhost:5173') {
    this.baseUrl = baseUrl;
    this.browser = null;
    this.results = [];
    this.reportDir = 'performance-reports';
  }

  async setup() {
    console.log('⚡ Setting up performance monitoring...');

    if (!existsSync(this.reportDir)) {
      mkdirSync(this.reportDir, { recursive: true });
    }

    this.browser = await chromium.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-web-security'],
    });
  }

  async collectWebVitals(url, testName) {
    console.log(`  📊 Collecting Web Vitals for: ${testName}`);

    const context = await this.browser.newContext();
    const page = await context.newPage();

    // Mock authentication if needed
    if (url.includes('/maestro') && !url.includes('/login')) {
      await page.addInitScript(() => {
        localStorage.setItem('maestro_auth_access_token', 'mock-jwt-token');
      });

      await page.route('**/api/**', async (route) => {
        await route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({ data: {} }),
        });
      });
    }

    // Collect performance metrics
    const performanceMetrics = {};

    // Start performance observation
    await page.addInitScript(() => {
      // Web Vitals collection script
      window.webVitals = {
        lcp: null,
        fid: null,
        cls: null,
        fcp: null,
        ttfb: null,
      };

      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        window.webVitals.lcp = lastEntry.startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay (if supported)
      if ('PerformanceEventTiming' in window) {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const firstInput = entries[0];
          window.webVitals.fid =
            firstInput.processingStart - firstInput.startTime;
        }).observe({ entryTypes: ['first-input'] });
      }

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let cls = 0;
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            cls += entry.value;
          }
        }
        window.webVitals.cls = cls;
      }).observe({ entryTypes: ['layout-shift'] });

      // First Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(
          (entry) => entry.name === 'first-contentful-paint',
        );
        if (fcpEntry) {
          window.webVitals.fcp = fcpEntry.startTime;
        }
      }).observe({ entryTypes: ['paint'] });

      // Time to First Byte
      window.addEventListener('load', () => {
        const navTiming = performance.getEntriesByType('navigation')[0];
        if (navTiming) {
          window.webVitals.ttfb =
            navTiming.responseStart - navTiming.requestStart;
        }
      });
    });

    const startTime = Date.now();

    // Navigate and wait for load
    await page.goto(`${this.baseUrl}${url}`, {
      waitUntil: 'networkidle',
      timeout: 30000,
    });

    // Wait for metrics to be collected
    await page.waitForTimeout(3000);

    // Get Web Vitals
    const webVitals = await page.evaluate(() => window.webVitals);

    // Get additional performance metrics
    const performanceEntry = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      return nav
        ? {
            domContentLoaded:
              nav.domContentLoadedEventEnd - nav.navigationStart,
            loadComplete: nav.loadEventEnd - nav.navigationStart,
            domInteractive: nav.domInteractive - nav.navigationStart,
            redirectTime: nav.redirectEnd - nav.redirectStart,
            dnsTime: nav.domainLookupEnd - nav.domainLookupStart,
            connectTime: nav.connectEnd - nav.connectStart,
            requestTime: nav.responseEnd - nav.requestStart,
            responseTime: nav.responseEnd - nav.responseStart,
          }
        : {};
    });

    // Get resource timing
    const resourceTimings = await page.evaluate(() => {
      return performance.getEntriesByType('resource').map((resource) => ({
        name: resource.name,
        duration: resource.duration,
        size: resource.transferSize || resource.encodedBodySize || 0,
        type: resource.initiatorType,
      }));
    });

    // Calculate scores based on Web Vitals thresholds
    const scores = {
      lcp:
        webVitals.lcp <= 2500
          ? 'good'
          : webVitals.lcp <= 4000
            ? 'needs-improvement'
            : 'poor',
      fid:
        webVitals.fid <= 100
          ? 'good'
          : webVitals.fid <= 300
            ? 'needs-improvement'
            : 'poor',
      cls:
        webVitals.cls <= 0.1
          ? 'good'
          : webVitals.cls <= 0.25
            ? 'needs-improvement'
            : 'poor',
      fcp:
        webVitals.fcp <= 1800
          ? 'good'
          : webVitals.fcp <= 3000
            ? 'needs-improvement'
            : 'poor',
      ttfb:
        webVitals.ttfb <= 800
          ? 'good'
          : webVitals.ttfb <= 1800
            ? 'needs-improvement'
            : 'poor',
    };

    const result = {
      testName,
      url,
      timestamp: new Date().toISOString(),
      duration: Date.now() - startTime,
      webVitals: {
        lcp: Math.round(webVitals.lcp || 0),
        fid: Math.round(webVitals.fid || 0),
        cls: Math.round((webVitals.cls || 0) * 1000) / 1000,
        fcp: Math.round(webVitals.fcp || 0),
        ttfb: Math.round(webVitals.ttfb || 0),
      },
      scores,
      performance: performanceEntry,
      resources: {
        total: resourceTimings.length,
        totalSize: resourceTimings.reduce((sum, r) => sum + r.size, 0),
        byType: this.groupResourcesByType(resourceTimings),
        slowest: resourceTimings
          .sort((a, b) => b.duration - a.duration)
          .slice(0, 5),
      },
    };

    await context.close();
    return result;
  }

  groupResourcesByType(resources) {
    const grouped = {};
    resources.forEach((resource) => {
      const type = resource.type || 'other';
      if (!grouped[type]) {
        grouped[type] = { count: 0, totalSize: 0, totalDuration: 0 };
      }
      grouped[type].count++;
      grouped[type].totalSize += resource.size;
      grouped[type].totalDuration += resource.duration;
    });
    return grouped;
  }

  async runPerformanceAudit() {
    console.log('🔍 Running performance audit...');

    const testCases = [
      { url: '/maestro/login', name: 'Login Page' },
      { url: '/maestro', name: 'Dashboard' },
      { url: '/maestro/runs', name: 'Runs List' },
      { url: '/maestro/observability', name: 'Observability' },
      { url: '/maestro/routing', name: 'Routing Studio' },
    ];

    for (const testCase of testCases) {
      try {
        const result = await this.collectWebVitals(testCase.url, testCase.name);
        this.results.push(result);

        // Print immediate feedback
        console.log(`    ✅ ${testCase.name}:`);
        console.log(
          `       LCP: ${result.webVitals.lcp}ms (${result.scores.lcp})`,
        );
        console.log(
          `       FCP: ${result.webVitals.fcp}ms (${result.scores.fcp})`,
        );
        console.log(
          `       CLS: ${result.webVitals.cls} (${result.scores.cls})`,
        );
      } catch (error) {
        console.log(`    ❌ Failed to test ${testCase.name}: ${error.message}`);
        this.results.push({
          testName: testCase.name,
          url: testCase.url,
          error: error.message,
          timestamp: new Date().toISOString(),
        });
      }
    }
  }

  calculateOverallScore() {
    const validResults = this.results.filter((r) => !r.error);
    if (validResults.length === 0) return 0;

    let totalScore = 0;
    let scoreCount = 0;

    validResults.forEach((result) => {
      Object.values(result.scores).forEach((score) => {
        totalScore +=
          score === 'good' ? 100 : score === 'needs-improvement' ? 50 : 0;
        scoreCount++;
      });
    });

    return Math.round(totalScore / scoreCount);
  }

  generateReport() {
    console.log('📄 Generating performance report...');

    const report = {
      timestamp: new Date().toISOString(),
      overallScore: this.calculateOverallScore(),
      summary: {
        total: this.results.length,
        passed: this.results.filter((r) => !r.error).length,
        failed: this.results.filter((r) => r.error).length,
      },
      results: this.results,
      recommendations: this.generateRecommendations(),
    };

    // Write JSON report
    const jsonPath = join(this.reportDir, 'performance-report.json');
    writeFileSync(jsonPath, JSON.stringify(report, null, 2));

    // Write HTML report
    const htmlPath = join(this.reportDir, 'performance-report.html');
    writeFileSync(htmlPath, this.generateHTMLReport(report));

    return report;
  }

  generateRecommendations() {
    const recommendations = [];
    const validResults = this.results.filter((r) => !r.error);

    // Analyze results for recommendations
    const avgLCP =
      validResults.reduce((sum, r) => sum + r.webVitals.lcp, 0) /
      validResults.length;
    const avgCLS =
      validResults.reduce((sum, r) => sum + r.webVitals.cls, 0) /
      validResults.length;
    const avgFCP =
      validResults.reduce((sum, r) => sum + r.webVitals.fcp, 0) /
      validResults.length;

    if (avgLCP > 2500) {
      recommendations.push({
        type: 'LCP',
        severity: avgLCP > 4000 ? 'high' : 'medium',
        message:
          'Largest Contentful Paint is slow. Consider optimizing images, removing unused CSS, or implementing code splitting.',
        value: Math.round(avgLCP),
      });
    }

    if (avgCLS > 0.1) {
      recommendations.push({
        type: 'CLS',
        severity: avgCLS > 0.25 ? 'high' : 'medium',
        message:
          'Cumulative Layout Shift is high. Ensure images and ads have defined dimensions.',
        value: Math.round(avgCLS * 1000) / 1000,
      });
    }

    if (avgFCP > 1800) {
      recommendations.push({
        type: 'FCP',
        severity: avgFCP > 3000 ? 'high' : 'medium',
        message:
          'First Contentful Paint is slow. Consider reducing server response times and eliminating render-blocking resources.',
        value: Math.round(avgFCP),
      });
    }

    // Resource-based recommendations
    const totalResources =
      validResults.reduce((sum, r) => sum + (r.resources?.total || 0), 0) /
      validResults.length;
    if (totalResources > 100) {
      recommendations.push({
        type: 'Resources',
        severity: 'medium',
        message: `High number of resources (${Math.round(totalResources)}). Consider bundling and reducing HTTP requests.`,
        value: Math.round(totalResources),
      });
    }

    return recommendations;
  }

  generateHTMLReport(report) {
    return `
<!DOCTYPE html>
<html>
<head>
    <title>Performance Report</title>
    <style>
        body { font-family: system-ui, sans-serif; margin: 40px; background: #f8f9fa; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; }
        .header { border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
        .score { text-align: center; margin: 20px 0; }
        .score-circle { 
            display: inline-block; width: 120px; height: 120px; border-radius: 50%; 
            background: conic-gradient(#28a745 ${report.overallScore * 3.6}deg, #f8f9fa 0);
            display: flex; align-items: center; justify-content: center;
            font-size: 2em; font-weight: bold; color: #28a745;
        }
        .metrics { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 30px 0; }
        .metric { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .metric-value { font-size: 1.5em; font-weight: bold; margin-bottom: 5px; }
        .metric-label { font-size: 0.9em; color: #666; }
        .good { color: #28a745; }
        .needs-improvement { color: #ffc107; }
        .poor { color: #dc3545; }
        .results { margin: 30px 0; }
        .result-card { background: #f8f9fa; margin: 15px 0; padding: 20px; border-radius: 8px; border-left: 4px solid #ddd; }
        .recommendations { background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 20px 0; }
        .recommendation { margin: 10px 0; padding: 10px; background: white; border-radius: 4px; }
        .severity-high { border-left: 4px solid #dc3545; }
        .severity-medium { border-left: 4px solid #ffc107; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: bold; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚡ Performance Report</h1>
            <p>Generated: ${report.timestamp}</p>
        </div>
        
        <div class="score">
            <div class="score-circle">
                <div>${report.overallScore}</div>
            </div>
            <h2>Overall Performance Score</h2>
        </div>

        ${
          report.recommendations.length > 0
            ? `
            <div class="recommendations">
                <h3>🚀 Performance Recommendations</h3>
                ${report.recommendations
                  .map(
                    (rec) => `
                    <div class="recommendation severity-${rec.severity}">
                        <strong>${rec.type}:</strong> ${rec.message}
                    </div>
                `,
                  )
                  .join('')}
            </div>
        `
            : ''
        }

        <div class="results">
            <h3>📊 Test Results</h3>
            ${report.results
              .filter((r) => !r.error)
              .map(
                (result) => `
                <div class="result-card">
                    <h4>${result.testName}</h4>
                    <div class="metrics">
                        <div class="metric">
                            <div class="metric-value ${result.scores.lcp}">${result.webVitals.lcp}ms</div>
                            <div class="metric-label">Largest Contentful Paint</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value ${result.scores.fcp}">${result.webVitals.fcp}ms</div>
                            <div class="metric-label">First Contentful Paint</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value ${result.scores.cls}">${result.webVitals.cls}</div>
                            <div class="metric-label">Cumulative Layout Shift</div>
                        </div>
                        <div class="metric">
                            <div class="metric-value ${result.scores.ttfb}">${result.webVitals.ttfb}ms</div>
                            <div class="metric-label">Time to First Byte</div>
                        </div>
                    </div>
                    
                    <table>
                        <tr><th>Resource Type</th><th>Count</th><th>Total Size</th></tr>
                        ${Object.entries(result.resources.byType)
                          .map(
                            ([type, data]) => `
                            <tr>
                                <td>${type}</td>
                                <td>${data.count}</td>
                                <td>${Math.round(data.totalSize / 1024)}KB</td>
                            </tr>
                        `,
                          )
                          .join('')}
                    </table>
                </div>
            `,
              )
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

  async run() {
    try {
      await this.setup();
      await this.runPerformanceAudit();
      const report = this.generateReport();

      console.log('\n📋 Performance Audit Summary:');
      console.log(
        '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      );
      console.log(`  Overall Score:     ${report.overallScore}/100`);
      console.log(
        `  Tests Completed:   ${report.summary.passed}/${report.summary.total}`,
      );
      console.log(`  Recommendations:   ${report.recommendations.length}`);

      if (report.recommendations.length > 0) {
        console.log('\n💡 Top Recommendations:');
        report.recommendations.slice(0, 3).forEach((rec) => {
          console.log(
            `  ${rec.severity === 'high' ? '🔴' : '🟡'} ${rec.type}: ${rec.message}`,
          );
        });
      }

      console.log(
        `\n📄 Full report: ${join(this.reportDir, 'performance-report.html')}`,
      );

      return report;
    } finally {
      await this.cleanup();
    }
  }
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const baseUrl =
    args.find((arg) => arg.startsWith('--base-url='))?.split('=')[1] ||
    'http://localhost:5173';

  const monitor = new PerformanceMonitor(baseUrl);
  monitor.run().catch(console.error);
}

export default PerformanceMonitor;
