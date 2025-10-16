#!/usr/bin/env node
/**
 * Endpoint Performance Budget Checker
 *
 * Validates that API endpoints meet performance budgets and fails PRs
 * if p95 latency exceeds configured thresholds
 */

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Configuration
const config = {
  prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090',
  budgetConfigFile:
    process.env.BUDGET_CONFIG_FILE || 'performance-budgets.json',
  baselineHours: parseInt(process.env.BASELINE_HOURS) || 24,
  currentWindowMinutes: parseInt(process.env.CURRENT_WINDOW_MINUTES) || 15,
  failOnBudgetBreach: process.env.FAIL_ON_BUDGET_BREACH !== 'false',
  githubToken: process.env.GITHUB_TOKEN,
  prNumber: process.env.PR_NUMBER || process.env.GITHUB_PR_NUMBER,
  repoOwner: process.env.GITHUB_REPOSITORY_OWNER,
  repoName: process.env.GITHUB_REPOSITORY_NAME,
};

class EndpointBudgetChecker {
  constructor() {
    this.budgets = null;
    this.results = {
      endpoints: [],
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        missing_data: 0,
      },
    };
  }

  /**
   * Load performance budgets configuration
   */
  async loadBudgets() {
    console.log('📋 Loading performance budgets...');

    try {
      const budgetData = await fs.readFile(
        this.config.budgetConfigFile,
        'utf8',
      );
      this.budgets = JSON.parse(budgetData);

      console.log(
        `✅ Loaded budgets for ${Object.keys(this.budgets.endpoints).length} endpoints`,
      );
      return this.budgets;
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Create default budget file
        await this.createDefaultBudgets();
        return this.loadBudgets();
      } else {
        throw error;
      }
    }
  }

  /**
   * Create default performance budgets
   */
  async createDefaultBudgets() {
    console.log('📝 Creating default performance budgets...');

    const defaultBudgets = {
      version: '1.0',
      global: {
        default_p95_budget_ms: 200,
        default_p99_budget_ms: 500,
        default_error_rate_budget: 0.01,
        baseline_window_hours: 24,
        comparison_window_minutes: 15,
      },
      endpoints: {
        '/health': {
          p95_budget_ms: 50,
          p99_budget_ms: 100,
          error_rate_budget: 0.001,
          critical: true,
          description: 'Health check endpoint',
        },
        '/health/ready': {
          p95_budget_ms: 100,
          p99_budget_ms: 200,
          error_rate_budget: 0.005,
          critical: true,
          description: 'Readiness check endpoint',
        },
        '/graphql': {
          p95_budget_ms: 300,
          p99_budget_ms: 800,
          error_rate_budget: 0.02,
          critical: true,
          description: 'GraphQL API endpoint',
        },
        '/api/v1/entities': {
          p95_budget_ms: 250,
          p99_budget_ms: 600,
          error_rate_budget: 0.015,
          critical: false,
          description: 'Entity CRUD operations',
        },
        '/api/v1/search': {
          p95_budget_ms: 500,
          p99_budget_ms: 1200,
          error_rate_budget: 0.03,
          critical: false,
          description: 'Search functionality',
        },
        '/metrics': {
          p95_budget_ms: 100,
          p99_budget_ms: 250,
          error_rate_budget: 0.001,
          critical: false,
          description: 'Prometheus metrics endpoint',
        },
      },
      alerting: {
        slack_webhook: process.env.SLACK_WEBHOOK_URL,
        github_issues: true,
        email_notifications: false,
      },
    };

    await fs.writeFile(
      this.config.budgetConfigFile,
      JSON.stringify(defaultBudgets, null, 2),
    );

    console.log(
      `📋 Created default budget file: ${this.config.budgetConfigFile}`,
    );
  }

  /**
   * Query Prometheus for metrics
   */
  async prometheusQuery(query, time = null) {
    return new Promise((resolve, reject) => {
      const url = new URL('/api/v1/query', config.prometheusUrl);
      url.searchParams.set('query', query);
      if (time) {
        url.searchParams.set('time', time);
      }

      const req = https.get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const result = JSON.parse(data);
            if (result.status === 'success') {
              resolve(result.data);
            } else {
              reject(new Error(`Prometheus query failed: ${result.error}`));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Prometheus query timeout'));
      });
    });
  }

  /**
   * Extract value from Prometheus result
   */
  extractValue(prometheusResult) {
    if (!prometheusResult.result || prometheusResult.result.length === 0) {
      return null;
    }

    return parseFloat(prometheusResult.result[0].value[1]);
  }

  /**
   * Get endpoint metrics
   */
  async getEndpointMetrics(endpoint, timeWindow = '15m') {
    console.log(`📊 Fetching metrics for ${endpoint} (window: ${timeWindow})`);

    const queries = {
      p95_latency: `histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{route="${endpoint}"}[${timeWindow}])) by (le))`,
      p99_latency: `histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{route="${endpoint}"}[${timeWindow}])) by (le))`,
      error_rate: `sum(rate(http_requests_total{route="${endpoint}",code!~"2.."}[${timeWindow}])) / sum(rate(http_requests_total{route="${endpoint}"}[${timeWindow}]))`,
      request_rate: `sum(rate(http_requests_total{route="${endpoint}"}[${timeWindow}]))`,
      avg_latency: `sum(rate(http_request_duration_seconds_sum{route="${endpoint}"}[${timeWindow}])) / sum(rate(http_request_duration_seconds_count{route="${endpoint}"}[${timeWindow}]))`,
    };

    const metrics = {};

    for (const [metricName, query] of Object.entries(queries)) {
      try {
        const result = await this.prometheusQuery(query);
        metrics[metricName] = this.extractValue(result);
      } catch (error) {
        console.warn(
          `⚠️  Failed to fetch ${metricName} for ${endpoint}:`,
          error.message,
        );
        metrics[metricName] = null;
      }
    }

    return metrics;
  }

  /**
   * Check endpoint budget compliance
   */
  async checkEndpointBudgets() {
    console.log('🎯 Checking endpoint budget compliance...');

    if (!this.budgets) {
      throw new Error('Budgets not loaded');
    }

    for (const [endpoint, budget] of Object.entries(this.budgets.endpoints)) {
      console.log(`\n📍 Checking endpoint: ${endpoint}`);

      // Get current metrics
      const currentMetrics = await this.getEndpointMetrics(
        endpoint,
        `${config.currentWindowMinutes}m`,
      );

      // Get baseline metrics for comparison
      const baselineTime = Math.floor(
        (Date.now() - config.baselineHours * 60 * 60 * 1000) / 1000,
      );
      const baselineMetrics = await this.getEndpointMetrics(endpoint, '1h');

      // Check budget compliance
      const result = {
        endpoint,
        budget,
        current: currentMetrics,
        baseline: baselineMetrics,
        compliance: {
          p95_latency: this.checkLatencyBudget(
            currentMetrics.p95_latency,
            budget.p95_budget_ms,
          ),
          p99_latency: this.checkLatencyBudget(
            currentMetrics.p99_latency,
            budget.p99_budget_ms,
          ),
          error_rate: this.checkErrorRateBudget(
            currentMetrics.error_rate,
            budget.error_rate_budget,
          ),
        },
        status: 'unknown',
        issues: [],
      };

      // Determine overall status
      const violations = Object.values(result.compliance).filter(
        (c) => c.status === 'violation',
      );
      const missing = Object.values(result.compliance).filter(
        (c) => c.status === 'no_data',
      );

      if (violations.length > 0) {
        result.status = 'failed';
        result.issues = violations.map((v) => v.message);
        this.results.summary.failed++;
      } else if (missing.length === Object.keys(result.compliance).length) {
        result.status = 'no_data';
        result.issues.push('No metrics data available');
        this.results.summary.missing_data++;
      } else {
        result.status = 'passed';
        this.results.summary.passed++;
      }

      this.results.summary.total++;
      this.results.endpoints.push(result);

      // Log result
      const statusIcon = {
        passed: '✅',
        failed: '❌',
        no_data: '❓',
      }[result.status];

      console.log(`   ${statusIcon} Status: ${result.status}`);
      if (result.issues.length > 0) {
        result.issues.forEach((issue) => console.log(`     ⚠️  ${issue}`));
      }
    }

    console.log(`\n📊 Budget Check Summary:`);
    console.log(`   Total endpoints: ${this.results.summary.total}`);
    console.log(`   Passed: ${this.results.summary.passed}`);
    console.log(`   Failed: ${this.results.summary.failed}`);
    console.log(`   No data: ${this.results.summary.missing_data}`);

    return this.results;
  }

  /**
   * Check latency budget compliance
   */
  checkLatencyBudget(actualMs, budgetMs) {
    if (actualMs === null) {
      return {
        status: 'no_data',
        message: 'No latency data available',
        actual: null,
        budget: budgetMs,
      };
    }

    const actualMsValue = actualMs * 1000; // Convert from seconds to milliseconds

    if (actualMsValue > budgetMs) {
      return {
        status: 'violation',
        message: `Latency ${actualMsValue.toFixed(0)}ms exceeds budget ${budgetMs}ms`,
        actual: actualMsValue,
        budget: budgetMs,
        overage: actualMsValue - budgetMs,
      };
    } else {
      return {
        status: 'compliant',
        message: `Latency ${actualMsValue.toFixed(0)}ms within budget ${budgetMs}ms`,
        actual: actualMsValue,
        budget: budgetMs,
        headroom: budgetMs - actualMsValue,
      };
    }
  }

  /**
   * Check error rate budget compliance
   */
  checkErrorRateBudget(actualRate, budgetRate) {
    if (actualRate === null) {
      return {
        status: 'no_data',
        message: 'No error rate data available',
        actual: null,
        budget: budgetRate,
      };
    }

    if (actualRate > budgetRate) {
      return {
        status: 'violation',
        message: `Error rate ${(actualRate * 100).toFixed(2)}% exceeds budget ${(budgetRate * 100).toFixed(2)}%`,
        actual: actualRate,
        budget: budgetRate,
        overage: actualRate - budgetRate,
      };
    } else {
      return {
        status: 'compliant',
        message: `Error rate ${(actualRate * 100).toFixed(2)}% within budget ${(budgetRate * 100).toFixed(2)}%`,
        actual: actualRate,
        budget: budgetRate,
        headroom: budgetRate - actualRate,
      };
    }
  }

  /**
   * Generate budget report
   */
  generateReport() {
    const timestamp = new Date().toISOString();
    const hasCriticalFailures = this.results.endpoints.some(
      (ep) => ep.budget.critical && ep.status === 'failed',
    );

    let report = `# 🎯 Endpoint Performance Budget Report

**Status**: ${hasCriticalFailures ? '🚨 CRITICAL FAILURES' : this.results.summary.failed > 0 ? '⚠️ BUDGET VIOLATIONS' : '✅ ALL BUDGETS MET'}
**Timestamp**: ${timestamp}
**Window**: Last ${config.currentWindowMinutes} minutes vs ${config.baselineHours}h baseline

## 📊 Summary

| Metric | Count |
|--------|-------|
| Total Endpoints | ${this.results.summary.total} |
| Passed | ${this.results.summary.passed} ✅ |
| Failed | ${this.results.summary.failed} ❌ |
| No Data | ${this.results.summary.missing_data} ❓ |

## 📍 Endpoint Details

| Endpoint | Status | p95 Latency | p99 Latency | Error Rate | Critical |
|----------|--------|-------------|-------------|------------|----------|`;

    for (const result of this.results.endpoints) {
      const statusIcon = {
        passed: '✅',
        failed: '❌',
        no_data: '❓',
      }[result.status];

      const p95Status =
        result.compliance.p95_latency.status === 'compliant'
          ? '✅'
          : result.compliance.p95_latency.status === 'violation'
            ? '❌'
            : '❓';
      const p99Status =
        result.compliance.p99_latency.status === 'compliant'
          ? '✅'
          : result.compliance.p99_latency.status === 'violation'
            ? '❌'
            : '❓';
      const errorStatus =
        result.compliance.error_rate.status === 'compliant'
          ? '✅'
          : result.compliance.error_rate.status === 'violation'
            ? '❌'
            : '❓';

      const p95Value = result.current.p95_latency
        ? `${(result.current.p95_latency * 1000).toFixed(0)}ms`
        : 'N/A';
      const p99Value = result.current.p99_latency
        ? `${(result.current.p99_latency * 1000).toFixed(0)}ms`
        : 'N/A';
      const errorValue = result.current.error_rate
        ? `${(result.current.error_rate * 100).toFixed(2)}%`
        : 'N/A';

      report += `\n| ${result.endpoint} | ${statusIcon} ${result.status} | ${p95Value} ${p95Status} | ${p99Value} ${p99Status} | ${errorValue} ${errorStatus} | ${result.budget.critical ? '🔥' : ''} |`;
    }

    // Add budget details
    report += `\n\n## 🎯 Budget Thresholds

| Endpoint | p95 Budget | p99 Budget | Error Rate Budget | Description |
|----------|------------|------------|-------------------|-------------|`;

    for (const [endpoint, budget] of Object.entries(this.budgets.endpoints)) {
      report += `\n| ${endpoint} | ${budget.p95_budget_ms}ms | ${budget.p99_budget_ms}ms | ${(budget.error_rate_budget * 100).toFixed(1)}% | ${budget.description} |`;
    }

    // Add violations section if any
    const violations = this.results.endpoints.filter(
      (ep) => ep.status === 'failed',
    );
    if (violations.length > 0) {
      report += `\n\n## ⚠️ Budget Violations

`;
      violations.forEach((violation) => {
        report += `### ${violation.endpoint}

`;
        violation.issues.forEach((issue) => {
          report += `- ❌ ${issue}\n`;
        });

        // Add recommendations
        report += `
**Recommendations:**
- Review recent code changes affecting this endpoint
- Check for database query performance regressions
- Validate caching behavior and hit rates
- Monitor resource utilization (CPU, memory, I/O)
- Consider load testing with realistic traffic patterns

`;
      });
    }

    // Add action items
    if (hasCriticalFailures) {
      report += `\n## 🚨 Critical Action Required

Critical endpoints are failing performance budgets. This may indicate:
- Production performance regression
- Infrastructure issues
- Code changes requiring optimization

**Immediate Actions:**
1. Review and validate recent deployments
2. Check monitoring dashboards for anomalies
3. Consider rolling back if performance cannot be quickly restored
4. Investigate root cause before proceeding with merge

`;
    } else if (this.results.summary.failed > 0) {
      report += `\n## 🔧 Optimization Recommended

Non-critical endpoints are exceeding budgets. Consider:
- Performance profiling and optimization
- Caching improvements
- Database query optimization
- Load testing validation

`;
    }

    report += `\n---
*Performance Budget Report generated at ${timestamp}*
📊 [Performance Dashboard](https://grafana.intelgraph.com/d/endpoint-performance) | 🔍 [Query Metrics](${config.prometheusUrl})`;

    return report;
  }

  /**
   * Post report to GitHub PR
   */
  async postToGitHub(report) {
    if (!config.githubToken || !config.prNumber) {
      console.log('📝 GitHub integration not configured, skipping PR comment');
      return;
    }

    console.log('📝 Posting budget report to GitHub PR...');

    const commentsUrl = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/issues/${config.prNumber}/comments`;

    // Check for existing budget report comment
    const commentsResponse = await this.githubRequest(commentsUrl);
    const existingComment = commentsResponse.data.find((comment) =>
      comment.body.includes('Endpoint Performance Budget Report'),
    );

    const commentBody = `<!-- PERFORMANCE-BUDGET-REPORT -->
${report}`;

    if (existingComment) {
      // Update existing comment
      const updateUrl = `https://api.github.com/repos/${config.repoOwner}/${config.repoName}/issues/comments/${existingComment.id}`;
      await this.githubRequest(updateUrl, 'PATCH', { body: commentBody });
      console.log('✅ Updated existing budget report comment');
    } else {
      // Create new comment
      await this.githubRequest(commentsUrl, 'POST', { body: commentBody });
      console.log('✅ Created new budget report comment');
    }
  }

  /**
   * GitHub API helper
   */
  async githubRequest(url, method = 'GET', body = null) {
    return new Promise((resolve, reject) => {
      const options = {
        method,
        headers: {
          Authorization: `token ${config.githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'endpoint-budget-checker/1.0',
          'Content-Type': 'application/json',
        },
      };

      const req = https.request(url, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const jsonData = data ? JSON.parse(data) : {};
            resolve({ status: res.statusCode, data: jsonData });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      });

      req.on('error', reject);

      if (body) {
        req.write(JSON.stringify(body));
      }

      req.end();
    });
  }

  /**
   * Main execution
   */
  async run() {
    console.log('🎯 Starting endpoint performance budget check...');
    console.log(`📊 Prometheus: ${config.prometheusUrl}`);
    console.log(
      `⏱️  Window: ${config.currentWindowMinutes}m vs ${config.baselineHours}h baseline`,
    );
    console.log(`🚫 Fail on breach: ${config.failOnBudgetBreach}`);

    try {
      // Load budgets
      await this.loadBudgets();

      // Check compliance
      await this.checkEndpointBudgets();

      // Generate report
      const report = this.generateReport();

      // Post to GitHub if configured
      await this.postToGitHub(report);

      // Output report
      console.log('\n' + report);

      // Save report to file
      const reportFile = 'endpoint-budget-report.md';
      await fs.writeFile(reportFile, report);
      console.log(`📄 Report saved to ${reportFile}`);

      // Determine exit code
      const hasCriticalFailures = this.results.endpoints.some(
        (ep) => ep.budget.critical && ep.status === 'failed',
      );

      if (hasCriticalFailures && config.failOnBudgetBreach) {
        console.log('🚨 Critical budget violations detected - failing build');
        process.exit(1);
      } else if (this.results.summary.failed > 0 && config.failOnBudgetBreach) {
        console.log('⚠️  Budget violations detected - failing build');
        process.exit(1);
      } else {
        console.log('✅ All performance budgets within limits');
        process.exit(0);
      }
    } catch (error) {
      console.error('❌ Budget check failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI execution
if (require.main === module) {
  const checker = new EndpointBudgetChecker();
  checker.run();
}

module.exports = { EndpointBudgetChecker };
