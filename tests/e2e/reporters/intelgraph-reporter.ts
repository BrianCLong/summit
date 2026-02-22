/**
 * Custom IntelGraph Playwright Reporter
 *
 * Integrates test results with IntelGraph metrics and monitoring systems.
 */

import {
  Reporter,
  TestCase,
  TestResult,
  FullResult,
} from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';

class IntelGraphReporter implements Reporter {
  private results: Array<{
    test: TestCase;
    result: TestResult;
    timestamp: number;
  }> = [];

  onTestEnd(test: TestCase, result: TestResult) {
    this.results.push({
      test,
      result,
      timestamp: Date.now(),
    });

    // Log test completion with structured format for log aggregation
    const logEntry = {
      timestamp: new Date().toISOString(),
      level: result.status === 'passed' ? 'info' : 'error',
      test: {
        title: test.title,
        titlePath: test.titlePath(),
        file: test.location.file,
        line: test.location.line,
        project: test.parent.project()?.name,
      },
      result: {
        status: result.status,
        duration: result.duration,
        retry: result.retry,
        error: result.error?.message || null,
      },
      browser: test.parent.project()?.use?.browserName || 'unknown',
      tags: ['e2e', 'maestro', 'intelgraph'],
    };

    console.log(JSON.stringify(logEntry));
  }

  onEnd(result: FullResult) {
    const summary = {
      timestamp: new Date().toISOString(),
      status: result.status,
      totalTests: this.results.length,
      passed: this.results.filter((r) => r.result.status === 'passed').length,
      failed: this.results.filter((r) => r.result.status === 'failed').length,
      flaky: this.results.filter((r) => r.result.status === 'flaky').length,
      skipped: this.results.filter((r) => r.result.status === 'skipped').length,
      duration: this.results.reduce((sum, r) => sum + r.result.duration, 0),

      // Browser breakdown
      browsers: this.getBrowserBreakdown(),

      // Performance metrics
      performance: this.getPerformanceMetrics(),

      // Accessibility compliance
      accessibility: this.getAccessibilityMetrics(),
    };

    // Write summary for monitoring systems
    const outputPath = path.join('test-results', 'intelgraph-summary.json');
    fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));

    // Send metrics to Prometheus if available
    this.sendPrometheusMetrics(summary);

    console.log('📊 IntelGraph Test Summary:');
    console.log(`   Status: ${result.status}`);
    console.log(`   Total Tests: ${summary.totalTests}`);
    console.log(
      `   Success Rate: ${((summary.passed / summary.totalTests) * 100).toFixed(1)}%`,
    );
    console.log(`   Duration: ${(summary.duration / 1000).toFixed(2)}s`);
    console.log(
      `   Browser Coverage: ${Object.keys(summary.browsers).join(', ')}`,
    );
  }

  private getBrowserBreakdown() {
    const breakdown: Record<
      string,
      { passed: number; failed: number; total: number }
    > = {};

    this.results.forEach(({ test, result }) => {
      const browser = test.parent.project()?.use?.browserName || 'unknown';
      if (!breakdown[browser]) {
        breakdown[browser] = { passed: 0, failed: 0, total: 0 };
      }

      breakdown[browser].total++;
      if (result.status === 'passed') {
        breakdown[browser].passed++;
      } else if (result.status === 'failed') {
        breakdown[browser].failed++;
      }
    });

    return breakdown;
  }

  private getPerformanceMetrics() {
    const performanceTests = this.results.filter((r) =>
      r.test
        .titlePath()
        .some((title) => title.toLowerCase().includes('performance')),
    );

    return {
      totalPerformanceTests: performanceTests.length,
      averageLoadTime:
        performanceTests.length > 0
          ? performanceTests.reduce((sum, r) => sum + r.result.duration, 0) /
            performanceTests.length
          : 0,
      webVitalsCompliance: performanceTests.filter(
        (r) => r.result.status === 'passed',
      ).length,
    };
  }

  private getAccessibilityMetrics() {
    const a11yTests = this.results.filter((r) =>
      r.test
        .titlePath()
        .some((title) => title.toLowerCase().includes('accessibility')),
    );

    return {
      totalAccessibilityTests: a11yTests.length,
      wcagCompliance: a11yTests.filter((r) => r.result.status === 'passed')
        .length,
      complianceRate:
        a11yTests.length > 0
          ? (a11yTests.filter((r) => r.result.status === 'passed').length /
              a11yTests.length) *
            100
          : 0,
    };
  }

  private async sendPrometheusMetrics(summary: any) {
    const prometheusGateway = process.env.PROMETHEUS_GATEWAY;
    if (!prometheusGateway) {
      return;
    }

    try {
      const metrics = `
# HELP e2e_tests_total Total number of E2E tests executed
# TYPE e2e_tests_total counter
e2e_tests_total{status="passed"} ${summary.passed}
e2e_tests_total{status="failed"} ${summary.failed}
e2e_tests_total{status="flaky"} ${summary.flaky}
e2e_tests_total{status="skipped"} ${summary.skipped}

# HELP e2e_test_duration_seconds Duration of E2E test execution
# TYPE e2e_test_duration_seconds gauge
e2e_test_duration_seconds ${summary.duration / 1000}

# HELP e2e_test_success_rate Success rate of E2E tests
# TYPE e2e_test_success_rate gauge
e2e_test_success_rate ${summary.passed / summary.totalTests}

# HELP e2e_accessibility_compliance_rate WCAG compliance rate
# TYPE e2e_accessibility_compliance_rate gauge
e2e_accessibility_compliance_rate ${summary.accessibility.complianceRate / 100}
`;

      // Send to Prometheus Pushgateway
      const response = await fetch(
        `${prometheusGateway}/metrics/job/e2e-tests/instance/playwright`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'text/plain',
          },
          body: metrics,
        },
      );

      if (response.ok) {
        console.log('✅ Metrics sent to Prometheus');
      } else {
        console.warn(
          '⚠️ Failed to send metrics to Prometheus:',
          response.statusText,
        );
      }
    } catch (error) {
      console.warn('⚠️ Error sending metrics to Prometheus:', error);
    }
  }
}

export default IntelGraphReporter;
