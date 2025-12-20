/**
 * Population-Level Belief System Modeling
 *
 * Models aggregate belief distributions and dynamics
 */

export interface PopulationBeliefState {
  topic: string;
  distribution: BeliefDistributionStats;
  polarization: PolarizationMetrics;
  dynamics: BeliefDynamics;
}

export interface BeliefDistributionStats {
  mean: number;
  variance: number;
  bimodality: number;
  skewness: number;
  kurtosis: number;
  clusters: BeliefCluster[];
}

export interface BeliefCluster {
  centroid: number;
  size: number;
  coherence: number;
  demographicProfile: string[];
}

export interface PolarizationMetrics {
  affective: number; // Emotional dislike of outgroup
  ideological: number; // Belief distance
  social: number; // Social sorting
  perceived: number; // Perceived polarization (often > actual)
  symmetric: boolean; // Equal on both sides?
}

export interface BeliefDynamics {
  velocity: number; // Rate of change
  acceleration: number;
  stability: number;
  volatility: number;
  drivers: BeliefDriver[];
}

export interface BeliefDriver {
  factor: string;
  influence: number;
  direction: number;
}

/**
 * Population Belief Tracker
 */
export class PopulationBeliefTracker {
  private history: Map<string, PopulationBeliefState[]> = new Map();

  trackBelief(topic: string, state: PopulationBeliefState): void {
    const history = this.history.get(topic) || [];
    history.push(state);
    this.history.set(topic, history);
  }

  calculatePolarizationTrend(topic: string, windowSize: number): PolarizationTrend {
    const history = this.history.get(topic) || [];
    if (history.length < windowSize) {
      return { trend: 'INSUFFICIENT_DATA', slope: 0, confidence: 0 };
    }

    const recent = history.slice(-windowSize);
    const polarizationValues = recent.map((s) => s.polarization.ideological);

    // Linear regression for trend
    const slope = this.calculateSlope(polarizationValues);

    return {
      trend: slope > 0.01 ? 'INCREASING' : slope < -0.01 ? 'DECREASING' : 'STABLE',
      slope,
      confidence: this.calculateConfidence(polarizationValues, slope),
    };
  }

  private calculateSlope(values: number[]): number {
    const n = values.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

    for (let i = 0; i < n; i++) {
      sumX += i;
      sumY += values[i];
      sumXY += i * values[i];
      sumXX += i * i;
    }

    return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  }

  private calculateConfidence(values: number[], slope: number): number {
    // R² approximation
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const ssTotal = values.reduce((sum, v) => sum + (v - mean) ** 2, 0);
    const predictions = values.map((_, i) => mean + slope * (i - (n - 1) / 2));
    const ssRes = values.reduce((sum, v, i) => sum + (v - predictions[i]) ** 2, 0);

    return ssTotal > 0 ? 1 - ssRes / ssTotal : 0;
  }
}

export interface PolarizationTrend {
  trend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'INSUFFICIENT_DATA';
  slope: number;
  confidence: number;
}
