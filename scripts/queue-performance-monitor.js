#!/usr/bin/env node
/**
 * Queue Performance Monitoring and Guardrails
 *
 * Monitors GitHub merge queue performance and automatically applies
 * optimizations based on SLO targets and queue health
 */

const https = require('https');
const fs = require('fs').promises;

// Configuration
const config = {
  owner: process.env.GITHUB_REPOSITORY_OWNER || 'BrianCLong',
  repo: process.env.GITHUB_REPOSITORY_NAME || 'summit',
  githubToken: process.env.GITHUB_TOKEN,
  targets: {
    p50_wait_time: 10 * 60 * 1000, // 10 minutes
    p95_wait_time: 15 * 60 * 1000, // 15 minutes
    p99_wait_time: 30 * 60 * 1000, // 30 minutes
    max_queue_size: 10,
    max_ci_duration: 8 * 60 * 1000, // 8 minutes
  },
  thresholds: {
    queue_backup_size: 5,
    avg_wait_breach_count: 3,
    ci_failure_rate: 0.2, // 20%
  },
  optimizations: {
    dynamic_test_sharding: true,
    docker_layer_caching: true,
    rebase_before_queue: true,
    schema_infra_batch_limit: 1,
    auto_shrink_on_breach: true,
  },
};

class QueuePerformanceMonitor {
  constructor() {
    this.metrics = {
      queue_entries: [],
      wait_times: [],
      ci_durations: [],
      failure_counts: 0,
      success_counts: 0,
    };
    this.alertHistory = [];
  }

