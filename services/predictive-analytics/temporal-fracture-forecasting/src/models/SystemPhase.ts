/**
 * SystemPhase - Represents the current phase state of a system
 *
 * Systems transition through distinct phases based on stability characteristics.
 */

export enum PhaseState {
  STABLE = 'STABLE',
  PRE_FRACTURE = 'PRE_FRACTURE',
  UNSTABLE = 'UNSTABLE',
  CRITICAL = 'CRITICAL',
  RECOVERING = 'RECOVERING',
}

export interface StabilityMetric {
  timestamp: Date;
  systemId: string;
  lyapunovExponent: number;
  stabilityScore: number; // 0-1
  hurstExponent?: number;
  entropy?: number;
  isStable: boolean;
  timeToInstability?: number; // minutes
}

export interface Trend {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  magnitude: number; // percentage change
  confidence: number; // 0-1
}

export interface PhaseTransition {
  id: string;
  systemId: string;
  transitionTime: Date;
  fromPhase: PhaseState;
  toPhase: PhaseState;
  confidence: number;
  metrics: Record<string, number>;
}

export interface SystemPhase {
  systemId: string;
  current: PhaseState;
  duration: number; // seconds in current phase
  stability: StabilityMetric;
  trends: Trend[];
  lastTransition?: PhaseTransition;
}

export class SystemPhaseModel implements SystemPhase {
  systemId: string;
  current: PhaseState;
  duration: number;
  stability: StabilityMetric;
  trends: Trend[];
  lastTransition?: PhaseTransition;

  constructor(data: SystemPhase) {
    this.systemId = data.systemId;
    this.current = data.current;
    this.duration = data.duration;
    this.stability = data.stability;
    this.trends = data.trends;
    this.lastTransition = data.lastTransition;
  }

  /**
   * Determine if phase is healthy
   */
  isHealthy(): boolean {
    return (
      this.current === PhaseState.STABLE ||
      this.current === PhaseState.RECOVERING
    );
  }

  /**
   * Determine if phase requires attention
   */
  requiresAttention(): boolean {
    return (
      this.current === PhaseState.PRE_FRACTURE ||
      this.current === PhaseState.UNSTABLE ||
      this.current === PhaseState.CRITICAL
    );
  }

  /**
   * Get phase severity (0-1)
   */
  getSeverity(): number {
    const severityMap = {
      [PhaseState.STABLE]: 0.0,
      [PhaseState.RECOVERING]: 0.2,
      [PhaseState.PRE_FRACTURE]: 0.5,
      [PhaseState.UNSTABLE]: 0.75,
      [PhaseState.CRITICAL]: 1.0,
    };

    return severityMap[this.current];
  }

  /**
   * Get dominant trend
   */
  getDominantTrend(): Trend | null {
    if (this.trends.length === 0) return null;

    return this.trends.reduce((max, trend) =>
      trend.magnitude > max.magnitude ? trend : max
    );
  }

  /**
   * Predict next phase transition
   */
  predictNextPhase(): { phase: PhaseState; probability: number } | null {
    // Simple state machine logic
    const transitions: Record<
      PhaseState,
      { phase: PhaseState; probability: number }[]
    > = {
      [PhaseState.STABLE]: [
        { phase: PhaseState.PRE_FRACTURE, probability: 0.1 },
        { phase: PhaseState.STABLE, probability: 0.9 },
      ],
      [PhaseState.PRE_FRACTURE]: [
        { phase: PhaseState.UNSTABLE, probability: 0.6 },
        { phase: PhaseState.STABLE, probability: 0.4 },
      ],
      [PhaseState.UNSTABLE]: [
        { phase: PhaseState.CRITICAL, probability: 0.7 },
        { phase: PhaseState.RECOVERING, probability: 0.3 },
      ],
      [PhaseState.CRITICAL]: [
        { phase: PhaseState.RECOVERING, probability: 0.5 },
        { phase: PhaseState.CRITICAL, probability: 0.5 },
      ],
      [PhaseState.RECOVERING]: [
        { phase: PhaseState.STABLE, probability: 0.8 },
        { phase: PhaseState.UNSTABLE, probability: 0.2 },
      ],
    };

    const possibleTransitions = transitions[this.current];

    // Adjust probabilities based on stability score
    if (this.stability.stabilityScore < 0.3) {
      // Low stability, increase probability of degradation
      return possibleTransitions.find((t) =>
        [PhaseState.UNSTABLE, PhaseState.CRITICAL].includes(t.phase)
      ) || possibleTransitions[0];
    }

    return possibleTransitions[0];
  }

  /**
   * Convert to JSON
   */
  toJSON(): Record<string, unknown> {
    return {
      systemId: this.systemId,
      current: this.current,
      duration: this.duration,
      stability: {
        ...this.stability,
        timestamp: this.stability.timestamp.toISOString(),
      },
      trends: this.trends,
      lastTransition: this.lastTransition
        ? {
            ...this.lastTransition,
            transitionTime: this.lastTransition.transitionTime.toISOString(),
          }
        : undefined,
      isHealthy: this.isHealthy(),
      requiresAttention: this.requiresAttention(),
      severity: this.getSeverity(),
    };
  }

  /**
   * Create from database row
   */
  static fromDatabase(row: any): SystemPhaseModel {
    return new SystemPhaseModel({
      systemId: row.system_id,
      current: row.current_phase as PhaseState,
      duration: row.duration,
      stability: {
        timestamp: new Date(row.stability_timestamp),
        systemId: row.system_id,
        lyapunovExponent: row.lyapunov_exponent,
        stabilityScore: row.stability_score,
        hurstExponent: row.hurst_exponent,
        entropy: row.entropy,
        isStable: row.is_stable,
        timeToInstability: row.time_to_instability,
      },
      trends: row.trends || [],
      lastTransition: row.last_transition,
    });
  }
}
