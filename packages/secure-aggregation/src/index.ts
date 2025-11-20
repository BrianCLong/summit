/**
 * Secure Aggregation Package
 * Byzantine-robust aggregation protocols
 */

export interface ByzantineRobustConfig {
  strategy: 'krum' | 'median' | 'trimmed_mean' | 'bulyan';
  faultyRatio: number;
}

export class ByzantineRobustAggregator {
  /**
   * Krum aggregation - select closest update to majority
   */
  krum(updates: number[][], k: number): number[] {
    const n = updates.length;
    const scores: number[] = [];

    for (let i = 0; i < n; i++) {
      const distances = updates
        .map((u, j) => (i === j ? Infinity : this.euclideanDistance(updates[i], u)))
        .sort((a, b) => a - b)
        .slice(0, n - k - 2);

      scores[i] = distances.reduce((sum, d) => sum + d, 0);
    }

    const selectedIdx = scores.indexOf(Math.min(...scores));
    return updates[selectedIdx];
  }

  /**
   * Coordinate-wise median aggregation
   */
  median(updates: number[][]): number[] {
    const dims = updates[0].length;
    const result: number[] = [];

    for (let i = 0; i < dims; i++) {
      const values = updates.map((u) => u[i]).sort((a, b) => a - b);
      result[i] = values[Math.floor(values.length / 2)];
    }

    return result;
  }

  /**
   * Trimmed mean aggregation
   */
  trimmedMean(updates: number[][], trimRatio: number): number[] {
    const dims = updates[0].length;
    const result: number[] = [];
    const trimCount = Math.floor(updates.length * trimRatio);

    for (let i = 0; i < dims; i++) {
      const values = updates.map((u) => u[i]).sort((a, b) => a - b);
      const trimmed = values.slice(trimCount, values.length - trimCount);
      result[i] = trimmed.reduce((sum, v) => sum + v, 0) / trimmed.length;
    }

    return result;
  }

  private euclideanDistance(a: number[], b: number[]): number {
    return Math.sqrt(a.reduce((sum, val, i) => sum + Math.pow(val - b[i], 2), 0));
  }
}

export * from './protocols/SecureSum.js';
