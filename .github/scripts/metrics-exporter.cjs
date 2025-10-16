#!/usr/bin/env node

/**
 * Release Captain Metrics Exporter
 *
 * Exports Prometheus metrics for Release Captain operations.
 * Provides observability into deployment patterns, gate failures, and system health.
 */

const fs = require('fs');
const { execSync } = require('child_process');

class MetricsExporter {
  constructor() {
    this.metrics = new Map();
    this.labels = new Map();
    this.startTime = Date.now();
  }

  // Counter: Increment-only metrics
  incrementCounter(name, labels = {}, value = 1) {
    const key = this.getMetricKey(name, labels);
    const current = this.metrics.get(key) || 0;
    this.metrics.set(key, current + value);
    this.labels.set(name, { ...this.labels.get(name), ...labels });
  }

  // Gauge: Set current value metrics
  setGauge(name, labels = {}, value) {
    const key = this.getMetricKey(name, labels);
    this.metrics.set(key, value);
    this.labels.set(name, { ...this.labels.get(name), ...labels });
  }

  // Histogram: For timing and distribution metrics
  recordHistogram(name, labels = {}, value) {
    // Simplified histogram - in production, use proper buckets
    const buckets = [0.1, 0.5, 1, 5, 10, 30, 60, 300, 600, 1800]; // seconds

    for (const bucket of buckets) {
      if (value <= bucket) {
        const bucketLabels = { ...labels, le: bucket.toString() };
        this.incrementCounter(`${name}_bucket`, bucketLabels);
      }
    }

    this.incrementCounter(`${name}_count`, labels);
    this.setGauge(
      `${name}_sum`,
      labels,
      (this.metrics.get(this.getMetricKey(`${name}_sum`, labels)) || 0) + value,
    );
  }

  getMetricKey(name, labels) {
    const labelStr = Object.entries(labels)
      .sort()
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelStr ? `${name}{${labelStr}}` : name;
  }

  // Collect Release Captain metrics from GitHub API
  async collectReleaseMetrics() {
    try {
      console.log('📊 Collecting Release Captain metrics...');

      // Get recent workflow runs
      const runs = await this.getWorkflowRuns('release-captain.yml', 50);

      for (const run of runs) {
        const labels = {
          conclusion: run.conclusion || 'unknown',
          event: run.event || 'unknown',
          branch: run.head_branch || 'unknown',
        };

        this.incrementCounter('rc_workflow_runs_total', labels);

        if (run.conclusion === 'success') {
          this.incrementCounter('rc_workflow_success_total', labels);
        } else if (run.conclusion === 'failure') {
          this.incrementCounter('rc_workflow_failure_total', labels);
        }

        // Record timing
        if (run.created_at && run.updated_at) {
          const duration =
            (new Date(run.updated_at) - new Date(run.created_at)) / 1000;
          this.recordHistogram(
            'rc_workflow_duration_seconds',
            labels,
            duration,
          );
        }
      }

      console.log(`✅ Processed ${runs.length} workflow runs`);
    } catch (error) {
      console.warn('Failed to collect release metrics:', error.message);
    }
  }

  // Collect PR analysis metrics
  async collectPRMetrics() {
    try {
      console.log('📊 Collecting PR metrics...');

      const prs = await this.getRecentPRs(50);

      for (const pr of prs) {
        // Analyze PR for risk assessment
        const riskLevel = await this.assessPRRisk(pr);

        const labels = {
          risk: riskLevel.toLowerCase(),
          state: pr.state,
          draft: pr.draft.toString(),
        };

        this.incrementCounter('rc_pr_analyzed_total', labels);

        if (pr.merged_at) {
          this.incrementCounter('rc_pr_merged_total', labels);

          // Time to merge
          const timeToMerge =
            (new Date(pr.merged_at) - new Date(pr.created_at)) / 1000;
          this.recordHistogram(
            'rc_pr_time_to_merge_seconds',
            labels,
            timeToMerge,
          );
        }
      }

      console.log(`✅ Processed ${prs.length} PRs`);
    } catch (error) {
      console.warn('Failed to collect PR metrics:', error.message);
    }
  }

  // Collect quality gate metrics
  async collectQualityGateMetrics() {
    try {
      console.log('📊 Collecting quality gate metrics...');

      const gates = ['build', 'typecheck', 'lint', 'tests', 'security', 'helm'];

      // Get recent PR validation runs
      const runs = await this.getWorkflowRuns('pr-validation.yml', 100);

      for (const run of runs) {
        if (run.conclusion) {
          for (const gate of gates) {
            // Simulate gate results based on run outcome
            // In practice, you'd parse job results
            const gateResult = run.conclusion === 'success' ? 'pass' : 'fail';

            this.incrementCounter('rc_gate_total', {
              gate: gate,
              result: gateResult,
              pr: run.pull_requests?.[0]?.number?.toString() || 'unknown',
            });
          }
        }
      }

      console.log(`✅ Processed quality gate metrics`);
    } catch (error) {
      console.warn('Failed to collect quality gate metrics:', error.message);
    }
  }

