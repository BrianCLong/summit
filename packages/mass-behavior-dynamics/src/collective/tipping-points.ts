/**
 * Tipping Point Analysis
 *
 * Identifies and predicts social tipping points for various phenomena
 */

export interface TippingPointAnalysis {
  phenomenon: string;
  currentState: SystemState;
  tippingPoints: TippingPoint[];
  trajectory: Trajectory;
  interventionLeverage: InterventionLeverage[];
}

export interface SystemState {
  position: number;
  velocity: number;
  stability: number;
  basin: 'PRE_TIPPING' | 'TRANSITION' | 'POST_TIPPING';
}

export interface TippingPoint {
  name: string;
  type: TippingType;
  threshold: number;
  reversibility: number;
  consequences: string[];
  earlyWarningWindow: number;
}

export type TippingType =
  | 'BIFURCATION' // Gradual parameter change causes sudden state change
  | 'NOISE_INDUCED' // Random fluctuations push system over threshold
  | 'RATE_INDUCED' // Speed of change matters (too fast to adapt)
  | 'NETWORK_CASCADE'; // Local failures propagate globally

export interface Trajectory {
  current: number;
  trend: 'TOWARD' | 'AWAY' | 'PARALLEL';
  timeToTipping?: number;
  uncertainty: number;
}

export interface InterventionLeverage {
  lever: string;
  sensitivity: number;
  direction: number;
  cost: string;
  timeScale: string;
}

/**
 * Tipping Point Analyzer
 */
export class TippingPointAnalyzer {
  /**
   * Analyze social tipping dynamics
   *
   * Common social tipping points:
   * - Norm change (25% threshold per Centola et al.)
   * - Technology adoption (Rogers diffusion curve)
   * - Political mobilization (variable, network-dependent)
   * - Trust collapse (often sudden, hysteresis)
   */
  analyzeTippingDynamics(
    phenomenon: string,
    timeSeries: number[],
    parameters: TippingParameters
  ): TippingPointAnalysis {
    // Determine current state
    const currentState = this.assessCurrentState(timeSeries);

    // Identify relevant tipping points
    const tippingPoints = this.identifyTippingPoints(phenomenon, parameters);

    // Calculate trajectory
    const trajectory = this.calculateTrajectory(timeSeries, tippingPoints);

    // Identify intervention levers
    const interventionLeverage = this.identifyInterventionLevers(phenomenon, currentState);

    return {
      phenomenon,
      currentState,
      tippingPoints,
      trajectory,
      interventionLeverage,
    };
  }

  /**
   * Social norm tipping analysis
   *
   * Based on research showing ~25% committed minority
   * can tip social conventions
   */
  analyzeNormTipping(
    currentCommitted: number,
    networkStructure: NetworkStructure
  ): NormTippingAnalysis {
    // Centola threshold (~25%) adjusted for network
    const baseThreshold = 0.25;
    const adjustedThreshold = this.adjustThresholdForNetwork(baseThreshold, networkStructure);

    const distanceToTipping = adjustedThreshold - currentCommitted;
    const cascadeLikelihood = this.estimateCascadeLikelihood(currentCommitted, adjustedThreshold);

    return {
      threshold: adjustedThreshold,
      currentCommitted,
      distanceToTipping,
      cascadeLikelihood,
      estimatedTimeToTipping: this.estimateTimeDynamics(currentCommitted, adjustedThreshold),
      keyGroups: this.identifyKeyNormGroups(networkStructure),
    };
  }

  private assessCurrentState(timeSeries: number[]): SystemState {
    const n = timeSeries.length;
    const current = timeSeries[n - 1];
    const velocity = n > 1 ? timeSeries[n - 1] - timeSeries[n - 2] : 0;
    const stability = this.calculateStability(timeSeries);

    let basin: SystemState['basin'];
    if (stability > 0.7) {
      basin = current > 0.5 ? 'POST_TIPPING' : 'PRE_TIPPING';
    } else {
      basin = 'TRANSITION';
    }

    return { position: current, velocity, stability, basin };
  }

  private calculateStability(timeSeries: number[]): number {
    const variance = this.calculateVariance(timeSeries);
    return Math.exp(-variance * 10);
  }

  private calculateVariance(series: number[]): number {
    const mean = series.reduce((a, b) => a + b, 0) / series.length;
    return series.reduce((sum, x) => sum + (x - mean) ** 2, 0) / series.length;
  }

