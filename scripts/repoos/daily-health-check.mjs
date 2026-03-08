#!/usr/bin/env node

/**
 * Daily Health Check
 *
 * Automated health monitoring for RepoOS Evolution Intelligence System.
 * Runs daily to collect system health metrics, detect issues, and generate reports.
 *
 * Usage:
 *   node daily-health-check.mjs [--alert] [--output-dir <dir>]
 *
 * Options:
 *   --alert         Send alerts if thresholds exceeded
 *   --output-dir    Directory for reports (default: .repoos/reports)
 *
 * Cron Example:
 *   0 0 * * * cd /path/to/summit && node scripts/repoos/daily-health-check.mjs --alert
 */

import fs from 'fs/promises';
import path from 'path';
import { FrontierEntropyMonitor } from '../../services/repoos/frontier-entropy.mjs';
import { FrontierLockManager } from '../../services/repoos/frontier-lock.mjs';
import { PatchWindowManager } from '../../services/repoos/patch-window-manager.mjs';

/**
 * Daily Health Checker
 */
export class DailyHealthChecker {
  constructor(config = {}) {
    this.repoRoot = config.repoRoot || process.cwd();
    this.outputDir = config.outputDir || path.join(this.repoRoot, '.repoos/reports');
    this.alertMode = config.alertMode || false;

    // Initialize components
    this.entropyMonitor = new FrontierEntropyMonitor(config);
    this.lockManager = new FrontierLockManager(config);
    this.windowManager = new PatchWindowManager(config);

    // Health thresholds
    this.thresholds = {
      critical: {
        entropyAvg: 0.7,
        entropyVelocity: 0.01,
        staleLocks: 5,
        healthScore: 70
      },
      warning: {
        entropyAvg: 0.5,
        entropyVelocity: 0.005,
        staleLocks: 2,
        healthScore: 85
      }
    };
  }

  /**
   * Run complete health check
   */
  async runHealthCheck() {
    console.log('🔍 Running daily health check...\n');

    const timestamp = new Date().toISOString();
    const date = timestamp.split('T')[0];

    // Initialize all monitors
    await this.entropyMonitor.initialize?.();
    await this.lockManager.initialize();
    await this.windowManager.initialize();

    // Collect metrics
    const [
      entropyReport,
      lockStats,
      windowStats
    ] = await Promise.all([
      this.entropyMonitor.generateReport(),
      this.lockManager.getStatistics(),
      this.windowManager.getStatistics()
    ]);

    // Calculate system health
    const systemHealth = this.calculateSystemHealth(entropyReport, lockStats, windowStats);

    // Generate health report
    const healthReport = {
      timestamp,
      date,
      systemHealth,
      entropy: {
        average: entropyReport.summary.avgEntropy,
        maximum: entropyReport.summary.maxEntropy,
        totalFrontiers: entropyReport.summary.totalFrontiers,
        byLevel: entropyReport.summary.byLevel,
        velocity: entropyReport.velocity ? {
          current: entropyReport.velocity.current,
          average: entropyReport.velocity.average,
          isAccelerating: entropyReport.velocity.isAccelerating,
          assessment: entropyReport.velocity.assessment
        } : null
      },
      locks: {
        total: lockStats.total,
        stale: lockStats.stale,
        avgDuration: lockStats.avgDuration,
        byState: lockStats.byState
      },
      windows: {
        active: windowStats.activeWindows,
        patchesBuffered: windowStats.patchesBuffered,
        batchesEmitted: windowStats.batchesEmitted,
        avgBatchSize: windowStats.avgBatchSize
      },
      issues: this.detectIssues(systemHealth, entropyReport, lockStats, windowStats),
      recommendations: this.generateRecommendations(systemHealth, entropyReport, lockStats, windowStats)
    };

    // Save report
    await this.saveReport(healthReport);

    // Check for alerts
    if (this.alertMode) {
      await this.checkAlerts(healthReport);
    }

    // Print summary
    this.printSummary(healthReport);

    return healthReport;
  }

