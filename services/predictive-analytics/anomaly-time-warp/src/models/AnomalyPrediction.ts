/**
 * Anomaly Prediction Model
 * Represents a predicted anomaly with onset window and confidence
 */

export enum Severity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

export interface OnsetWindow {
  earliest: Date;
  latest: Date;
  confidence: number;
  timeUntilOnsetMs: number;
}

export interface AnomalyPrediction {
  id: string;
  entityId: string;
  predictedOnsetTime: Date;
  onsetWindow: OnsetWindow;
  expectedSeverity: Severity;
  confidence: number;
  contributingFactors: string[];
  precursorSignalIds: string[];
  metadata?: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnomalyPredictionCreate {
  entityId: string;
  predictedOnsetTime: Date;
  onsetWindow: OnsetWindow;
  expectedSeverity: Severity;
  confidence: number;
  contributingFactors: string[];
  metadata?: Record<string, any>;
}

export class AnomalyPredictionModel {
  /**
   * Calculate time until predicted onset
   */
  static timeUntilOnset(prediction: AnomalyPrediction): number {
    return prediction.predictedOnsetTime.getTime() - Date.now();
  }

  /**
   * Check if prediction is still valid (onset time not passed)
   */
  static isValid(prediction: AnomalyPrediction): boolean {
    return prediction.onsetWindow.latest.getTime() > Date.now();
  }

  /**
   * Check if we're currently in the onset window
   */
  static inOnsetWindow(prediction: AnomalyPrediction): boolean {
    const now = Date.now();
    return (
      now >= prediction.onsetWindow.earliest.getTime() &&
      now <= prediction.onsetWindow.latest.getTime()
    );
  }

  /**
   * Calculate urgency score (0-1) based on time until onset
   */
  static calculateUrgency(prediction: AnomalyPrediction): number {
    const timeUntil = this.timeUntilOnset(prediction);
    const windowDuration =
      prediction.onsetWindow.latest.getTime() -
      prediction.onsetWindow.earliest.getTime();

    if (timeUntil <= 0) return 1.0; // Onset time passed
    if (timeUntil > windowDuration * 10) return 0.1; // Far future

    // Exponential urgency curve
    const normalized = Math.min(timeUntil / (windowDuration * 10), 1);
    return 1 - normalized;
  }

  /**
   * Get severity weight for prioritization
   */
  static getSeverityWeight(severity: Severity): number {
    const weights: Record<Severity, number> = {
      [Severity.LOW]: 1,
      [Severity.MEDIUM]: 2,
      [Severity.HIGH]: 4,
      [Severity.CRITICAL]: 8,
    };
    return weights[severity];
  }

  /**
   * Calculate overall risk score (urgency * severity * confidence)
   */
  static calculateRiskScore(prediction: AnomalyPrediction): number {
    const urgency = this.calculateUrgency(prediction);
    const severityWeight = this.getSeverityWeight(prediction.expectedSeverity);
    return urgency * severityWeight * prediction.confidence;
  }

  /**
   * Validate prediction data
   */
  static validate(data: AnomalyPredictionCreate): string[] {
    const errors: string[] = [];

    if (!data.entityId) errors.push('entityId is required');
    if (!data.predictedOnsetTime) errors.push('predictedOnsetTime is required');
    if (data.confidence < 0 || data.confidence > 1) {
      errors.push('confidence must be between 0 and 1');
    }
    if (!data.onsetWindow) {
      errors.push('onsetWindow is required');
    } else {
      if (data.onsetWindow.earliest >= data.onsetWindow.latest) {
        errors.push('onsetWindow.earliest must be before onsetWindow.latest');
      }
      if (
        data.predictedOnsetTime < data.onsetWindow.earliest ||
        data.predictedOnsetTime > data.onsetWindow.latest
      ) {
        errors.push(
          'predictedOnsetTime must be within onsetWindow bounds',
        );
      }
    }

    return errors;
  }
}