  private identifyTippingPoints(
    phenomenon: string,
    params: TippingParameters
  ): TippingPoint[] {
    const points: TippingPoint[] = [];

    if (phenomenon === 'NORM_CHANGE') {
      points.push({
        name: 'Social Convention Tipping',
        type: 'BIFURCATION',
        threshold: params.normThreshold || 0.25,
        reversibility: 0.3,
        consequences: ['Rapid norm adoption', 'Old norm becomes deviant'],
        earlyWarningWindow: 14,
      });
    }

    if (phenomenon === 'TRUST_COLLAPSE') {
      points.push({
        name: 'Institutional Trust Collapse',
        type: 'NOISE_INDUCED',
        threshold: params.trustThreshold || 0.3,
        reversibility: 0.2,
        consequences: [
          'Legitimacy crisis',
          'Alternative authority seeking',
          'Social fragmentation',
        ],
        earlyWarningWindow: 7,
      });
    }

    if (phenomenon === 'MOBILIZATION') {
      points.push({
        name: 'Mass Mobilization Threshold',
        type: 'NETWORK_CASCADE',
        threshold: params.mobilizationThreshold || 0.1,
        reversibility: 0.5,
        consequences: ['Collective action', 'Demonstration effects', 'Counter-mobilization'],
        earlyWarningWindow: 3,
      });
    }

    return points;
  }

  private calculateTrajectory(
    timeSeries: number[],
    tippingPoints: TippingPoint[]
  ): Trajectory {
    const current = timeSeries[timeSeries.length - 1];
    const velocity = this.calculateVelocity(timeSeries);
    const nearestTipping = tippingPoints[0]?.threshold || 0.5;

    const direction = velocity * Math.sign(nearestTipping - current);
    const trend: Trajectory['trend'] =
      direction > 0.01 ? 'TOWARD' : direction < -0.01 ? 'AWAY' : 'PARALLEL';

    const timeToTipping =
      velocity !== 0 ? Math.abs(nearestTipping - current) / Math.abs(velocity) : undefined;

    return {
      current,
      trend,
      timeToTipping,
      uncertainty: this.calculateUncertainty(timeSeries),
    };
  }

  private calculateVelocity(timeSeries: number[]): number {
    const n = timeSeries.length;
    if (n < 2) return 0;

    // Use last 5 points for velocity estimate
    const window = timeSeries.slice(-5);
    let sumSlope = 0;

    for (let i = 1; i < window.length; i++) {
      sumSlope += window[i] - window[i - 1];
    }

    return sumSlope / (window.length - 1);
  }

  private calculateUncertainty(timeSeries: number[]): number {
    const variance = this.calculateVariance(timeSeries);
    return Math.sqrt(variance);
  }

  private identifyInterventionLevers(
    phenomenon: string,
    state: SystemState
  ): InterventionLeverage[] {
    const levers: InterventionLeverage[] = [];

    if (phenomenon === 'NORM_CHANGE') {
      levers.push({
        lever: 'Visible committed minorities',
        sensitivity: 0.8,
        direction: 1,
        cost: 'LOW',
        timeScale: 'WEEKS',
      });
      levers.push({
        lever: 'Elite endorsement',
        sensitivity: 0.6,
        direction: 1,
        cost: 'MEDIUM',
        timeScale: 'DAYS',
      });
    }

    if (phenomenon === 'TRUST_COLLAPSE') {
      levers.push({
        lever: 'Transparency measures',
        sensitivity: 0.5,
        direction: -1,
        cost: 'LOW',
        timeScale: 'DAYS',
      });
      levers.push({
        lever: 'Trusted intermediaries',
        sensitivity: 0.7,
        direction: -1,
        cost: 'MEDIUM',
        timeScale: 'WEEKS',
      });
    }

    return levers;
  }

  private adjustThresholdForNetwork(base: number, structure: NetworkStructure): number {
    // Higher clustering lowers threshold (local reinforcement)
    const clusteringEffect = structure.clustering * 0.1;
    // Higher modularity raises threshold (harder to spread across groups)
    const modularityEffect = structure.modularity * 0.1;

    return Math.max(0.1, Math.min(0.5, base - clusteringEffect + modularityEffect));
  }

  private estimateCascadeLikelihood(current: number, threshold: number): number {
    if (current >= threshold) return 0.95;
    return Math.pow(current / threshold, 2);
  }

  private estimateTimeDynamics(current: number, threshold: number): number | undefined {
    // Would need velocity data
    return undefined;
  }

  private identifyKeyNormGroups(structure: NetworkStructure): string[] {
    return structure.highCentralityGroups || [];
  }
}

export interface TippingParameters {
  normThreshold?: number;
  trustThreshold?: number;
  mobilizationThreshold?: number;
}

export interface NetworkStructure {
  clustering: number;
  modularity: number;
  highCentralityGroups?: string[];
}

export interface NormTippingAnalysis {
  threshold: number;
  currentCommitted: number;
  distanceToTipping: number;
  cascadeLikelihood: number;
  estimatedTimeToTipping?: number;
  keyGroups: string[];
}
