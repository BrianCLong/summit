import {
  AnomalyType,
  DetectionContext,
  Detector,
  AnomalyResult,
  Severity,
} from '../types.js';
import { isolationForest, Neo4jGraph, AnomalyScore } from '../forest.js';

interface NetworkData {
  graph: Neo4jGraph;
  targetNodeId?: string;
}

export class NetworkDetector implements Detector {
  type = AnomalyType.NETWORK;

  async detect(context: DetectionContext): Promise<AnomalyResult> {
    const data = context.data as NetworkData;
    const { graph, targetNodeId } = data;

    // Run existing isolation forest implementation
    const result = isolationForest.fit_transform(
      (await import('../forest.js')).features(graph)
    );

    // If looking for a specific node's anomaly status
    if (targetNodeId) {
      const nodeResult = result.nodes.find((n) => n.id === targetNodeId);
      if (nodeResult) {
        return this.mapToResult(context, nodeResult);
      } else {
        // Node not found in graph analysis
        return this.createResult(context, false, 0, Severity.LOW);
      }
    }

    // If general graph analysis, check if we have any high confidence anomalies
    const criticalAnomalies = result.nodes.filter(n => n.score > 0.8);
    const isAnomaly = criticalAnomalies.length > 0;
    const maxScore = isAnomaly ? Math.max(...criticalAnomalies.map(n => n.score)) : 0;

    return this.createResult(context, isAnomaly, maxScore, isAnomaly ? Severity.HIGH : Severity.LOW, isAnomaly ? {
      description: `Detected ${criticalAnomalies.length} network anomalies in graph`,
      contributingFactors: criticalAnomalies.slice(0, 5).map(n => ({
        factor: `Node ${n.id} anomaly`,
        weight: n.score,
        value: n.reason
      }))
    } : undefined);
  }

  private mapToResult(context: DetectionContext, node: AnomalyScore): AnomalyResult {
    let severity = Severity.LOW;
    if (node.score > 0.9) severity = Severity.CRITICAL;
    else if (node.score > 0.75) severity = Severity.HIGH;
    else if (node.score > 0.5) severity = Severity.MEDIUM;

    return {
      isAnomaly: node.isAnomaly,
      score: node.score,
      severity,
      type: this.type,
      entityId: context.entityId,
      timestamp: context.timestamp,
      explanation: node.isAnomaly ? {
        description: `Network anomaly detected: ${node.reason}`,
        contributingFactors: Object.entries(node.metrics).map(([key, value]) => ({
          factor: key,
          weight: 1.0, // Simplification
          value
        }))
      } : undefined
    };
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
