export interface EntropySignal {
  assetId: string;
  score: number;
  isAnomaly: boolean;
  metadata: Record<string, any>;
}

export class EntropyAnalyzer {
  /**
   * Calculates Shannon entropy for a set of observations.
   * High entropy suggests high variance/automation; low entropy suggests coordination.
   */
  public static calculate(observations: string[]): number {
    if (observations.length === 0) return 0;

    const counts = new Map<string, number>();
    observations.forEach(obs => {
      counts.set(obs, (counts.get(obs) || 0) + 1);
    });

    let entropy = 0;
    const total = observations.length;
    counts.forEach(count => {
      const p = count / total;
      entropy -= p * Math.log2(p);
    });

    return entropy;
  }

  /**
   * Detects coordination signals based on entropy thresholds.
   */
  public static detectCoordination(entropy: number, threshold: number = 0.5): boolean {
    // Low entropy means high similarity/repetition, a signal for coordination.
    return entropy < threshold;
  }
}
