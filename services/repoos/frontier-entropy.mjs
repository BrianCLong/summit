#!/usr/bin/env node

/**
 * Frontier Entropy Monitor
 *
 * Early warning system for frontier instability using Shannon entropy.
 *
 * Entropy = -Σ(pᵢ log₂ pᵢ) where pᵢ is proportion of patches from agent i
 *
 * Interpretation:
 * - 0.0-0.3: Healthy (few agents collaborating, low chaos)
 * - 0.3-0.5: Warning (moderate agent diversity, monitor)
 * - 0.5-0.7: Alert (high diversity, potential coordination issues)
 * - 0.7-1.0: Critical (too many agents, force convergence immediately)
 *
 * When entropy exceeds threshold, system should:
 * 1. Force frontier convergence
 * 2. Materialize PR to clear frontier
 * 3. Enable admission control
 * 4. Alert operators
 *
 * This prevents the "too many cooks" problem at massive scale.
 */

import fs from 'fs/promises';
import path from 'path';

/**
 * Entropy thresholds
 */
export const ENTROPY_THRESHOLDS = {
  healthy: 0.3,
  warning: 0.5,
  alert: 0.7,
  critical: 0.85
};

/**
 * Frontier Entropy Monitor
 */
export class FrontierEntropyMonitor {
  constructor(config = {}) {
    this.repoRoot = config.repoRoot || process.cwd();
    this.frontiersDir = config.frontiersDir || '.repoos/frontiers';
    this.thresholds = config.thresholds || ENTROPY_THRESHOLDS;
  }

  /**
   * Calculate Shannon entropy for a frontier
   *
   * H(X) = -Σ p(x) log₂ p(x)
   *
   * @param {Object} frontier - Frontier metadata
   * @returns {number} Entropy value (0-∞, typically 0-4 for realistic agent counts)
   */
  calculateEntropy(frontier) {
    if (!frontier.patches || frontier.patches.length === 0) {
      return 0.0;
    }

    // Count patches per author
    const authorCounts = new Map();
    for (const patch of frontier.patches) {
      const author = patch.author || 'unknown';
      authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
    }

    // Calculate entropy
    const total = frontier.patches.length;
    let entropy = 0;

    for (const count of authorCounts.values()) {
      if (count > 0) {
        const p = count / total;
        entropy -= p * Math.log2(p);
      }
    }

    return entropy;
  }

  /**
   * Calculate normalized entropy (0-1 scale)
   *
   * Normalized to max possible entropy for current agent count:
   * H_max = log₂(n) where n = number of unique agents
   *
   * @param {Object} frontier - Frontier metadata
   * @returns {number} Normalized entropy (0-1)
   */
  calculateNormalizedEntropy(frontier) {
    if (!frontier.patches || frontier.patches.length === 0) {
      return 0.0;
    }

    const entropy = this.calculateEntropy(frontier);

    // Count unique authors
    const uniqueAuthors = new Set(
      frontier.patches.map(p => p.author || 'unknown')
    ).size;

    if (uniqueAuthors <= 1) {
      return 0.0; // Single author = minimum entropy
    }

    // Max entropy occurs when all agents contribute equally
    const maxEntropy = Math.log2(uniqueAuthors);

    return entropy / maxEntropy;
  }

  /**
   * Assess frontier entropy level
   *
   * @param {number} entropy - Entropy value
   * @returns {Object} Assessment with level and recommendation
   */
  assessEntropyLevel(entropy) {
    if (entropy < this.thresholds.healthy) {
      return {
        level: 'healthy',
        severity: 'none',
        color: '🟢',
        recommendation: 'Normal operation, good agent coordination'
      };
    } else if (entropy < this.thresholds.warning) {
      return {
        level: 'warning',
        severity: 'low',
        color: '🟡',
        recommendation: 'Monitor frontier, moderate agent diversity'
      };
    } else if (entropy < this.thresholds.alert) {
      return {
        level: 'alert',
        severity: 'medium',
        color: '🟠',
        recommendation: 'High diversity detected, consider forcing convergence soon'
      };
    } else if (entropy < this.thresholds.critical) {
      return {
        level: 'critical',
        severity: 'high',
        color: '🔴',
        recommendation: 'Too many agents, force convergence immediately'
      };
    } else {
      return {
        level: 'emergency',
        severity: 'critical',
        color: '🚨',
        recommendation: 'EMERGENCY: Frontier chaos detected, freeze and force convergence NOW'
      };
    }
  }

