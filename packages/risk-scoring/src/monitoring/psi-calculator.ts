/**
 * Population Stability Index (PSI) Calculator
 */

import type { PSI } from '../types/index.js';

export class PSICalculator {
  /**
   * Calculate PSI between baseline and current distributions
   */
  calculatePSI(
    baseline: number[],
    current: number[],
    bins: number = 10
  ): PSI {
    const baselineDist = this.createDistribution(baseline, bins);
    const currentDist = this.createDistribution(current, bins);

    let psi = 0;

    for (let i = 0; i < bins; i++) {
      const baselinePct = baselineDist[i];
      const currentPct = currentDist[i];

      if (baselinePct > 0 && currentPct > 0) {
        psi += (currentPct - baselinePct) * Math.log(currentPct / baselinePct);
      }
    }

    return {
      variable: 'score',
      psi,
      status: this.getPSIStatus(psi),
    };
  }

  /**
   * Create distribution with equal-width bins
   */
  private createDistribution(data: number[], bins: number): number[] {
    const min = Math.min(...data);
    const max = Math.max(...data);
    const binWidth = (max - min) / bins;

    const counts = new Array(bins).fill(0);

    for (const value of data) {
      const binIndex = Math.min(
        bins - 1,
        Math.floor((value - min) / binWidth)
      );
      counts[binIndex]++;
    }

    // Convert to percentages
    return counts.map(c => (c / data.length) + 1e-10); // Add small value to avoid log(0)
  }

  /**
   * Get PSI status
   */
  private getPSIStatus(psi: number): 'stable' | 'warning' | 'unstable' {
    if (psi < 0.1) return 'stable';
    if (psi < 0.25) return 'warning';
    return 'unstable';
  }
}
