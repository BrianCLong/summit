import {
  AnomalyType,
  DetectionContext,
  Detector,
  AnomalyResult,
  Severity,
} from '../types.ts';

interface TemporalData {
  value: number;
  metric: string;
  history?: number[]; // Previous values for context
}

export class TemporalDetector implements Detector {
  type = AnomalyType.TEMPORAL;
  private readonly Z_SCORE_THRESHOLD = 3.0;

  async detect(context: DetectionContext): Promise<AnomalyResult> {
    const data = context.data as TemporalData;
    const { value, metric, history = [] } = data;

    if (history.length < 5) {
      // Not enough data to establish a baseline
      return this.createResult(context, false, 0, Severity.LOW);
    }

    const { mean, std } = this.calculateStats(history);

    if (std === 0) {
      // Flatline history. Any deviation is infinite Z-score technically, but practically just check if different.
      const isDiff = value !== mean;
      return this.createResult(
        context,
        isDiff,
        isDiff ? 1.0 : 0.0,
        Severity.CRITICAL,
        isDiff ? {
          description: `Value deviated from constant baseline of ${mean}`,
          contributingFactors: [{ factor: 'deviation', weight: 1.0, value }]
        } : undefined
      );
    }

    const zScore = (value - mean) / std;
    const absZ = Math.abs(zScore);
    const score = Math.min(absZ / 6, 1.0); // Normalize roughly, 6 sigma as 1.0
    const isAnomaly = absZ > this.Z_SCORE_THRESHOLD;

    let severity = Severity.LOW;
    if (absZ > 5) severity = Severity.CRITICAL;
    else if (absZ > 4) severity = Severity.HIGH;
    else if (absZ > 3) severity = Severity.MEDIUM;

    return this.createResult(context, isAnomaly, score, severity, isAnomaly ? {
      description: `Temporal anomaly detected for ${metric} (Z-Score: ${zScore.toFixed(2)})`,
      contributingFactors: [
        { factor: 'z-score', weight: 0.8, value: zScore },
        { factor: 'value', weight: 0.2, value }
      ]
    } : undefined);
  }

  private calculateStats(values: number[]) {
    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
    return { mean, std: Math.sqrt(variance) };
  }

  private createResult(
    context: DetectionContext,
    isAnomaly: boolean,
    score: number,
    severity: Severity,
    explanation?: any
  ): AnomalyResult {
    return {
      isAnomaly,
      score,
      severity,
      type: this.type,
      entityId: context.entityId,
      timestamp: context.timestamp,
      explanation,
    };
  }
}
