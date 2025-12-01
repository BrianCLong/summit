export interface ActorSignal {
  actor: string;
  sightings?: number;
  confidence?: number;
  recencyDays?: number;
  severity?: number;
  capability?: number;
  influence?: number;
  exposure?: number;
}

export interface ActorAwarenessOptions {
  sampleCount?: number;
  recencyHalfLifeDays?: number;
  sightingSaturation?: number;
  noiseFloor?: number;
  uncertaintyAmplifier?: number;
  explorationWeight?: number;
  summaryLimit?: number;
}

export interface ActorAwarenessResult {
  actor: string;
  probability: number;
  meanScore: number;
  volatility: number;
  baseWeight: number;
  awarenessScore: number;
  confidence: number;
  dominanceCount: number;
}

/**
 * Performs Monte Carlo style sampling over threat actor signals to surface
 * which groups deserve analyst attention. The stochastic approach mixes
 * deterministic scoring with noise so that frequently sighted but lower
 * confidence actors still receive some exploration.
 */
export class StochasticActorAwareness {
  private readonly random: () => number;

  constructor(random: () => number = Math.random) {
    this.random = random;
  }

  runSimulation(
    signals: ActorSignal[],
    options: ActorAwarenessOptions = {},
  ): ActorAwarenessResult[] {
    if (!signals || signals.length === 0) {
      return [];
    }

    const sampleCount = Math.max(1, Math.min(options.sampleCount ?? 500, 10000));
    const halfLife = options.recencyHalfLifeDays ?? 14;
    const saturation = options.sightingSaturation ?? 5;
    const noiseFloor = options.noiseFloor ?? 0.05;
    const uncertaintyAmplifier = options.uncertaintyAmplifier ?? 0.35;
    const explorationWeight = options.explorationWeight ?? 0.1;

    const baseScores = signals.map((signal) =>
      this.computeBaseScore(signal, halfLife, saturation),
    );
    const epsilon = 1e-6;
    const totalBase = baseScores.reduce((sum, score) => sum + score, 0);
    const normalizedBase = baseScores.map(
      (score) => (score + epsilon) / (totalBase + epsilon * baseScores.length),
    );

    const wins = new Array(signals.length).fill(0);
    const totals = new Array(signals.length).fill(0);
    const squaredTotals = new Array(signals.length).fill(0);

    for (let sample = 0; sample < sampleCount; sample += 1) {
      let bestIndex = 0;
      let bestScore = -Infinity;

      for (let index = 0; index < signals.length; index += 1) {
        const signal = signals[index];
        const confidence = this.clamp(signal.confidence ?? 0.5);
        const variability = noiseFloor + (1 - confidence) * uncertaintyAmplifier;
        const noise = (this.nextRandom() * 2 - 1) * variability;
        const exploration = explorationWeight
          ? this.nextRandom() * explorationWeight
          : 0;
        const score = Math.max(0, normalizedBase[index] + noise + exploration);
        totals[index] += score;
        squaredTotals[index] += score * score;
        if (score > bestScore) {
          bestScore = score;
          bestIndex = index;
        }
      }

      wins[bestIndex] += 1;
    }

    const results = signals.map((signal, index) => {
      const probability = wins[index] / sampleCount;
      const meanScore = totals[index] / sampleCount;
      const variance = Math.max(
        0,
        squaredTotals[index] / sampleCount - meanScore * meanScore,
      );
      const volatility = Math.sqrt(variance);
      const baseWeight = normalizedBase[index];
      const awarenessScore = this.clamp(0.6 * probability + 0.4 * meanScore);

      return {
        actor: signal.actor,
        probability,
        meanScore,
        volatility,
        baseWeight,
        awarenessScore,
        confidence: this.clamp(signal.confidence ?? 0.5),
        dominanceCount: wins[index],
      };
    });

    return results.sort((a, b) => b.awarenessScore - a.awarenessScore);
  }

  buildSummary(results: ActorAwarenessResult[], limit = 3): string {
    if (!results || results.length === 0) {
      return 'No actor signals provided for awareness simulation.';
    }

    const focus = results.slice(0, limit);
    const breakdown = focus
      .map(
        (entry) =>
          `${entry.actor}: ${(entry.awarenessScore * 100).toFixed(1)} awareness score, ${(entry.probability * 100).toFixed(1)}% dominant`,
      )
      .join('; ');

    return `Stochastic actor awareness highlights ${focus[0].actor} as the leading threat focus. ${breakdown}.`;
  }

  private nextRandom(): number {
    const value = this.random();
    if (value === 1) {
      return 0.999999;
    }
    if (value === 0) {
      return 1e-6;
    }
    return value;
  }

  private computeBaseScore(
    signal: ActorSignal,
    halfLife: number,
    saturation: number,
  ): number {
    const sightingsScore = this.saturatingScore(signal.sightings ?? 0, saturation);
    const recencyScore = 1 / (1 + Math.max(0, signal.recencyDays ?? 0) / halfLife);
    const severityScore = this.clamp(signal.severity ?? 0.6);
    const capabilityScore = this.clamp(signal.capability ?? severityScore);
    const influenceScore = this.clamp(signal.influence ?? 0.5);
    const exposureScore = this.clamp(signal.exposure ?? 0.5);
    const confidenceScore = this.clamp(signal.confidence ?? 0.5);

    return (
      sightingsScore * 0.25 +
      recencyScore * 0.2 +
      severityScore * 0.2 +
      capabilityScore * 0.15 +
      influenceScore * 0.1 +
      exposureScore * 0.05 +
      confidenceScore * 0.05
    );
  }

  private saturatingScore(value: number, saturation: number): number {
    const safeValue = Math.max(0, value);
    const safeSaturation = Math.max(1e-3, saturation);
    return 1 - Math.exp(-safeValue / safeSaturation);
  }

  private clamp(value: number, min = 0, max = 1): number {
    if (!Number.isFinite(value)) {
      return min;
    }
    return Math.min(max, Math.max(min, value));
  }
}