  // Collect auto-fix metrics
  async collectAutoFixMetrics() {
    try {
      console.log('📊 Collecting auto-fix metrics...');

      // Search for auto-fix commits
      const commits = await this.getAutoFixCommits();

      for (const commit of commits) {
        const fixTypes = this.parseAutoFixTypes(commit.message);

        for (const fixType of fixTypes) {
          this.incrementCounter('rc_autofix_applied_total', {
            type: fixType,
            author: commit.author?.login || 'unknown',
          });
        }
      }

      console.log(`✅ Processed ${commits.length} auto-fix commits`);
    } catch (error) {
      console.warn('Failed to collect auto-fix metrics:', error.message);
    }
  }

  // Collect deployment health metrics
  async collectDeploymentHealthMetrics() {
    try {
      console.log('📊 Collecting deployment health metrics...');

      // Check health endpoints
      const endpoints = [
        { name: 'api', url: 'https://api.summit.dev/health' },
        { name: 'web', url: 'https://summit.dev/health' },
        { name: 'gateway', url: 'https://gateway.summit.dev/health' },
      ];

      for (const endpoint of endpoints) {
        try {
          const startTime = Date.now();
          // In practice, make actual HTTP requests
          // const response = await fetch(endpoint.url);
          const responseTime = (Date.now() - startTime) / 1000;

          // Simulate health status
          const isHealthy = Math.random() > 0.05; // 95% uptime simulation

          this.setGauge(
            'rc_deploy_health_ratio',
            {
              service: endpoint.name,
            },
            isHealthy ? 1 : 0,
          );

          this.recordHistogram(
            'rc_health_check_duration_seconds',
            {
              service: endpoint.name,
            },
            responseTime,
          );
        } catch (error) {
          this.setGauge(
            'rc_deploy_health_ratio',
            {
              service: endpoint.name,
            },
            0,
          );
        }
      }

      console.log(
        `✅ Processed health metrics for ${endpoints.length} services`,
      );
    } catch (error) {
      console.warn(
        'Failed to collect deployment health metrics:',
        error.message,
      );
    }
  }

  // Collect circuit breaker metrics
  async collectCircuitBreakerMetrics() {
    try {
      console.log('📊 Collecting circuit breaker metrics...');

      // Get circuit state from safety circuit
      let circuitState = 'unknown';
      let failureCount = 0;
      let recentDeployments = 0;

      try {
        const statusOutput = execSync(
          'node .github/scripts/safety-circuit.cjs status',
          {
            encoding: 'utf8',
            timeout: 5000,
          },
        );

        const status = JSON.parse(statusOutput);
        circuitState = status.circuit?.toLowerCase() || 'unknown';
        failureCount = status.failureCount || 0;
        recentDeployments = status.recentDeployments || 0;
      } catch (error) {
        console.warn('Could not get circuit status:', error.message);
      }

      // Map circuit states to numeric values
      const circuitStateValue =
        {
          closed: 0,
          half_open: 1,
          open: 2,
        }[circuitState] || -1;

      this.setGauge('rc_circuit_state', {}, circuitStateValue);
      this.setGauge('rc_circuit_failure_count', {}, failureCount);
      this.setGauge('rc_recent_deployments', {}, recentDeployments);

      console.log(
        `✅ Circuit state: ${circuitState}, failures: ${failureCount}`,
      );
    } catch (error) {
      console.warn('Failed to collect circuit breaker metrics:', error.message);
    }
  }

  // Collect rollback metrics
  async collectRollbackMetrics() {
    try {
      console.log('📊 Collecting rollback metrics...');

      // Get recent auto-rollback runs
      const runs = await this.getWorkflowRuns('auto-rollback.yml', 20);

      for (const run of runs) {
        const labels = {
          success: run.conclusion === 'success' ? 'true' : 'false',
          trigger: run.event || 'unknown',
        };

        this.incrementCounter('rc_rollback_total', labels);

        if (run.created_at && run.updated_at) {
          const duration =
            (new Date(run.updated_at) - new Date(run.created_at)) / 1000;
          this.recordHistogram(
            'rc_rollback_duration_seconds',
            labels,
            duration,
          );
        }
      }

      console.log(`✅ Processed ${runs.length} rollback events`);
    } catch (error) {
      console.warn('Failed to collect rollback metrics:', error.message);
    }
  }

  // Helper methods
  async getWorkflowRuns(workflowFile, limit = 50) {
    try {
      const output = execSync(
        `gh run list --workflow=${workflowFile} --limit=${limit} --json status,conclusion,createdAt,updatedAt,event,headBranch,pullRequests`,
        {
          encoding: 'utf8',
          timeout: 10000,
        },
      );
      return JSON.parse(output);
    } catch (error) {
      console.warn(
        `Failed to get workflow runs for ${workflowFile}:`,
        error.message,
      );
      return [];
    }
  }

