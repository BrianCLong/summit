import * as fs from 'node:fs/promises';
import type { BenchmarkResult, BaselineComparison } from '../types.js';

/**
 * Baseline comparator for regression detection
 */
export class BaselineComparator {
  private baselineResults: Map<string, BenchmarkResult> = new Map();
  private regressionThreshold: number;

  constructor(regressionThreshold: number = 10) {
    this.regressionThreshold = regressionThreshold;
  }

  /**
   * Load baseline from file
   */
  async loadBaseline(filePath: string): Promise<void> {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      const data = JSON.parse(content);
      const results: BenchmarkResult[] = data.results || data;

      for (const result of results) {
        this.baselineResults.set(result.config.name, result);
      }
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        throw error;
      }
      // No baseline file, that's okay
    }
  }

  /**
   * Save current results as new baseline
   */
  async saveBaseline(filePath: string, results: BenchmarkResult[]): Promise<void> {
    const data = {
      timestamp: new Date().toISOString(),
      results,
    };
    await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
  }

  /**
   * Compare current result against baseline
   */
  compare(current: BenchmarkResult): BaselineComparison | null {
    const baseline = this.baselineResults.get(current.config.name);
    if (!baseline) {
      return null;
    }

    const meanDelta = current.stats.mean - baseline.stats.mean;
    const meanDeltaPercent = (meanDelta / baseline.stats.mean) * 100;
    const p99Delta = current.stats.percentiles.p99 - baseline.stats.percentiles.p99;
    const opsPerSecondDelta = current.stats.opsPerSecond - baseline.stats.opsPerSecond;

    const isRegression = meanDeltaPercent > this.regressionThreshold;
    let severity: BaselineComparison['severity'];

    if (isRegression) {
      if (meanDeltaPercent > 50) {
        severity = 'severe';
      } else if (meanDeltaPercent > 25) {
        severity = 'moderate';
      } else {
        severity = 'minor';
      }
    }

    return {
      current,
      baseline,
      meanDelta,
      meanDeltaPercent,
      p99Delta,
      opsPerSecondDelta,
      isRegression,
      severity,
    };
  }

  /**
   * Compare all results and return regressions
   */
  compareAll(results: BenchmarkResult[]): BaselineComparison[] {
    const comparisons: BaselineComparison[] = [];

    for (const result of results) {
      const comparison = this.compare(result);
      if (comparison) {
        comparisons.push(comparison);
      }
    }

    return comparisons;
  }

  /**
   * Get regressions only
   */
  getRegressions(results: BenchmarkResult[]): BaselineComparison[] {
    return this.compareAll(results).filter((c) => c.isRegression);
  }

  /**
   * Check if any benchmark has regressed
   */
  hasRegressions(results: BenchmarkResult[]): boolean {
    return this.getRegressions(results).length > 0;
  }

  /**
   * Format comparison as markdown
   */
  formatComparison(comparison: BaselineComparison): string {
    const { current, baseline, meanDeltaPercent, isRegression, severity } = comparison;
    const icon = isRegression ? '🔴' : meanDeltaPercent < -5 ? '🟢' : '⚪';
    const sign = meanDeltaPercent > 0 ? '+' : '';

    let lines = [
      `### ${icon} ${current.config.name}`,
      '',
      '| Metric | Baseline | Current | Delta |',
      '|--------|----------|---------|-------|',
      `| Mean | ${baseline.stats.mean.toFixed(2)} ns | ${current.stats.mean.toFixed(2)} ns | ${sign}${meanDeltaPercent.toFixed(2)}% |`,
      `| p99 | ${baseline.stats.percentiles.p99.toFixed(2)} ns | ${current.stats.percentiles.p99.toFixed(2)} ns | ${sign}${((comparison.p99Delta / baseline.stats.percentiles.p99) * 100).toFixed(2)}% |`,
      `| Ops/sec | ${baseline.stats.opsPerSecond.toFixed(2)} | ${current.stats.opsPerSecond.toFixed(2)} | ${((comparison.opsPerSecondDelta / baseline.stats.opsPerSecond) * 100).toFixed(2)}% |`,
    ];

    if (isRegression) {
      lines.push('');
      lines.push(`**⚠️ Regression detected (${severity})**`);
    }

    return lines.join('\n');
  }
}