  /**
   * Check if frontier should be force-converged
   *
   * @param {Object} frontier - Frontier metadata
   * @returns {boolean} True if convergence should be forced
   */
  shouldForceConvergence(frontier) {
    const entropy = this.calculateEntropy(frontier);
    return entropy >= this.thresholds.alert;
  }

  /**
   * Analyze all frontiers for entropy issues
   *
   * @returns {Array} List of frontier entropy reports
   */
  async analyzeAllFrontiers() {
    const frontiersPath = path.join(this.repoRoot, this.frontiersDir);
    const reports = [];

    try {
      const entries = await fs.readdir(frontiersPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const concernId = entry.name;
          const frontierFile = path.join(frontiersPath, concernId, 'frontier.json');

          try {
            const data = await fs.readFile(frontierFile, 'utf8');
            const frontier = JSON.parse(data);

            const entropy = this.calculateEntropy(frontier);
            const normalizedEntropy = this.calculateNormalizedEntropy(frontier);
            const assessment = this.assessEntropyLevel(entropy);

            // Count unique authors
            const uniqueAuthors = new Set(
              frontier.patches.map(p => p.author || 'unknown')
            );

            // Calculate author distribution
            const authorCounts = new Map();
            for (const patch of frontier.patches) {
              const author = patch.author || 'unknown';
              authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
            }

            const distribution = Array.from(authorCounts.entries())
              .sort((a, b) => b[1] - a[1])
              .map(([author, count]) => ({
                author,
                patches: count,
                percentage: ((count / frontier.patches.length) * 100).toFixed(1)
              }));

            reports.push({
              concernId,
              entropy,
              normalizedEntropy,
              assessment,
              uniqueAuthors: uniqueAuthors.size,
              totalPatches: frontier.patches.length,
              distribution,
              shouldForceConverge: this.shouldForceConvergence(frontier),
              frontierState: frontier.state,
              stabilityScore: frontier.stabilityScore
            });
          } catch (error) {
            // Skip invalid frontiers
          }
        }
      }
    } catch (error) {
      // Frontiers directory doesn't exist
    }

    return reports.sort((a, b) => b.entropy - a.entropy);
  }

  /**
   * Get frontiers requiring immediate attention
   *
   * @returns {Array} List of high-entropy frontiers
   */
  async getHighEntropyFrontiers() {
    const allReports = await this.analyzeAllFrontiers();
    return allReports.filter(r =>
      r.assessment.severity === 'high' || r.assessment.severity === 'critical'
    );
  }

  /**
   * Generate entropy report
   *
   * @returns {Object} System-wide entropy report
   */
  async generateReport() {
    const reports = await this.analyzeAllFrontiers();

    const summary = {
      totalFrontiers: reports.length,
      byLevel: {
        healthy: 0,
        warning: 0,
        alert: 0,
        critical: 0,
        emergency: 0
      },
      avgEntropy: 0,
      maxEntropy: 0,
      highEntropyFrontiers: [],
      recommendedActions: []
    };

    for (const report of reports) {
      summary.byLevel[report.assessment.level]++;
      summary.avgEntropy += report.entropy;
      summary.maxEntropy = Math.max(summary.maxEntropy, report.entropy);

      if (report.shouldForceConverge) {
        summary.highEntropyFrontiers.push(report.concernId);
        summary.recommendedActions.push({
          action: 'FORCE_CONVERGE',
          concernId: report.concernId,
          entropy: report.entropy,
          priority: report.assessment.severity === 'critical' ? 'immediate' : 'high'
        });
      }
    }

    summary.avgEntropy = reports.length > 0
      ? summary.avgEntropy / reports.length
      : 0;

    return {
      timestamp: new Date().toISOString(),
      summary,
      frontiers: reports
    };
  }

  /**
   * Log entropy report to console
   *
   * @param {Object} report - Entropy report
   */
  logReport(report) {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║         Frontier Entropy Analysis Report                     ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝\n');

    console.log(`Timestamp: ${report.timestamp}\n`);

    console.log('System Summary:');
    console.log(`  Total Frontiers: ${report.summary.totalFrontiers}`);
    console.log(`  Average Entropy: ${report.summary.avgEntropy.toFixed(3)}`);
    console.log(`  Maximum Entropy: ${report.summary.maxEntropy.toFixed(3)}\n`);

    console.log('By Entropy Level:');
    console.log(`  🟢 Healthy:   ${report.summary.byLevel.healthy}`);
    console.log(`  🟡 Warning:   ${report.summary.byLevel.warning}`);
    console.log(`  🟠 Alert:     ${report.summary.byLevel.alert}`);
    console.log(`  🔴 Critical:  ${report.summary.byLevel.critical}`);
    console.log(`  🚨 Emergency: ${report.summary.byLevel.emergency}\n`);

    if (report.summary.recommendedActions.length > 0) {
      console.log('⚠️  Recommended Actions:');
      for (const action of report.summary.recommendedActions) {
        console.log(`  ${action.priority === 'immediate' ? '🚨' : '⚠️'} ${action.action}: ${action.concernId} (entropy: ${action.entropy.toFixed(3)})`);
      }
      console.log('');
    }

    console.log('Frontier Details:\n');

    for (const frontier of report.frontiers.slice(0, 10)) {
      const { concernId, entropy, normalizedEntropy, assessment, uniqueAuthors, totalPatches } = frontier;

      console.log(`${assessment.color} ${concernId}`);
      console.log(`  Entropy: ${entropy.toFixed(3)} (normalized: ${(normalizedEntropy * 100).toFixed(1)}%)`);
      console.log(`  Level: ${assessment.level}`);
      console.log(`  Agents: ${uniqueAuthors} unique authors`);
      console.log(`  Patches: ${totalPatches}`);
      console.log(`  State: ${frontier.frontierState}`);

      if (frontier.distribution.length > 0) {
        console.log('  Top Contributors:');
        for (const { author, patches, percentage } of frontier.distribution.slice(0, 3)) {
          console.log(`    - ${author}: ${patches} patches (${percentage}%)`);
        }
      }

      console.log(`  Recommendation: ${assessment.recommendation}\n`);
    }

    if (report.frontiers.length > 10) {
      console.log(`... and ${report.frontiers.length - 10} more frontiers\n`);
    }
  }

  /**
   * Monitor entropy continuously
   *
   * @param {number} interval - Check interval in milliseconds
   */
  async startMonitoring(interval = 600000) { // Default: 10 minutes
    console.log(`🔍 Starting Frontier Entropy monitoring (interval: ${interval / 60000}min)\n`);

    const runCheck = async () => {
      const report = await this.generateReport();
      this.logReport(report);

      // Alert if critical frontiers detected
      if (report.summary.byLevel.critical > 0 || report.summary.byLevel.emergency > 0) {
        console.log('🚨 ALERT: Critical entropy detected in one or more frontiers!');
        console.log('🚨 Recommended action: Force convergence immediately\n');
      }
    };

    // Initial check
    await runCheck();

    // Schedule recurring checks
    setInterval(runCheck, interval);
  }
}

