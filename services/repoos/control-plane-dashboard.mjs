#!/usr/bin/env node

/**
 * RepoOS Control Plane Dashboard
 *
 * Single operational console for autonomous repository evolution.
 * Provides systems view of:
 * - System health
 * - Frontier map
 * - Patch market
 * - Merge flow
 * - Evolution intelligence
 *
 * Treats the repository as a living engineering system.
 */

import { FrontierEntropyMonitor } from './frontier-entropy.mjs';
import { FrontierLockManager } from './frontier-lock.mjs';
import { PatchWindowManager } from './patch-window-manager.mjs';
import { exec as execSync } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execSync);

/**
 * RepoOS Control Plane
 */
export class ControlPlaneDashboard {
  constructor(config = {}) {
    this.repoRoot = config.repoRoot || process.cwd();
    this.entropyMonitor = new FrontierEntropyMonitor(config);
    this.lockManager = new FrontierLockManager(config);
    this.windowManager = new PatchWindowManager(config);
  }

  /**
   * Initialize dashboard
   */
  async initialize() {
    await this.entropyMonitor.initialize?.();
    await this.lockManager.initialize();
    await this.windowManager.initialize();
  }

  /**
   * Generate complete dashboard
   * @returns {Object} Dashboard data
   */
  async generateDashboard() {
    const [
      entropyReport,
      lockStats,
      windowStats,
      gitStats,
      prStats
    ] = await Promise.all([
      this.entropyMonitor.generateReport(),
      this.lockManager.getStatistics(),
      this.windowManager.getStatistics(),
      this.getGitStats(),
      this.getPRStats()
    ]);

    return {
      timestamp: new Date().toISOString(),
      systemHealth: this.calculateSystemHealth(entropyReport, lockStats, windowStats),
      entropy: entropyReport,
      locks: lockStats,
      windows: windowStats,
      git: gitStats,
      prs: prStats
    };
  }

  /**
   * Calculate overall system health
   */
  calculateSystemHealth(entropy, locks, windows) {
    const health = {
      status: 'healthy',
      score: 1.0,
      issues: []
    };

    // Check entropy
    if (entropy.summary.avgEntropy > 0.7) {
      health.status = 'critical';
      health.score *= 0.5;
      health.issues.push('High average entropy');
    } else if (entropy.summary.avgEntropy > 0.5) {
      health.status = 'warning';
      health.score *= 0.8;
      health.issues.push('Elevated entropy');
    }

    // Check entropy velocity
    if (entropy.velocity?.assessment.severity === 'high') {
      health.status = 'critical';
      health.score *= 0.6;
      health.issues.push('Critical entropy velocity');
    } else if (entropy.velocity?.isAccelerating) {
      health.status = 'warning';
      health.score *= 0.9;
      health.issues.push('Entropy acceleration detected');
    }

    // Check stale locks
    if (locks.stale > 0) {
      health.status = health.status === 'healthy' ? 'warning' : health.status;
      health.score *= 0.95;
      health.issues.push(`${locks.stale} stale locks`);
    }

    return health;
  }

  /**
   * Get git repository statistics
   */
  async getGitStats() {
    try {
      // Get current branch
      const { stdout: branch } = await exec('git rev-parse --abbrev-ref HEAD');

      // Get commit count
      const { stdout: commitCount } = await exec('git rev-list --count HEAD');

      // Get recent commit activity
      const { stdout: recentCommits } = await exec('git log --oneline --since="24 hours ago" | wc -l');

      return {
        branch: branch.trim(),
        totalCommits: parseInt(commitCount.trim()),
        commitsLast24h: parseInt(recentCommits.trim())
      };
    } catch (error) {
      return {
        branch: 'unknown',
        totalCommits: 0,
        commitsLast24h: 0
      };
    }
  }

  /**
   * Get PR statistics
   */
  async getPRStats() {
    try {
      // Get open PRs count
      const { stdout: openPRs } = await exec('gh pr list --state open --json number | jq length');

      // Get merged PRs last 24h
      const { stdout: mergedPRs } = await exec('gh pr list --state merged --json mergedAt --jq "map(select(.mergedAt | fromdateiso8601 > (now - 86400))) | length"');

      return {
        open: parseInt(openPRs.trim()),
        mergedLast24h: parseInt(mergedPRs.trim())
      };
    } catch (error) {
      return {
        open: 0,
        mergedLast24h: 0
      };
    }
  }

  /**
   * Render dashboard to console
   */
  renderDashboard(dashboard) {
    console.clear();

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║              RepoOS Control Plane Dashboard                  ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`Timestamp: ${dashboard.timestamp}\n`);

    // System Health Panel
    this.renderSystemHealth(dashboard.systemHealth);

    // Entropy Panel
    this.renderEntropyPanel(dashboard.entropy);

    // Frontier Locks Panel
    this.renderLocksPanel(dashboard.locks);

    // Patch Windows Panel
    this.renderWindowsPanel(dashboard.windows);

