/**
 * Drift Metric Model
 * Represents drift detection results
 */

import { DriftSeverity, FeatureDrift, FeatureStats } from './IntegrityReport.js';

export interface DriftMetricData {
  dataDrift: number;
  conceptDrift: number;
  predictionDrift: number;
  psi: number;
  ksStatistic: number;
  jsDivergence: number;
  affectedFeatures: FeatureDrift[];
}

export class DriftMetricCalculator {
  /**
   * Calculate Population Stability Index (PSI)
   */
  static calculatePSI(
    baseline: number[],
    current: number[],
    bins: number = 10
  ): number {
    const baselineHist = this.createHistogram(baseline, bins);
    const currentHist = this.createHistogram(current, bins);

    let psi = 0;
    for (let i = 0; i < bins; i++) {
      const baselinePct = baselineHist[i] / baseline.length;
      const currentPct = currentHist[i] / current.length;

      // Avoid log(0)
      const baselineAdj = Math.max(baselinePct, 0.0001);
      const currentAdj = Math.max(currentPct, 0.0001);

      psi += (currentAdj - baselineAdj) * Math.log(currentAdj / baselineAdj);
    }

    return psi;
  }

  /**
   * Calculate Kolmogorov-Smirnov statistic
   */
  static calculateKS(baseline: number[], current: number[]): number {
    const sortedBaseline = [...baseline].sort((a, b) => a - b);
    const sortedCurrent = [...current].sort((a, b) => a - b);

    let maxDiff = 0;
    let i = 0;
    let j = 0;

    while (i < sortedBaseline.length && j < sortedCurrent.length) {
      const baselineCdf = i / sortedBaseline.length;
      const currentCdf = j / sortedCurrent.length;
      const diff = Math.abs(baselineCdf - currentCdf);

      maxDiff = Math.max(maxDiff, diff);

      if (sortedBaseline[i] < sortedCurrent[j]) {
        i++;
      } else {
        j++;
      }
    }

    return maxDiff;
  }

  /**
   * Calculate Jensen-Shannon Divergence
   */
  static calculateJSDivergence(p: number[], q: number[]): number {
    const m = p.map((pi, i) => (pi + q[i]) / 2);

    const kldPM = this.klDivergence(p, m);
    const kldQM = this.klDivergence(q, m);

    return (kldPM + kldQM) / 2;
  }

  /**
   * KL Divergence helper
   */
  private static klDivergence(p: number[], q: number[]): number {
    let kld = 0;
    for (let i = 0; i < p.length; i++) {
      if (p[i] > 0 && q[i] > 0) {
        kld += p[i] * Math.log(p[i] / q[i]);
      }
    }
    return kld;
  }

  /**
   * Create histogram for distribution
   */
  private static createHistogram(data: number[], bins: number): number[] {
    if (data.length === 0) return new Array(bins).fill(0);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / bins;

    const histogram = new Array(bins).fill(0);

    for (const value of data) {
      const binIndex = Math.min(
        Math.floor((value - min) / binWidth),
        bins - 1
      );
      histogram[binIndex]++;
    }

    return histogram;
  }

  /**
   * Calculate feature statistics
   */
  static calculateFeatureStats(data: number[]): FeatureStats {
    if (data.length === 0) {
      return {
        mean: 0,
        median: 0,
        stdDev: 0,
        min: 0,
        max: 0,
        percentile25: 0,
        percentile75: 0,
        missingRate: 0,
        uniqueCount: 0,
      };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance =
      data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) /
      data.length;
    const stdDev = Math.sqrt(variance);

    return {
      mean,
      median: sorted[Math.floor(sorted.length / 2)],
      stdDev,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      percentile25: sorted[Math.floor(sorted.length * 0.25)],
      percentile75: sorted[Math.floor(sorted.length * 0.75)],
      missingRate: 0,
      uniqueCount: new Set(data).size,
      distribution: this.createHistogram(data, 20),
    };
  }

  /**
   * Determine drift severity based on PSI
   */
  static determineSeverity(psi: number): DriftSeverity {
    if (psi < 0.1) return DriftSeverity.NONE;
    if (psi < 0.15) return DriftSeverity.LOW;
    if (psi < 0.25) return DriftSeverity.MODERATE;
    if (psi < 0.35) return DriftSeverity.HIGH;
    return DriftSeverity.CRITICAL;
  }

  /**
   * Analyze drift trend
   */
  static analyzeTrend(recentPSI: number[]): string {
    if (recentPSI.length < 2) return 'stable';

    const recentAvg =
      recentPSI.slice(-3).reduce((sum, val) => sum + val, 0) /
      Math.min(3, recentPSI.length);
    const olderAvg =
      recentPSI.slice(0, -3).reduce((sum, val) => sum + val, 0) /
      Math.max(1, recentPSI.length - 3);

    const change = recentAvg - olderAvg;

    if (Math.abs(change) < 0.01) return 'stable';
    if (change > 0.05) return 'rapidly increasing';
    if (change > 0.02) return 'increasing';
    if (change < -0.05) return 'rapidly decreasing';
    if (change < -0.02) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate drift velocity (rate of change)
   */
  static calculateVelocity(recentPSI: number[]): number {
    if (recentPSI.length < 2) return 0;

    const diffs = [];
    for (let i = 1; i < recentPSI.length; i++) {
      diffs.push(recentPSI[i] - recentPSI[i - 1]);
    }

    return diffs.reduce((sum, val) => sum + val, 0) / diffs.length;
  }

  /**
   * Estimate impact of drift
   */
  static estimateImpact(psi: number, velocity: number): string {
    if (psi < 0.1 && velocity < 0.01) {
      return 'Minimal impact - model remains reliable';
    }

    if (psi < 0.25 && velocity < 0.02) {
      return 'Low impact - monitor for continued drift';
    }

    if (psi < 0.35 && velocity < 0.05) {
      return 'Moderate impact - consider model recalibration';
    }

    if (velocity > 0.05) {
      return 'High impact - immediate action required, rapid drift detected';
    }

    return 'Severe impact - model reliability compromised, retrain recommended';
  }

  /**
   * Detect concept drift using DDM (Drift Detection Method)
   */
  static detectConceptDrift(
    errors: number[],
    windowSize: number = 100
  ): {
    driftDetected: boolean;
    driftPoint: number | null;
    errorRate: number;
  } {
    if (errors.length < windowSize) {
      return { driftDetected: false, driftPoint: null, errorRate: 0 };
    }

    const recentErrors = errors.slice(-windowSize);
    const errorRate = recentErrors.filter((e) => e === 1).length / windowSize;

    // Simple threshold-based detection
    const baselineErrorRate = 0.1;
    const stdDev = Math.sqrt(
      errorRate * (1 - errorRate) / windowSize
    );

    const warningLevel = baselineErrorRate + 2 * stdDev;
    const driftLevel = baselineErrorRate + 3 * stdDev;

    return {
      driftDetected: errorRate > driftLevel,
      driftPoint: errorRate > warningLevel ? errors.length - windowSize : null,
      errorRate,
    };
  }
}