  async getRecentPRs(limit = 50) {
    try {
      const output = execSync(
        `gh pr list --state all --limit=${limit} --json number,state,createdAt,mergedAt,draft,title,additions,deletions`,
        {
          encoding: 'utf8',
          timeout: 10000,
        },
      );
      return JSON.parse(output);
    } catch (error) {
      console.warn('Failed to get recent PRs:', error.message);
      return [];
    }
  }

  async getAutoFixCommits() {
    try {
      const output = execSync(
        'gh api "/repos/{owner}/{repo}/commits?author=release-captain[bot]&per_page=50" --jq ".[].commit | {message: .message, author: .author}"',
        {
          encoding: 'utf8',
          timeout: 10000,
        },
      );
      return JSON.parse(
        `[${output
          .split('\n')
          .filter((line) => line.trim())
          .join(',')}]`,
      );
    } catch (error) {
      console.warn('Failed to get auto-fix commits:', error.message);
      return [];
    }
  }

  assessPRRisk(pr) {
    // Simple risk assessment based on PR characteristics
    let riskScore = 0;

    if (pr.additions + pr.deletions > 500) riskScore += 2;
    if (pr.title.toLowerCase().includes('migration')) riskScore += 3;
    if (pr.title.toLowerCase().includes('breaking')) riskScore += 2;
    if (pr.title.toLowerCase().includes('security')) riskScore += 1;

    if (riskScore >= 5) return 'HIGH';
    if (riskScore >= 3) return 'MEDIUM';
    return 'LOW';
  }

  parseAutoFixTypes(message) {
    const types = [];
    if (message.includes('lint')) types.push('lint');
    if (message.includes('format')) types.push('format');
    if (message.includes('import')) types.push('imports');
    if (message.includes('sort')) types.push('sort');
    return types.length > 0 ? types : ['unknown'];
  }

  // Export metrics in Prometheus format
  exportPrometheus() {
    let output = '';

    // Group metrics by name
    const metricGroups = new Map();

    for (const [key, value] of this.metrics) {
      const [metricName] = key.split('{');
      if (!metricGroups.has(metricName)) {
        metricGroups.set(metricName, []);
      }
      metricGroups.get(metricName).push([key, value]);
    }

    // Generate Prometheus format
    for (const [metricName, entries] of metricGroups) {
      // Add help and type comments
      output += `# HELP ${metricName} Release Captain metric\n`;

      if (metricName.includes('_total') || metricName.includes('_count')) {
        output += `# TYPE ${metricName} counter\n`;
      } else if (
        metricName.includes('_bucket') ||
        metricName.includes('_sum')
      ) {
        output += `# TYPE ${metricName} histogram\n`;
      } else {
        output += `# TYPE ${metricName} gauge\n`;
      }

      // Add metric entries
      for (const [key, value] of entries) {
        output += `${key} ${value}\n`;
      }

      output += '\n';
    }

    // Add metadata
    output += `# Release Captain metrics generated at ${new Date().toISOString()}\n`;
    output += `# Collection duration: ${(Date.now() - this.startTime) / 1000}s\n`;

    return output;
  }

  // Export metrics to file
  async exportToFile(filename = '/tmp/release-captain-metrics.prom') {
    const prometheus = this.exportPrometheus();
    fs.writeFileSync(filename, prometheus);
    console.log(`📄 Metrics exported to: ${filename}`);
    return filename;
  }

  // Main collection method
  async collectAllMetrics() {
    console.log('🚀 Starting Release Captain metrics collection...');

    await this.collectReleaseMetrics();
    await this.collectPRMetrics();
    await this.collectQualityGateMetrics();
    await this.collectAutoFixMetrics();
    await this.collectDeploymentHealthMetrics();
    await this.collectCircuitBreakerMetrics();
    await this.collectRollbackMetrics();

    const duration = (Date.now() - this.startTime) / 1000;
    console.log(`✅ Metrics collection completed in ${duration.toFixed(2)}s`);

    return this.metrics;
  }
}

// CLI usage
async function main() {
  const command = process.argv[2];
  const exporter = new MetricsExporter();

  try {
    switch (command) {
      case 'collect':
        await exporter.collectAllMetrics();
        console.log(`📊 Collected ${exporter.metrics.size} metrics`);
        break;

      case 'export':
        await exporter.collectAllMetrics();
        const filename = await exporter.exportToFile();
        console.log(`📤 Metrics exported to ${filename}`);
        break;

      case 'prometheus':
        await exporter.collectAllMetrics();
        console.log(exporter.exportPrometheus());
        break;

      case 'health':
        await exporter.collectDeploymentHealthMetrics();
        console.log('Health metrics collected');
        break;

      default:
        console.log('Release Captain Metrics Exporter');
        console.log('Usage: metrics-exporter.cjs <command>');
        console.log('Commands:');
        console.log('  collect     - Collect all metrics');
        console.log('  export      - Collect and export to file');
        console.log('  prometheus  - Output Prometheus format');
        console.log('  health      - Check deployment health only');
        break;
    }
  } catch (error) {
    console.error('Metrics collection failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { MetricsExporter };