/**
 * CLI usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const monitor = new FrontierEntropyMonitor();

  const command = process.argv[2];

  if (command === 'analyze') {
    const report = await monitor.generateReport();
    monitor.logReport(report);
  } else if (command === 'high-entropy') {
    const highEntropy = await monitor.getHighEntropyFrontiers();
    console.log(`\n🔴 High Entropy Frontiers: ${highEntropy.length}\n`);
    for (const frontier of highEntropy) {
      console.log(`- ${frontier.concernId}: ${frontier.entropy.toFixed(3)} (${frontier.assessment.level})`);
    }
  } else if (command === 'monitor') {
    const interval = parseInt(process.argv[3]) || 600000; // Default 10 minutes
    await monitor.startMonitoring(interval);

    // Handle Ctrl+C
    process.on('SIGINT', () => {
      console.log('\n✅ Entropy monitoring stopped');
      process.exit(0);
    });
  } else {
    console.log('Frontier Entropy Monitor\n');
    console.log('Usage:');
    console.log('  node frontier-entropy.mjs analyze          - Analyze all frontiers');
    console.log('  node frontier-entropy.mjs high-entropy     - Show high-entropy frontiers');
    console.log('  node frontier-entropy.mjs monitor [ms]     - Start continuous monitoring');
    console.log('\nEntropy Thresholds:');
    console.log(`  🟢 Healthy:   < ${ENTROPY_THRESHOLDS.healthy}`);
    console.log(`  🟡 Warning:   ${ENTROPY_THRESHOLDS.healthy} - ${ENTROPY_THRESHOLDS.warning}`);
    console.log(`  🟠 Alert:     ${ENTROPY_THRESHOLDS.warning} - ${ENTROPY_THRESHOLDS.alert}`);
    console.log(`  🔴 Critical:  ${ENTROPY_THRESHOLDS.alert} - ${ENTROPY_THRESHOLDS.critical}`);
    console.log(`  🚨 Emergency: > ${ENTROPY_THRESHOLDS.critical}`);
  }
}

export default FrontierEntropyMonitor;
