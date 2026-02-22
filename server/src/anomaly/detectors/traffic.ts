import {
  AnomalyType,
  DetectionContext,
  Detector,
  AnomalyResult,
  Severity,
} from '../types.ts';
import { TrafficEngine } from '../traffic-engine.ts';
import { TrafficFlow } from '../traffic-types.ts';

interface TrafficData {
  flows: TrafficFlow[];
}

export class TrafficDetector implements Detector {
  type = AnomalyType.NETWORK; // Keeping it NETWORK as per user mental model, or could define TRAFFIC
  private engine: TrafficEngine;

  constructor() {
    this.engine = new TrafficEngine();
  }

  async detect(context: DetectionContext): Promise<AnomalyResult> {
    const data = context.data as TrafficData;
    const flows = data.flows;

    if (!flows || flows.length === 0) {
      return this.createResult(context, false, 0, Severity.LOW);
    }

    const anomaliesMap = this.engine.detectBatchAnomalies(flows);

    // Aggregate results
    const anomalies = Array.from(anomaliesMap.values());
    const isAnomaly = anomalies.length > 0;

    if (!isAnomaly) {
      return this.createResult(context, false, 0, Severity.LOW);
    }

    // Determine max severity and score
    const maxScore = Math.max(...anomalies.map(a => a.score));
    let severity = Severity.LOW;
    if (maxScore > 0.9) severity = Severity.CRITICAL;
    else if (maxScore > 0.7) severity = Severity.HIGH;
    else if (maxScore > 0.5) severity = Severity.MEDIUM;

    // Group by type for explanation
    const counts = anomalies.reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const contributingFactors = Object.entries(counts).map(([type, count]) => ({
        factor: `${type} Detection`,
        weight: count / flows.length,
        value: `${count} flows flagged`
    }));

    return this.createResult(context, true, maxScore, severity, {
      description: `Detected ${anomalies.length} traffic anomalies`,
      contributingFactors,
      details: anomalies.slice(0, 10) // Return first 10 for detailed view
    });
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