  /**
   * Calculate system health score and status
   */
  calculateSystemHealth(entropy, locks, windows) {
    let score = 100;
    let status = 'healthy';
    const factors = [];

    // Entropy impact
    const avgEntropy = entropy.summary.avgEntropy;
    if (avgEntropy > this.thresholds.critical.entropyAvg) {
      score -= 30;
      status = 'critical';
      factors.push({ factor: 'High average entropy', impact: -30, severity: 'critical' });
    } else if (avgEntropy > this.thresholds.warning.entropyAvg) {
      score -= 15;
      if (status === 'healthy') status = 'warning';
      factors.push({ factor: 'Elevated entropy', impact: -15, severity: 'warning' });
    }

    // Entropy velocity impact
    if (entropy.velocity) {
      const velocity = entropy.velocity.current;
      if (velocity > this.thresholds.critical.entropyVelocity) {
        score -= 25;
        status = 'critical';
        factors.push({ factor: 'Critical entropy velocity', impact: -25, severity: 'critical' });
      } else if (velocity > this.thresholds.warning.entropyVelocity) {
        score -= 10;
        if (status === 'healthy') status = 'warning';
        factors.push({ factor: 'Elevated velocity', impact: -10, severity: 'warning' });
      }

      if (entropy.velocity.isAccelerating) {
        score -= 10;
        if (status === 'healthy') status = 'warning';
        factors.push({ factor: 'Entropy acceleration', impact: -10, severity: 'warning' });
      }
    }

    // Stale locks impact
    if (locks.stale > this.thresholds.critical.staleLocks) {
      score -= 20;
      status = 'critical';
      factors.push({ factor: `${locks.stale} stale locks`, impact: -20, severity: 'critical' });
    } else if (locks.stale > this.thresholds.warning.staleLocks) {
      score -= 5;
      if (status === 'healthy') status = 'warning';
      factors.push({ factor: `${locks.stale} stale locks`, impact: -5, severity: 'warning' });
    }

    // Windows impact
    if (windows.patchesBuffered > 100) {
      score -= 15;
      if (status === 'healthy') status = 'warning';
      factors.push({ factor: 'High patch backlog', impact: -15, severity: 'warning' });
    }

    return {
      score: Math.max(0, score),
      status,
      factors
    };
  }

  /**
   * Detect specific issues
   */
  detectIssues(systemHealth, entropy, locks, windows) {
    const issues = [];

    // Critical issues
    if (systemHealth.status === 'critical') {
      issues.push({
        severity: 'critical',
        category: 'system-health',
        message: `System health critical: ${systemHealth.score}%`,
        details: systemHealth.factors.filter(f => f.severity === 'critical')
      });
    }

    // Entropy issues
    if (entropy.velocity && entropy.velocity.isAccelerating) {
      issues.push({
        severity: 'critical',
        category: 'entropy',
        message: 'Entropy acceleration detected',
        details: {
          currentVelocity: entropy.velocity.current,
          assessment: entropy.velocity.assessment,
          predictedInstability: '2-4 weeks'
        }
      });
    }

    // Lock issues
    if (locks.stale > 0) {
      issues.push({
        severity: locks.stale > this.thresholds.critical.staleLocks ? 'critical' : 'warning',
        category: 'locks',
        message: `${locks.stale} stale lock(s) detected`,
        details: { staleLocks: locks.stale, avgDuration: locks.avgDuration }
      });
    }

    // Window issues
    if (windows.patchesBuffered > 100) {
      issues.push({
        severity: 'warning',
        category: 'windows',
        message: 'High patch backlog',
        details: { buffered: windows.patchesBuffered, active: windows.active }
      });
    }

    return issues;
  }

  /**
   * Generate recommendations
   */
  generateRecommendations(systemHealth, entropy, locks, windows) {
    const recommendations = [];

    // System health recommendations
    if (systemHealth.score < this.thresholds.critical.healthScore) {
      recommendations.push({
        priority: 'critical',
        action: 'IMMEDIATE_REVIEW',
        description: 'System health critical - immediate investigation required',
        steps: [
          'Review control plane dashboard',
          'Check entropy velocity trends',
          'Identify root cause of degradation',
          'Consider manual intervention'
        ]
      });
    }

    // Entropy recommendations
    if (entropy.velocity && entropy.velocity.current > this.thresholds.critical.entropyVelocity) {
      recommendations.push({
        priority: 'critical',
        action: 'REDUCE_INGESTION',
        description: 'Critical entropy velocity - reduce patch ingestion rate',
        steps: [
          'Temporarily slow PR merges',
          'Increase patch window durations',
          'Force frontier convergence',
          'Monitor entropy trends'
        ]
      });
    }

    if (entropy.velocity && entropy.velocity.isAccelerating) {
      recommendations.push({
        priority: 'high',
        action: 'MONITOR_CLOSELY',
        description: 'Entropy acceleration detected - instability predicted in 2-4 weeks',
        steps: [
          'Enable live monitoring mode',
          'Review high-entropy frontiers',
          'Plan intervention strategy',
          'Prepare for convergence triggers'
        ]
      });
    }

    // Lock recommendations
    if (locks.stale > this.thresholds.warning.staleLocks) {
      recommendations.push({
        priority: locks.stale > this.thresholds.critical.staleLocks ? 'critical' : 'high',
        action: 'CLEANUP_LOCKS',
        description: 'Stale locks detected - run cleanup',
        steps: [
          'Run: node services/repoos/frontier-lock.mjs cleanup',
          'Verify locks released',
          'Check CI logs for failure cause',
          'Monitor for recurrence'
        ]
      });
    }

    // Window recommendations
    if (windows.avgBatchSize < 2) {
      recommendations.push({
        priority: 'low',
        action: 'INCREASE_WINDOWS',
        description: 'Low batch size - consider increasing window durations',
        steps: [
          'Review window configuration',
          'Increase durations by 20-30%',
          'Monitor batch size improvement',
          'Adjust based on data'
        ]
      });
    }

    if (windows.avgBatchSize > 15) {
      recommendations.push({
        priority: 'low',
        action: 'DECREASE_WINDOWS',
        description: 'High batch size - consider decreasing window durations',
        steps: [
          'Review window configuration',
          'Decrease durations by 20-30%',
          'Monitor conflict rate',
          'Adjust based on data'
        ]
      });
    }

    return recommendations;
  }