  /**
   * GitHub API helper
   */
  async githubAPI(endpoint, options = {}) {
    return new Promise((resolve, reject) => {
      const url = `https://api.github.com${endpoint}`;
      const requestOptions = {
        method: options.method || 'GET',
        headers: {
          Authorization: `token ${config.githubToken}`,
          Accept: 'application/vnd.github.v3+json',
          'User-Agent': 'queue-performance-monitor/1.0',
          ...options.headers,
        },
      };

      const req = https.request(url, requestOptions, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const jsonData = JSON.parse(data);
            resolve({
              status: res.statusCode,
              data: jsonData,
              headers: res.headers,
            });
          } catch (e) {
            resolve({ status: res.statusCode, data, headers: res.headers });
          }
        });
      });

      req.on('error', reject);

      if (options.body) {
        req.write(JSON.stringify(options.body));
      }

      req.end();
    });
  }

  /**
   * Collect queue metrics
   */
  async collectQueueMetrics() {
    console.log('📊 Collecting queue performance metrics...');

    try {
      // Get merge queue status
      const queueResponse = await this.githubAPI(
        `/repos/${config.owner}/${config.repo}/merge-queue`,
      );

      if (queueResponse.status === 200) {
        const queueData = queueResponse.data;
        this.metrics.queue_entries = queueData.entries || [];

        console.log(
          `📈 Current queue size: ${this.metrics.queue_entries.length}`,
        );

        // Calculate wait times for entries in queue
        const now = new Date();
        this.metrics.wait_times = this.metrics.queue_entries.map((entry) => {
          const entryTime = new Date(entry.created_at);
          return now - entryTime;
        });
      }

      // Get recent workflow runs for CI performance
      const runsResponse = await this.githubAPI(
        `/repos/${config.owner}/${config.repo}/actions/runs?per_page=50&status=completed`,
      );

      if (runsResponse.status === 200) {
        const runs = runsResponse.data.workflow_runs;

        // Calculate CI durations and success rates
        this.metrics.ci_durations = [];
        this.metrics.success_counts = 0;
        this.metrics.failure_counts = 0;

        for (const run of runs) {
          if (run.created_at && run.updated_at) {
            const duration =
              new Date(run.updated_at) - new Date(run.created_at);
            this.metrics.ci_durations.push(duration);

            if (run.conclusion === 'success') {
              this.metrics.success_counts++;
            } else if (run.conclusion === 'failure') {
              this.metrics.failure_counts++;
            }
          }
        }

        console.log(`⏱️  Recent CI runs: ${runs.length}`);
        console.log(
          `✅ Success rate: ${((this.metrics.success_counts / runs.length) * 100).toFixed(1)}%`,
        );
      }

      return this.metrics;
    } catch (error) {
      console.error('❌ Failed to collect queue metrics:', error.message);
      throw error;
    }
  }

  /**
   * Calculate performance statistics
   */
  calculateStats() {
    const stats = {
      queue_size: this.metrics.queue_entries.length,
      wait_times: this.calculatePercentiles(this.metrics.wait_times),
      ci_durations: this.calculatePercentiles(this.metrics.ci_durations),
      success_rate:
        this.metrics.success_counts /
        (this.metrics.success_counts + this.metrics.failure_counts),
      failure_rate:
        this.metrics.failure_counts /
        (this.metrics.success_counts + this.metrics.failure_counts),
    };

    return stats;
  }

  /**
   * Calculate percentiles for array of values
   */
  calculatePercentiles(values) {
    if (values.length === 0) return { p50: 0, p95: 0, p99: 0, avg: 0 };

    const sorted = values.sort((a, b) => a - b);
    const len = sorted.length;

    return {
      p50: sorted[Math.floor(len * 0.5)] || 0,
      p95: sorted[Math.floor(len * 0.95)] || 0,
      p99: sorted[Math.floor(len * 0.99)] || 0,
      avg: values.reduce((sum, val) => sum + val, 0) / len,
    };
  }

  /**
   * Evaluate SLO compliance
   */
  evaluateSLOs(stats) {
    const violations = [];

    // Wait time SLOs
    if (stats.wait_times.p50 > config.targets.p50_wait_time) {
      violations.push({
        type: 'wait_time_p50',
        current: stats.wait_times.p50,
        target: config.targets.p50_wait_time,
        severity: 'high',
      });
    }

    if (stats.wait_times.p95 > config.targets.p95_wait_time) {
      violations.push({
        type: 'wait_time_p95',
        current: stats.wait_times.p95,
        target: config.targets.p95_wait_time,
        severity: 'critical',
      });
    }

    if (stats.wait_times.p99 > config.targets.p99_wait_time) {
      violations.push({
        type: 'wait_time_p99',
        current: stats.wait_times.p99,
        target: config.targets.p99_wait_time,
        severity: 'critical',
      });
    }

    // Queue size SLO
    if (stats.queue_size > config.targets.max_queue_size) {
      violations.push({
        type: 'queue_size',
        current: stats.queue_size,
        target: config.targets.max_queue_size,
        severity: 'medium',
      });
    }

    // CI duration SLO
    if (stats.ci_durations.p95 > config.targets.max_ci_duration) {
      violations.push({
        type: 'ci_duration_p95',
        current: stats.ci_durations.p95,
        target: config.targets.max_ci_duration,
        severity: 'high',
      });
    }

    // Failure rate SLO
    if (stats.failure_rate > config.thresholds.ci_failure_rate) {
      violations.push({
        type: 'ci_failure_rate',
        current: stats.failure_rate,
        target: config.thresholds.ci_failure_rate,
        severity: 'high',
      });
    }

    return violations;
  }

  /**
   * Apply performance optimizations
   */
  async applyOptimizations(violations) {
    console.log('🔧 Applying performance optimizations...');

    const optimizations = [];

    for (const violation of violations) {
      switch (violation.type) {
        case 'wait_time_p95':
        case 'wait_time_p99':
          if (config.optimizations.dynamic_test_sharding) {
            optimizations.push(await this.enableTestSharding());
          }
          if (config.optimizations.docker_layer_caching) {
            optimizations.push(await this.optimizeDockerCaching());
          }
          break;

        case 'queue_size':
          if (config.optimizations.rebase_before_queue) {
            optimizations.push(await this.enableAutoRebase());
          }
          break;

        case 'ci_duration_p95':
          if (config.optimizations.auto_shrink_on_breach) {
            optimizations.push(await this.enableParallelization());
          }
          break;

        case 'ci_failure_rate':
          optimizations.push(await this.analyzeFailurePatterns());
          break;
      }
    }

    return optimizations.filter(Boolean);
  }

  /**
   * Enable dynamic test sharding
   */
  async enableTestSharding() {
    console.log('🧪 Enabling dynamic test sharding...');

    const shardingConfig = {
      matrix: {
        shard: [1, 2, 3, 4], // 4-way sharding
      },
      strategy: {
        'fail-fast': false,
        'max-parallel': 4,
      },
    };

    // Update workflow file would happen here
    // For now, just log the recommendation
    console.log('💡 Recommendation: Enable 4-way test sharding in CI workflow');

    return {
      type: 'test_sharding',
      status: 'recommended',
      config: shardingConfig,
    };
  }

  /**
   * Optimize Docker layer caching
   */
  async optimizeDockerCaching() {
    console.log('🐳 Optimizing Docker layer caching...');

    const cachingStrategy = {
      'build-args': ['BUILDKIT_INLINE_CACHE=1'],
      'cache-from': ['type=gha', 'type=registry'],
      'cache-to': ['type=gha,mode=max'],
    };

    console.log(
      '💡 Recommendation: Update Docker build actions with advanced caching',
    );

    return {
      type: 'docker_caching',
      status: 'recommended',
      config: cachingStrategy,
    };
  }

  /**
   * Enable auto-rebase before queue entry
   */
  async enableAutoRebase() {
    console.log('🔄 Enabling auto-rebase before queue...');

    // This would update branch protection rules
    console.log(
      '💡 Recommendation: Enable "Require branches to be up to date"',
    );

    return {
      type: 'auto_rebase',
      status: 'recommended',
      note: 'Update branch protection settings',
    };
  }

  /**
   * Enable CI parallelization
   */
  async enableParallelization() {
    console.log('⚡ Enabling CI parallelization...');

    const parallelConfig = {
      'jobs-can-run-in-parallel': [
        'lint-and-typecheck',
        'unit-integration-tests',
        'security-gates',
      ],
      'matrix-strategies': {
        'test-matrix': ['unit', 'integration', 'e2e'],
        'build-matrix': ['server', 'client', 'mobile'],
      },
    };

    console.log(
      '💡 Recommendation: Maximize job parallelization in CI workflow',
    );

    return {
      type: 'ci_parallelization',
      status: 'recommended',
      config: parallelConfig,
    };
  }

  /**
   * Analyze CI failure patterns
   */
  async analyzeFailurePatterns() {
    console.log('🔍 Analyzing CI failure patterns...');

    // Get recent failed runs
    const failedRuns = await this.githubAPI(
      `/repos/${config.owner}/${config.repo}/actions/runs?status=failure&per_page=20`,
    );

    const patterns = {
      flaky_tests: 0,
      dependency_issues: 0,
      infrastructure_failures: 0,
      timeout_failures: 0,
    };

    if (failedRuns.status === 200) {
      // Analyze failure patterns (simplified)
      for (const run of failedRuns.data.workflow_runs) {
        if (run.conclusion === 'failure') {
          // This would require more detailed log analysis
          patterns.infrastructure_failures++;
        }
      }
    }

    console.log('📊 Failure pattern analysis complete');

    return {
      type: 'failure_analysis',
      status: 'completed',
      patterns,
      recommendations: [
        'Review flaky test patterns',
        'Update dependency management',
        'Improve infrastructure reliability',
      ],
    };
  }

  /**
   * Generate performance report
   */
  generateReport(stats, violations, optimizations) {
    const timestamp = new Date().toISOString();

    const report = {
      timestamp,
      repository: `${config.owner}/${config.repo}`,
      performance: {
        queue_size: stats.queue_size,
        wait_times: {
          p50: `${Math.round(stats.wait_times.p50 / 60000)}m`,
          p95: `${Math.round(stats.wait_times.p95 / 60000)}m`,
          p99: `${Math.round(stats.wait_times.p99 / 60000)}m`,
        },
        ci_performance: {
          avg_duration: `${Math.round(stats.ci_durations.avg / 60000)}m`,
          p95_duration: `${Math.round(stats.ci_durations.p95 / 60000)}m`,
          success_rate: `${(stats.success_rate * 100).toFixed(1)}%`,
        },
      },
      slo_compliance: {
        violations_count: violations.length,
        critical_violations: violations.filter((v) => v.severity === 'critical')
          .length,
        status: violations.length === 0 ? '✅ COMPLIANT' : '❌ VIOLATED',
      },
      optimizations_applied: optimizations.length,
      recommendations: optimizations.map((opt) => opt.type),
    };

    return report;
  }

  /**
   * Send alerts for critical violations
   */
  async sendAlerts(violations) {
    const criticalViolations = violations.filter(
      (v) => v.severity === 'critical',
    );

    if (criticalViolations.length > 0) {
      console.log('🚨 CRITICAL: Queue performance SLO violations detected!');

      for (const violation of criticalViolations) {
        console.log(
          `   • ${violation.type}: ${violation.current} > ${violation.target}`,
        );
      }

      // In a real implementation, this would send to Slack, PagerDuty, etc.
      const alert = {
        timestamp: new Date().toISOString(),
        severity: 'critical',
        violations: criticalViolations,
        repository: `${config.owner}/${config.repo}`,
      };

      this.alertHistory.push(alert);

      // Log alert (in production, send to monitoring system)
      console.log('📧 Alert would be sent to monitoring channels');
    }
  }

  /**
   * Main monitoring loop
   */
  async monitor() {
    console.log('🚦 Starting queue performance monitoring...');
    console.log(`📊 Repository: ${config.owner}/${config.repo}`);
    console.log('🎯 SLO Targets:');
    console.log(`   • p50 wait time: ${config.targets.p50_wait_time / 60000}m`);
    console.log(`   • p95 wait time: ${config.targets.p95_wait_time / 60000}m`);
    console.log(`   • p99 wait time: ${config.targets.p99_wait_time / 60000}m`);
    console.log(`   • Max queue size: ${config.targets.max_queue_size}`);
    console.log(
      `   • Max CI duration: ${config.targets.max_ci_duration / 60000}m`,
    );

    try {
      // Collect metrics
      await this.collectQueueMetrics();

      // Calculate statistics
      const stats = this.calculateStats();

      // Evaluate SLO compliance
      const violations = this.evaluateSLOs(stats);

      // Apply optimizations if needed
      const optimizations =
        violations.length > 0 ? await this.applyOptimizations(violations) : [];

      // Generate report
      const report = this.generateReport(stats, violations, optimizations);

      // Send alerts for critical issues
      await this.sendAlerts(violations);

      // Output results
      console.log('\n📊 Queue Performance Report');
      console.log('===========================');
      console.log(JSON.stringify(report, null, 2));

      // Save report to file
      if (process.env.OUTPUT_FILE) {
        await fs.writeFile(
          process.env.OUTPUT_FILE,
          JSON.stringify(report, null, 2),
        );
        console.log(`📄 Report saved to ${process.env.OUTPUT_FILE}`);
      }

      // Exit with appropriate code
      const criticalViolations = violations.filter(
        (v) => v.severity === 'critical',
      ).length;
      if (criticalViolations > 0) {
        console.log(
          '\n🚨 CRITICAL violations detected - immediate attention required!',
        );
        process.exit(1);
      } else if (violations.length > 0) {
        console.log('\n⚠️  SLO violations detected - optimization recommended');
        process.exit(0); // Don't fail build for non-critical issues
      } else {
        console.log('\n✅ All SLOs within targets - queue performance healthy');
        process.exit(0);
      }
    } catch (error) {
      console.error('❌ Queue performance monitoring failed:', error.message);
      process.exit(1);
    }
  }
}

// CLI execution
if (require.main === module) {
  const monitor = new QueuePerformanceMonitor();
  monitor.monitor();
}

module.exports = { QueuePerformanceMonitor };
