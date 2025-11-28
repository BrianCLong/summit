/**
 * FracturePoint - Represents a predicted system fracture point
 *
 * A fracture point is a moment in time when a system is predicted to
 * transition from a stable state to an unstable state, potentially
 * leading to system failure or degradation.
 */

export enum FractureSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface TriggeringFactor {
  name: string;
  contribution: number; // 0-1, how much this factor contributes
  currentValue: number;
  thresholdValue: number;
  trend: 'increasing' | 'decreasing' | 'stable' | 'oscillating';
}

export interface ImpactEstimate {
  affectedSystems: string[];
  estimatedDowntimeMinutes: number;
  estimatedCostUSD: number;
  userImpact: 'low' | 'medium' | 'high' | 'critical';
  dataLossRisk: number; // 0-1 probability
}

export interface FracturePoint {
  id: string;
  systemId: string;
  predictedTime: Date;
  detectedAt: Date;
  confidence: number; // 0-1
  severity: FractureSeverity;
  triggeringFactors: TriggeringFactor[];
  leadTimeHours: number;
  estimatedImpact: ImpactEstimate;
  actualOccurrence?: Date;
  wasPrevented?: boolean;
}

export class FracturePointModel implements FracturePoint {
  id: string;
  systemId: string;
  predictedTime: Date;
  detectedAt: Date;
  confidence: number;
  severity: FractureSeverity;
  triggeringFactors: TriggeringFactor[];
  leadTimeHours: number;
  estimatedImpact: ImpactEstimate;
  actualOccurrence?: Date;
  wasPrevented?: boolean;

  constructor(data: FracturePoint) {
    this.id = data.id;
    this.systemId = data.systemId;
    this.predictedTime = data.predictedTime;
    this.detectedAt = data.detectedAt;
    this.confidence = data.confidence;
    this.severity = data.severity;
    this.triggeringFactors = data.triggeringFactors;
    this.leadTimeHours = data.leadTimeHours;
    this.estimatedImpact = data.estimatedImpact;
    this.actualOccurrence = data.actualOccurrence;
    this.wasPrevented = data.wasPrevented;
  }

  /**
   * Calculate urgency score (0-1) based on lead time and severity
   */
  calculateUrgency(): number {
    const severityWeight = {
      [FractureSeverity.LOW]: 0.25,
      [FractureSeverity.MEDIUM]: 0.5,
      [FractureSeverity.HIGH]: 0.75,
      [FractureSeverity.CRITICAL]: 1.0,
    };

    // Urgency decreases with lead time (exponential decay)
    const timeUrgency = Math.exp(-this.leadTimeHours / 24);

    // Combine with severity
    const severityUrgency = severityWeight[this.severity];

    return timeUrgency * 0.6 + severityUrgency * 0.4;
  }

  /**
   * Check if this fracture point requires immediate attention
   */
  isUrgent(): boolean {
    return (
      this.calculateUrgency() > 0.7 ||
      this.leadTimeHours < 6 ||
      this.severity === FractureSeverity.CRITICAL
    );
  }

  /**
   * Get primary triggering factor (highest contribution)
   */
  getPrimaryTrigger(): TriggeringFactor | null {
    if (this.triggeringFactors.length === 0) return null;

    return this.triggeringFactors.reduce((max, factor) =>
      factor.contribution > max.contribution ? factor : max
    );
  }

  /**
   * Convert to JSON for storage/API
   */
  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      systemId: this.systemId,
      predictedTime: this.predictedTime.toISOString(),
      detectedAt: this.detectedAt.toISOString(),
      confidence: this.confidence,
      severity: this.severity,
      triggeringFactors: this.triggeringFactors,
      leadTimeHours: this.leadTimeHours,
      estimatedImpact: this.estimatedImpact,
      actualOccurrence: this.actualOccurrence?.toISOString(),
      wasPrevented: this.wasPrevented,
      urgency: this.calculateUrgency(),
      isUrgent: this.isUrgent(),
    };
  }

  /**
   * Create from database row
   */
  static fromDatabase(row: any): FracturePointModel {
    return new FracturePointModel({
      id: row.id,
      systemId: row.system_id,
      predictedTime: new Date(row.predicted_time),
      detectedAt: new Date(row.detected_at),
      confidence: row.confidence,
      severity: row.severity as FractureSeverity,
      triggeringFactors: row.triggering_factors,
      leadTimeHours: row.lead_time_hours,
      estimatedImpact: row.estimated_impact || {
        affectedSystems: [],
        estimatedDowntimeMinutes: 0,
        estimatedCostUSD: 0,
        userImpact: 'low',
        dataLossRisk: 0,
      },
      actualOccurrence: row.actual_occurrence
        ? new Date(row.actual_occurrence)
        : undefined,
      wasPrevented: row.was_prevented,
    });
  }
}