  /**
   * Save health report to filesystem
   */
  async saveReport(healthReport) {
    await fs.mkdir(this.outputDir, { recursive: true });

    const date = healthReport.date;
    const reportPath = path.join(this.outputDir, `daily-health-${date}.json`);

    await fs.writeFile(reportPath, JSON.stringify(healthReport, null, 2));
    console.log(`📝 Report saved: ${reportPath}\n`);

    // Also save as latest
    const latestPath = path.join(this.outputDir, 'daily-health-latest.json');
    await fs.writeFile(latestPath, JSON.stringify(healthReport, null, 2));
  }

  /**
   * Check for alert conditions
   */
  async checkAlerts(healthReport) {
    const criticalIssues = healthReport.issues.filter(i => i.severity === 'critical');
    const warningIssues = healthReport.issues.filter(i => i.severity === 'warning');

    if (criticalIssues.length > 0) {
      await this.sendAlert('critical', healthReport, criticalIssues);
    }

    if (warningIssues.length > 0) {
      await this.sendAlert('warning', healthReport, warningIssues);
    }
  }

  /**
   * Send alert (placeholder - integrate with alerting system)
   */
  async sendAlert(severity, healthReport, issues) {
    console.log(`\n⚠️  ALERT [${severity.toUpperCase()}]`);
    console.log(`System Health: ${healthReport.systemHealth.score}% (${healthReport.systemHealth.status})`);
    console.log(`\nIssues Detected:`);
    for (const issue of issues) {
      console.log(`  - [${issue.severity}] ${issue.message}`);
    }

    // TODO: Integrate with:
    // - Slack webhook
    // - PagerDuty API
    // - Email service
    // - Monitoring system

    const alertPath = path.join(this.outputDir, `alert-${healthReport.date}-${Date.now()}.json`);
    await fs.writeFile(alertPath, JSON.stringify({
      severity,
      timestamp: new Date().toISOString(),
      healthReport,
      issues
    }, null, 2));

    console.log(`\n📢 Alert saved: ${alertPath}\n`);
  }

  /**
   * Print summary to console
   */
  printSummary(healthReport) {
    const { systemHealth, entropy, locks, windows } = healthReport;

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║           Daily Health Check Summary                         ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    // System Health
    const healthIcon = {
      'healthy': '🟢',
      'warning': '🟡',
      'critical': '🔴'
    }[systemHealth.status] || '⚪';

    console.log(`${healthIcon} System Health: ${systemHealth.status.toUpperCase()} (${systemHealth.score}%)`);

    // Key Metrics
    console.log(`\n📊 Key Metrics:`);
    console.log(`  Average Entropy:    ${entropy.average.toFixed(3)}`);
    if (entropy.velocity) {
      console.log(`  Entropy Velocity:   ${entropy.velocity.current.toFixed(6)}/s (${entropy.velocity.assessment.severity})`);
      console.log(`  Accelerating:       ${entropy.velocity.isAccelerating ? 'YES ⚠️' : 'No'}`);
    }
    console.log(`  Stale Locks:        ${locks.stale}`);
    console.log(`  Patches Buffered:   ${windows.patchesBuffered}`);

    // Issues
    if (healthReport.issues.length > 0) {
      console.log(`\n⚠️  Issues Detected: ${healthReport.issues.length}`);
      for (const issue of healthReport.issues.slice(0, 3)) {
        const icon = issue.severity === 'critical' ? '🔴' : '🟡';
        console.log(`  ${icon} [${issue.severity}] ${issue.message}`);
      }
    } else {
      console.log(`\n✅ No Issues Detected`);
    }

    // Recommendations
    if (healthReport.recommendations.length > 0) {
      console.log(`\n💡 Recommendations: ${healthReport.recommendations.length}`);
      for (const rec of healthReport.recommendations.slice(0, 2)) {
        console.log(`  - [${rec.priority}] ${rec.action}: ${rec.description}`);
      }
    }

    console.log('\n');
  }
}

/**
 * CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const alertMode = args.includes('--alert');

  let outputDir = null;
  const outputDirIndex = args.indexOf('--output-dir');
  if (outputDirIndex !== -1 && args[outputDirIndex + 1]) {
    outputDir = args[outputDirIndex + 1];
  }

  const checker = new DailyHealthChecker({
    alertMode,
    outputDir
  });

  try {
    await checker.runHealthCheck();
  } catch (error) {
    console.error(`❌ Health check failed: ${error.message}`);
    console.error(error.stack);
    process.exit(1);
  }
}

export default DailyHealthChecker;
