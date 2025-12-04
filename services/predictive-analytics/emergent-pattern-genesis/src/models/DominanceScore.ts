/**
 * Dominance Score Model
 * Quantifies the likelihood of a pattern achieving dominance
 */

export interface DominanceFactor {
  name: string;
  value: number;
  weight: number;
  contribution: number;
}

export interface DominanceScore {
  patternId: string;
  score: number;
  growthRate: number;
  fitnessScore: number;
  resilienceScore: number;
  networkScore: number;
  rank: number;
  confidence: number;
  factors: DominanceFactor[];
}

export class DominanceScoreModel implements DominanceScore {
  patternId: string;
  score: number;
  growthRate: number;
  fitnessScore: number;
  resilienceScore: number;
  networkScore: number;
  rank: number;
  confidence: number;
  factors: DominanceFactor[];

  constructor(data: Partial<DominanceScore>) {
    this.patternId = data.patternId || '';
    this.score = data.score || 0;
    this.growthRate = data.growthRate || 0;
    this.fitnessScore = data.fitnessScore || 0;
    this.resilienceScore = data.resilienceScore || 0;
    this.networkScore = data.networkScore || 0;
    this.rank = data.rank || 0;
    this.confidence = data.confidence || 0;
    this.factors = data.factors || [];
  }

  /**
   * Calculate dominance score from components
   */
  calculateScore(weights = {
    growth: 0.3,
    fitness: 0.3,
    resilience: 0.2,
    network: 0.2,
  }): void {
    // Normalize scores to 0-1 range
    const normalizedGrowth = this.normalize(this.growthRate, 0, 1);
    const normalizedFitness = this.normalize(this.fitnessScore, 0, 1);
    const normalizedResilience = this.normalize(this.resilienceScore, 0, 1);
    const normalizedNetwork = this.normalize(this.networkScore, 0, 1);

    // Calculate weighted score
    this.score =
      weights.growth * normalizedGrowth +
      weights.fitness * normalizedFitness +
      weights.resilience * normalizedResilience +
      weights.network * normalizedNetwork;

    // Update factors
    this.factors = [
      {
        name: 'Growth Rate',
        value: this.growthRate,
        weight: weights.growth,
        contribution: weights.growth * normalizedGrowth,
      },
      {
        name: 'Fitness',
        value: this.fitnessScore,
        weight: weights.fitness,
        contribution: weights.fitness * normalizedFitness,
      },
      {
        name: 'Resilience',
        value: this.resilienceScore,
        weight: weights.resilience,
        contribution: weights.resilience * normalizedResilience,
      },
      {
        name: 'Network Effects',
        value: this.networkScore,
        weight: weights.network,
        contribution: weights.network * normalizedNetwork,
      },
    ];
  }

  /**
   * Normalize value to 0-1 range
   */
  private normalize(value: number, min: number, max: number): number {
    if (max === min) return 0;
    return Math.max(0, Math.min(1, (value - min) / (max - min)));
  }

  /**
   * Calculate growth rate from historical data
   */
  static calculateGrowthRate(
    strengthHistory: { time: number; strength: number }[]
  ): number {
    if (strengthHistory.length < 2) {
      return 0;
    }

    // Exponential growth model: S(t) = S0 * e^(r*t)
    // ln(S(t)) = ln(S0) + r*t
    // Linear regression on log-transformed data

    const n = strengthHistory.length;
    const logStrengths = strengthHistory.map((h) => Math.log(h.strength + 1));
    const times = strengthHistory.map((h) => h.time);

    const meanTime = times.reduce((sum, t) => sum + t, 0) / n;
    const meanLogStrength =
      logStrengths.reduce((sum, s) => sum + s, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (times[i] - meanTime) * (logStrengths[i] - meanLogStrength);
      denominator += Math.pow(times[i] - meanTime, 2);
    }

    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * Calculate fitness score based on competition
   */
  static calculateFitness(
    intrinsicStrength: number,
    competitionIntensities: number[]
  ): number {
    const competitionPressure = competitionIntensities.reduce(
      (sum, c) => sum + c,
      0
    );
    return intrinsicStrength / (1 + competitionPressure);
  }

  /**
   * Calculate resilience score
   */
  static calculateResilience(
    structuralRedundancy: number,
    resourceDiversity: number
  ): number {
    // Geometric mean of redundancy and diversity
    return Math.sqrt(structuralRedundancy * resourceDiversity);
  }

  /**
   * Calculate network score
   */
  static calculateNetworkScore(
    connectedComponents: number,
    beta = 0.5
  ): number {
    // Network effects with logarithmic growth
    return 1 + beta * Math.log(connectedComponents + 1);
  }

  /**
   * Calculate confidence in dominance prediction
   */
  calculateConfidence(
    dataQuality: number,
    historicalAccuracy: number
  ): void {
    // Confidence based on data quality and historical model accuracy
    this.confidence = (dataQuality + historicalAccuracy) / 2;
  }

  /**
   * Get top contributing factors
   */
  getTopFactors(k = 3): DominanceFactor[] {
    return [...this.factors]
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, k);
  }

  /**
   * Export to JSON
   */
  toJSON(): DominanceScore {
    return {
      patternId: this.patternId,
      score: this.score,
      growthRate: this.growthRate,
      fitnessScore: this.fitnessScore,
      resilienceScore: this.resilienceScore,
      networkScore: this.networkScore,
      rank: this.rank,
      confidence: this.confidence,
      factors: this.factors,
    };
  }
}
