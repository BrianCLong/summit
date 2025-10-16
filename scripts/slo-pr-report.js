#!/usr/bin/env node
/**
 * SLO PR Report Generator
 *
 * Generates sticky SLO reports on PRs to make performance regressions
 * visible before merge. Integrates with error budget tracking.
 */

const https = require('https');
const fs = require('fs').promises;

const config = {
  owner: process.env.GITHUB_REPOSITORY_OWNER || 'BrianCLong',
  repo: process.env.GITHUB_REPOSITORY_NAME || 'summit',
  prNumber: process.env.PR_NUMBER || process.env.GITHUB_PR_NUMBER,
  githubToken: process.env.GITHUB_TOKEN,
  prometheusUrl: process.env.PROMETHEUS_URL || 'http://localhost:9090',
  baselineHours: 24, // Compare against last 24 hours
  thresholds: {
    availability: 0.999, // 99.9%
    latency_p95: 200, // 200ms
    latency_p99: 500, // 500ms
    error_budget_burn: 2.0, // 2x normal burn rate
  },
};

class SLOPRReporter {
  constructor() {
    this.baselineMetrics = null;
    this.currentMetrics = null;
    this.previousReport = null;
  }

  /**
   * Make Prometheus query
   */
  async prometheusQuery(query, time) {
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
    });
  }

  /**
   * Get baseline metrics (24h ago)
   */
  async getBaselineMetrics() {
    const baselineTime = Math.floor(
      (Date.now() - config.baselineHours * 60 * 60 * 1000) / 1000,
    );

    console.log('📊 Fetching baseline metrics...');

    const queries = {
      availability: 'sli:availability:rate1h{service="intelgraph-server"}',
      latency_p95:
        'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="intelgraph-server"}[1h])) by (le))',
      latency_p99:
        'histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job="intelgraph-server"}[1h])) by (le))',
      error_rate: '1 - sli:availability:rate1h{service="intelgraph-server"}',
      request_rate:
        'sum(rate(http_requests_total{job="intelgraph-server"}[1h]))',
      error_budget_burn:
        'error_budget:burn_rate:1h{service="intelgraph-server"}',
    };

    const baseline = {};
    for (const [metric, query] of Object.entries(queries)) {
      try {
        const result = await this.prometheusQuery(query, baselineTime);
        baseline[metric] = this.extractValue(result);
      } catch (error) {
        console.warn(`⚠️  Failed to fetch baseline ${metric}:`, error.message);
        baseline[metric] = null;
      }
    }

    this.baselineMetrics = baseline;
    return baseline;
  }

  /**
   * Get current metrics
   */
  async getCurrentMetrics() {
    console.log('📈 Fetching current metrics...');

    const queries = {
      availability: 'sli:availability:rate5m{service="intelgraph-server"}',
      latency_p95:
        'histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket{job="intelgraph-server"}[5m])) by (le))',
      latency_p99:
        'histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket{job="intelgraph-server"}[5m])) by (le))',
      error_rate: '1 - sli:availability:rate5m{service="intelgraph-server"}',
      request_rate:
        'sum(rate(http_requests_total{job="intelgraph-server"}[5m]))',
      error_budget_burn:
        'error_budget:burn_rate:5m{service="intelgraph-server"}',
    };

    const current = {};
    for (const [metric, query] of Object.entries(queries)) {
      try {
        const result = await this.prometheusQuery(query);
        current[metric] = this.extractValue(result);
      } catch (error) {
        console.warn(`⚠️  Failed to fetch current ${metric}:`, error.message);
        current[metric] = null;
      }
    }

    this.currentMetrics = current;
    return current;
  }

  /**
   * Extract numeric value from Prometheus result
   */
  extractValue(prometheusResult) {
    if (!prometheusResult.result || prometheusResult.result.length === 0) {
      return null;
    }

    const value = prometheusResult.result[0].value[1];
    return parseFloat(value);
  }

  /**
   * Calculate performance changes
   */
  calculateChanges() {
    if (!this.baselineMetrics || !this.currentMetrics) {
      throw new Error('Metrics not loaded');
    }

    const changes = {};

    for (const metric of Object.keys(this.currentMetrics)) {
      const current = this.currentMetrics[metric];
      const baseline = this.baselineMetrics[metric];

      if (current !== null && baseline !== null && baseline !== 0) {
        const change = ((current - baseline) / baseline) * 100;
        changes[metric] = {
          current,
          baseline,
          change,
          status: this.getChangeStatus(metric, current, change),
        };
      } else {
        changes[metric] = {
          current,
          baseline,
          change: null,
          status: 'unknown',
        };
      }
    }

    return changes;
  }

  /**
   * Determine status based on metric type and change
   */
  getChangeStatus(metric, current, change) {
    // Check SLO compliance first
    if (metric === 'availability' && current < config.thresholds.availability) {
      return 'slo_breach';
    }
    if (
      metric === 'latency_p95' &&
      current > config.thresholds.latency_p95 / 1000
    ) {
      return 'slo_breach';
    }
    if (
      metric === 'latency_p99' &&
      current > config.thresholds.latency_p99 / 1000
    ) {
      return 'slo_breach';
    }
    if (
      metric === 'error_budget_burn' &&
      current > config.thresholds.error_budget_burn
    ) {
      return 'budget_burn';
    }

    // Check for significant regressions
    if (change === null) return 'unknown';

    const thresholds = {
      availability: { regression: -0.1, improvement: 0.01 },
      latency_p95: { regression: 10, improvement: -5 },
      latency_p99: { regression: 10, improvement: -5 },
      error_rate: { regression: 50, improvement: -10 },
      error_budget_burn: { regression: 50, improvement: -10 },
    };

    const threshold = thresholds[metric] || { regression: 10, improvement: -5 };

    if (change > threshold.regression) {
      return 'regression';
    } else if (change < threshold.improvement) {
      return 'improvement';
    } else {
      return 'stable';
    }
  }

  /**
   * Generate SLO report markdown
   */
  generateReport(changes) {
    const timestamp = new Date().toISOString();
    const hasRegressions = Object.values(changes).some(
      (c) =>
        c.status === 'slo_breach' ||
        c.status === 'regression' ||
        c.status === 'budget_burn',
    );

    const statusEmoji = hasRegressions ? '🚨' : '✅';
    const overallStatus = hasRegressions
      ? 'REGRESSIONS DETECTED'
      : 'SLO COMPLIANT';

    let report = `## ${statusEmoji} SLO Performance Report

**Status**: ${overallStatus}
**Timestamp**: ${timestamp}
**Baseline**: Last ${config.baselineHours}h average
**PR**: #${config.prNumber}

### 📊 Performance Metrics

| Metric | Current | Baseline | Change | Status |
|--------|---------|----------|--------|--------|`;

    // Availability
    const avail = changes.availability;
    if (avail.current !== null) {
      const availPercent = (avail.current * 100).toFixed(3);
      const baselinePercent = avail.baseline
        ? (avail.baseline * 100).toFixed(3)
        : 'N/A';
      const changeStr =
        avail.change !== null
          ? `${avail.change > 0 ? '+' : ''}${avail.change.toFixed(2)}%`
          : 'N/A';
      const statusIcon = this.getStatusIcon(avail.status);

      report += `\n| Availability | ${availPercent}% | ${baselinePercent}% | ${changeStr} | ${statusIcon} ${avail.status} |`;
    }

    // Latency P95
    const p95 = changes.latency_p95;
    if (p95.current !== null) {
      const p95Ms = (p95.current * 1000).toFixed(0);
      const baselineMs = p95.baseline
        ? (p95.baseline * 1000).toFixed(0)
        : 'N/A';
      const changeStr =
        p95.change !== null
          ? `${p95.change > 0 ? '+' : ''}${p95.change.toFixed(1)}%`
          : 'N/A';
      const statusIcon = this.getStatusIcon(p95.status);

      report += `\n| p95 Latency | ${p95Ms}ms | ${baselineMs}ms | ${changeStr} | ${statusIcon} ${p95.status} |`;
    }

    // Latency P99
    const p99 = changes.latency_p99;
    if (p99.current !== null) {
      const p99Ms = (p99.current * 1000).toFixed(0);
      const baselineMs = p99.baseline
        ? (p99.baseline * 1000).toFixed(0)
        : 'N/A';
      const changeStr =
        p99.change !== null
          ? `${p99.change > 0 ? '+' : ''}${p99.change.toFixed(1)}%`
          : 'N/A';
      const statusIcon = this.getStatusIcon(p99.status);

      report += `\n| p99 Latency | ${p99Ms}ms | ${baselineMs}ms | ${changeStr} | ${statusIcon} ${p99.status} |`;
    }

    // Error Rate
    const errorRate = changes.error_rate;
    if (errorRate.current !== null) {
      const errorPercent = (errorRate.current * 100).toFixed(3);
      const baselinePercent = errorRate.baseline
        ? (errorRate.baseline * 100).toFixed(3)
        : 'N/A';
      const changeStr =
        errorRate.change !== null
          ? `${errorRate.change > 0 ? '+' : ''}${errorRate.change.toFixed(1)}%`
          : 'N/A';
      const statusIcon = this.getStatusIcon(errorRate.status);

      report += `\n| Error Rate | ${errorPercent}% | ${baselinePercent}% | ${changeStr} | ${statusIcon} ${errorRate.status} |`;
    }

    // Error Budget Burn
    const budgetBurn = changes.error_budget_burn;
    if (budgetBurn.current !== null) {
      const burnRate = budgetBurn.current.toFixed(2);
      const baselineBurn = budgetBurn.baseline
        ? budgetBurn.baseline.toFixed(2)
        : 'N/A';
      const changeStr =
        budgetBurn.change !== null
          ? `${budgetBurn.change > 0 ? '+' : ''}${budgetBurn.change.toFixed(1)}%`
          : 'N/A';
      const statusIcon = this.getStatusIcon(budgetBurn.status);

      report += `\n| Error Budget Burn | ${burnRate}x | ${baselineBurn}x | ${changeStr} | ${statusIcon} ${budgetBurn.status} |`;
    }

    // Add SLO targets
    report += `\n\n### 🎯 SLO Targets

| Metric | Target | Current Compliance |
|--------|--------|-------------------|
| Availability | ≥99.9% | ${avail.current ? (avail.current >= 0.999 ? '✅' : '❌') : '❓'} |
| p95 Latency | <200ms | ${p95.current ? (p95.current < 0.2 ? '✅' : '❌') : '❓'} |
| p99 Latency | <500ms | ${p99.current ? (p99.current < 0.5 ? '✅' : '❌') : '❓'} |
| Error Budget Burn | <2.0x | ${budgetBurn.current ? (budgetBurn.current < 2.0 ? '✅' : '❌') : '❓'} |`;

    // Add recommendations if regressions detected
    if (hasRegressions) {
      report += `\n\n### 🔧 Recommended Actions

`;

      const regressionList = Object.entries(changes)
        .filter(
          ([_, data]) =>
            data.status === 'slo_breach' ||
            data.status === 'regression' ||
            data.status === 'budget_burn',
        )
        .map(([metric, data]) => {
          switch (data.status) {
            case 'slo_breach':
              return `- **${metric}**: SLO breach detected - immediate investigation required`;
            case 'budget_burn':
              return `- **${metric}**: Error budget burning too fast - review recent changes`;
            case 'regression':
              return `- **${metric}**: Performance regression detected - consider optimization`;
            default:
              return `- **${metric}**: Issue detected - review performance impact`;
          }
        });

      report += regressionList.join('\n');

      report += `\n\n**⚠️ This PR may introduce performance regressions. Consider:**
- Load testing the changes
- Reviewing database query performance
- Checking for memory leaks or CPU hotspots
- Validating caching behavior`;
    }

    // Add footer
    report += `\n\n---
*SLO Report generated at ${timestamp}*
*Baseline: ${config.baselineHours}h rolling average*
📊 [Performance Dashboard](https://grafana.intelgraph.com/d/slo-overview) | 🔍 [Trace Analysis](https://tempo.intelgraph.com)`;

    return report;
  }

  /**
   * Get status icon for metric status
   */
  getStatusIcon(status) {
    const icons = {
      slo_breach: '🚨',
      budget_burn: '⚠️',
      regression: '📉',
      improvement: '📈',
      stable: '✅',
      unknown: '❓',
    };
    return icons[status] || '❓';
  }

  /**
   * Post or update PR comment
   */
  async updatePRComment(report) {
    if (!config.prNumber || !config.githubToken) {
      console.log('📝 SLO Report (would be posted to PR):');
      console.log(report);
      return;
    }

    console.log('📝 Posting SLO report to PR...');

    // Get existing comments
    const commentsUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/issues/${config.prNumber}/comments`;

    const commentsReq = await this.githubRequest(commentsUrl);
    const comments = commentsReq.data;

    // Find existing SLO report comment
    const existingComment = comments.find(
      (comment) =>
        comment.body.includes('SLO Performance Report') &&
        comment.user.login === 'github-actions[bot]',
    );

    const commentBody = `<!-- SLO-REPORT -->
${report}`;

    if (existingComment) {
      // Update existing comment
      const updateUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/issues/comments/${existingComment.id}`;
      await this.githubRequest(updateUrl, 'PATCH', { body: commentBody });
      console.log('✅ Updated existing SLO report comment');
    } else {
      // Create new comment
      await this.githubRequest(commentsUrl, 'POST', { body: commentBody });
      console.log('✅ Created new SLO report comment');
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
          'User-Agent': 'slo-pr-reporter/1.0',
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
  async generateSLOReport() {
    console.log('🚦 Starting SLO PR report generation...');
    console.log(`📊 Repository: ${config.owner}/${config.repo}`);
    console.log(`🔀 PR Number: ${config.prNumber || 'N/A'}`);

    try {
      // Fetch metrics
      await Promise.all([this.getBaselineMetrics(), this.getCurrentMetrics()]);

      // Calculate changes
      const changes = this.calculateChanges();

      // Generate report
      const report = this.generateReport(changes);

      // Post to PR
      await this.updatePRComment(report);

      // Check for blocking issues
      const hasBlockingIssues = Object.values(changes).some(
        (c) => c.status === 'slo_breach',
      );

      if (hasBlockingIssues) {
        console.log('🚨 SLO breaches detected - consider blocking merge');
        process.exit(1);
      } else {
        console.log('✅ SLO report generated successfully');
        process.exit(0);
      }
    } catch (error) {
      console.error('❌ Failed to generate SLO report:', error.message);
      process.exit(1);
    }
  }
}

// CLI execution
if (require.main === module) {
  const reporter = new SLOPRReporter();
  reporter.generateSLOReport();
}

module.exports = { SLOPRReporter };