    // Merge Flow Panel
    this.renderMergeFlow(dashboard.prs, dashboard.git);

    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Render system health panel
   */
  renderSystemHealth(health) {
    const statusIcon = {
      'healthy': '🟢',
      'warning': '🟡',
      'critical': '🔴'
    }[health.status] || '⚪';

    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    System Health                             ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ Status:  ${statusIcon} ${health.status.toUpperCase().padEnd(48)} ║`);
    console.log(`║ Score:   ${(health.score * 100).toFixed(1)}%                                            ║`);
    if (health.issues.length > 0) {
      console.log(`║ Issues:  ${health.issues.length.toString().padEnd(49)} ║`);
      for (const issue of health.issues.slice(0, 3)) {
        console.log(`║   - ${issue.padEnd(55)} ║`);
      }
    }
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Render entropy panel
   */
  renderEntropyPanel(entropy) {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                 Frontier Entropy Analysis                    ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ Average Entropy:    ${entropy.summary.avgEntropy.toFixed(3).padEnd(39)} ║`);
    console.log(`║ Maximum Entropy:    ${entropy.summary.maxEntropy.toFixed(3).padEnd(39)} ║`);
    console.log(`║ Total Frontiers:    ${entropy.summary.totalFrontiers.toString().padEnd(39)} ║`);

    if (entropy.velocity) {
      const v = entropy.velocity;
      console.log(`║ Entropy Velocity:   ${v.current.toFixed(6)}/s ${v.assessment.color.padEnd(24)} ║`);
      console.log(`║ Accelerating:       ${(v.isAccelerating ? 'YES ⚠️' : 'No').padEnd(39)} ║`);
    }

    console.log('║                                                               ║');
    console.log(`║ 🟢 Healthy:   ${entropy.summary.byLevel.healthy.toString().padEnd(44)} ║`);
    console.log(`║ 🟡 Warning:   ${entropy.summary.byLevel.warning.toString().padEnd(44)} ║`);
    console.log(`║ 🟠 Alert:     ${entropy.summary.byLevel.alert.toString().padEnd(44)} ║`);
    console.log(`║ 🔴 Critical:  ${entropy.summary.byLevel.critical.toString().padEnd(44)} ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Render locks panel
   */
  renderLocksPanel(locks) {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                   Frontier Locks                             ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ Total Locks:        ${locks.total.toString().padEnd(39)} ║`);
    console.log(`║ Stale Locks:        ${locks.stale.toString().padEnd(39)} ║`);
    console.log(`║ Avg Duration:       ${locks.avgDuration.toString()}s${' '.repeat(36 - locks.avgDuration.toString().length)} ║`);
    console.log('║                                                               ║');

    if (locks.byState && Object.keys(locks.byState).length > 0) {
      console.log('║ By State:                                                     ║');
      for (const [state, count] of Object.entries(locks.byState)) {
        console.log(`║   ${state}:${' '.repeat(18 - state.length)}${count.toString().padEnd(33)} ║`);
      }
    }

    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Render windows panel
   */
  renderWindowsPanel(windows) {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                  Patch Windows                               ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ Active Windows:     ${windows.activeWindows.toString().padEnd(39)} ║`);
    console.log(`║ Patches Buffered:   ${windows.patchesBuffered.toString().padEnd(39)} ║`);
    console.log(`║ Batches Emitted:    ${windows.batchesEmitted.toString().padEnd(39)} ║`);
    console.log(`║ Avg Batch Size:     ${windows.avgBatchSize.toString().padEnd(39)} ║`);
    console.log(`║ Patches in Windows: ${windows.patchesInWindows.toString().padEnd(39)} ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Render merge flow panel
   */
  renderMergeFlow(prs, git) {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║                    Merge Flow                                ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║ Branch:             ${git.branch.padEnd(39)} ║`);
    console.log(`║ Open PRs:           ${prs.open.toString().padEnd(39)} ║`);
    console.log(`║ Merged (24h):       ${prs.mergedLast24h.toString().padEnd(39)} ║`);
    console.log(`║ Commits (24h):      ${git.commitsLast24h.toString().padEnd(39)} ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');
  }

  /**
   * Start live monitoring
   */
  async startMonitoring(interval = 60000) {
    console.log(`🔍 Starting RepoOS Control Plane monitoring (refresh: ${interval / 1000}s)\n`);
    console.log('Press Ctrl+C to stop\n');

    const runUpdate = async () => {
      const dashboard = await this.generateDashboard();
      this.renderDashboard(dashboard);
    };

    // Initial render
    await runUpdate();

    // Schedule updates
    setInterval(runUpdate, interval);
  }
}

/**
 * CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const dashboard = new ControlPlaneDashboard();
  await dashboard.initialize();

  const command = process.argv[2];

  switch (command) {
    case 'show':
      const data = await dashboard.generateDashboard();
      dashboard.renderDashboard(data);
      break;

    case 'monitor':
      const interval = parseInt(process.argv[3]) || 60000; // Default 60s
      await dashboard.startMonitoring(interval);

      // Handle Ctrl+C
      process.on('SIGINT', () => {
        console.log('\n✅ Control Plane monitoring stopped');
        process.exit(0);
      });
      break;

    default:
      console.log('RepoOS Control Plane Dashboard\n');
      console.log('Single operational console for autonomous repository evolution.\n');
      console.log('Usage:');
      console.log('  node control-plane-dashboard.mjs show           - Show current state');
      console.log('  node control-plane-dashboard.mjs monitor [ms]   - Start live monitoring');
      console.log('\nPanels:');
      console.log('  - System Health (entropy, locks, windows)');
      console.log('  - Frontier Entropy Analysis');
      console.log('  - Frontier Locks Status');
      console.log('  - Patch Windows Activity');
      console.log('  - Merge Flow Metrics\n');
  }
}

export default ControlPlaneDashboard;
