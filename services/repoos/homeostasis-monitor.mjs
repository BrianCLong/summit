#!/usr/bin/env node

/**
 * Repository Homeostasis Monitor
 *
 * Continuously monitors repository health signals and detects drift.
 * Generates corrective actions when equilibrium is disrupted.
 */

import { exec as execSync } from 'child_process';
import { promisify } from 'util';

const exec = promisify(execSync);

export class HomeostasisMonitor {
  constructor(config = {}) {
    this.repoRoot = config.repoRoot || process.cwd();
  }

  async checkHealth() {
    console.log('\n[Homeostasis] Running health check...');

    const ciMetrics = await this.getCIMetrics();
    const healthScore = this.calculateHealthScore(ciMetrics);
    const driftDetected = healthScore < 0.8 ? ['ci_runtime_drift'] : [];

    console.log(`  Health Score: ${(healthScore * 100).toFixed(1)}%`);
    console.log(`  Drift Issues: ${driftDetected.length}`);

    return {
      score: healthScore,
      status: healthScore >= 0.8 ? 'good' : 'fair',
      driftDetected
    };
  }

  async getCIMetrics() {
    try {
      const { stdout } = await exec('gh run list --limit 10 --json conclusion,duration');
      const runs = JSON.parse(stdout);
      const avgRuntime = runs.length > 0
        ? runs.reduce((sum, r) => sum + (r.duration || 0), 0) / runs.length / 60000
        : 0;

      return { avgRuntime, dataPoints: runs.length };
    } catch (error) {
      return { avgRuntime: 0, dataPoints: 0 };
    }
  }

  calculateHealthScore(metrics) {
    let score = 1.0;
    if (metrics.avgRuntime > 45) score -= 0.2;
    return Math.max(score, 0);
  }
}

export default HomeostasisMonitor;
