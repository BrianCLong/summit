/**
 * Adoption Curve Engine
 *
 * Estimates technology adoption patterns, classifies maturity phases,
 * and calculates momentum scores from innovation graph evidence.
 */

import type {
  AdoptionSignal,
  AdoptionCurveParams,
  AdoptionEstimate,
  MomentumScore,
  MaturityPhase
} from "../interfaces/adoption.js";

import {
  evaluateAdoptionCurve,
  evaluateAdoptionVelocity,
  evaluateAdoptionAcceleration,
  classifyMaturityPhase,
  calculateMomentum
} from "../interfaces/adoption.js";

import type { InnovationGraph, InnovationNode } from "../interfaces/innovation-graph.js";

export interface AdoptionEngineConfig {
  minSignalsForEstimate: number;  // Minimum signals required for curve fitting
  defaultCarryingCapacity: number; // Default L parameter
  confidenceThreshold: number;     // Minimum confidence for estimates
}

export const DEFAULT_ADOPTION_CONFIG: AdoptionEngineConfig = {
  minSignalsForEstimate: 3,
  defaultCarryingCapacity: 1.0,
  confidenceThreshold: 0.3
};

export class AdoptionEngine {
  private config: AdoptionEngineConfig;

  constructor(config: Partial<AdoptionEngineConfig> = {}) {
    this.config = { ...DEFAULT_ADOPTION_CONFIG, ...config };
  }

  /**
   * Estimate adoption curves for all nodes in a graph
   */
  estimateAdoption(graph: InnovationGraph): Map<string, AdoptionEstimate> {
    const estimates = new Map<string, AdoptionEstimate>();

    for (const node of graph.nodes) {
      const signals = this.extractAdoptionSignals(node, graph);

      if (signals.length >= this.config.minSignalsForEstimate) {
        const estimate = this.estimateNodeAdoption(node.id, signals);

        if (estimate.confidence >= this.config.confidenceThreshold) {
          estimates.set(node.id, estimate);
        }
      }
    }

    return estimates;
  }

  /**
   * Extract adoption signals from node evidence and graph structure
   */
  private extractAdoptionSignals(node: InnovationNode, graph: InnovationGraph): AdoptionSignal[] {
    const signals: AdoptionSignal[] = [];

    // Signal 1: Evidence count over time (proxy for mentions/interest)
    const evidenceTimestamps = node.evidenceRefs
      .map(ref => ref.observedAt)
      .filter(t => t !== undefined) as string[];

    if (evidenceTimestamps.length > 0) {
      // Group evidence by month and count
      const byMonth = new Map<string, number>();

      for (const timestamp of evidenceTimestamps) {
        const month = timestamp.substring(0, 7); // YYYY-MM
        byMonth.set(month, (byMonth.get(month) || 0) + 1);
      }

      for (const [month, count] of byMonth.entries()) {
        signals.push({
          timestamp: `${month}-01T00:00:00Z`,
          metric: "mention_count",
          value: count,
          source: `evidence-aggregation`,
          confidence: 0.7
        });
      }
    }

    // Signal 2: Incoming edge count (dependency/usage signals)
    const incomingEdges = graph.edges.filter(e => e.to === node.id);

    if (incomingEdges.length > 0) {
      // Group by month based on edge evidence timestamps
      const byMonth = new Map<string, number>();

      for (const edge of incomingEdges) {
        for (const ref of edge.evidenceRefs) {
          if (ref.observedAt) {
            const month = ref.observedAt.substring(0, 7);
            byMonth.set(month, (byMonth.get(month) || 0) + 1);
          }
        }
      }

      for (const [month, count] of byMonth.entries()) {
        signals.push({
          timestamp: `${month}-01T00:00:00Z`,
          metric: "dependency_count",
          value: count,
          source: `graph-edges`,
          confidence: 0.9
        });
      }
    }

    // Signal 3: Node attributes (if maturity or adoption metrics exist)
    if (node.attrs.adoption_rate !== undefined) {
      signals.push({
        timestamp: node.lastSeenAt || new Date().toISOString(),
        metric: "mention_count",
        value: Number(node.attrs.adoption_rate) * 100,
        source: `node-attributes`,
        confidence: 1.0
      });
    }

    return signals;
  }

  /**
   * Estimate adoption curve for a single node
   */
  private estimateNodeAdoption(nodeId: string, signals: AdoptionSignal[]): AdoptionEstimate {
    const currentTime = Date.now();

    // Calculate momentum
    const momentum = calculateMomentum(signals, currentTime);

    // Fit S-curve if sufficient data
    let curveParams: AdoptionCurveParams | undefined;
    let adoptionRate = 0;
    let velocity = 0;
    let acceleration = 0;

    if (signals.length >= this.config.minSignalsForEstimate) {
      curveParams = this.fitSCurve(signals);

      if (curveParams) {
        // Evaluate curve at current time
        const t = currentTime;
        adoptionRate = evaluateAdoptionCurve(t, curveParams);
        velocity = evaluateAdoptionVelocity(t, curveParams);
        acceleration = evaluateAdoptionAcceleration(t, curveParams);
      } else {
        // Fallback: use latest signal value as proxy
        const latest = signals.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        )[0];

        adoptionRate = this.normalizeAdoptionRate(latest.value);
        velocity = momentum.components.velocity;
        acceleration = momentum.components.acceleration;
      }
    }

    // Classify maturity phase
    const phase = classifyMaturityPhase(adoptionRate);

    // Calculate overall confidence
    const confidence = this.calculateEstimateConfidence(signals, curveParams);

    return {
      nodeId,
      phase,
      adoptionRate,
      curveParams,
      momentum: momentum.overall,
      velocity,
      acceleration,
      signals,
      estimatedAt: new Date().toISOString(),
      confidence
    };
  }

  /**
   * Fit S-curve parameters using least squares
   *
   * Simplified fitting: assumes L=1.0, estimates k and t0
   */
  private fitSCurve(signals: AdoptionSignal[]): AdoptionCurveParams | undefined {
    if (signals.length < 3) return undefined;

    const sorted = [...signals].sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    // Normalize values to [0, 1] range
    const values = sorted.map(s => this.normalizeAdoptionRate(s.value));
    const times = sorted.map(s => new Date(s.timestamp).getTime());

    // Find inflection point (approximate as time when adoption ~ 0.5)
    let t0 = times[0];
    let minDist = Infinity;

    for (let i = 0; i < values.length; i++) {
      const dist = Math.abs(values[i] - 0.5);
      if (dist < minDist) {
        minDist = dist;
        t0 = times[i];
      }
    }

    // Estimate growth rate k using linear regression on logit transform
    const logitValues: number[] = [];
    const validTimes: number[] = [];

    for (let i = 0; i < values.length; i++) {
      const val = values[i];
      // Avoid division by zero
      if (val > 0.01 && val < 0.99) {
        logitValues.push(Math.log(val / (1 - val)));
        validTimes.push(times[i] - t0);
      }
    }

    if (logitValues.length < 2) return undefined;

    const k = this.linearRegressionSlope(validTimes, logitValues);

    if (k <= 0 || isNaN(k) || !isFinite(k)) return undefined;

    return {
      L: this.config.defaultCarryingCapacity,
      k,
      t0
    };
  }

  /**
   * Linear regression slope helper
   */
  private linearRegressionSlope(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;

    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = y.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
    const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);

    const denominator = n * sumX2 - sumX * sumX;
    if (denominator === 0) return 0;

    const slope = (n * sumXY - sumX * sumY) / denominator;
    return isNaN(slope) ? 0 : slope;
  }

  /**
   * Normalize raw signal value to adoption rate [0, 1]
   */
  private normalizeAdoptionRate(value: number): number {
    // Simple log-scaling for count-based metrics
    // Assumes value is in range [0, infinity]
    if (value <= 0) return 0;

    // Use logistic scaling: more counts → higher adoption
    // Midpoint at 10, scale factor 0.1
    const scaled = 1 / (1 + Math.exp(-0.1 * (value - 10)));

    return Math.max(0, Math.min(1, scaled));
  }

  /**
   * Calculate confidence in adoption estimate
   */
  private calculateEstimateConfidence(
    signals: AdoptionSignal[],
    curveParams?: AdoptionCurveParams
  ): number {
    let confidence = 0;

    // Signal count factor (more signals = higher confidence)
    const signalFactor = Math.min(1.0, signals.length / 10);
    confidence += 0.4 * signalFactor;

    // Signal diversity factor
    const uniqueMetrics = new Set(signals.map(s => s.metric)).size;
    const diversityFactor = uniqueMetrics / 5;
    confidence += 0.2 * diversityFactor;

    // Average signal confidence
    const avgSignalConfidence = signals.reduce((sum, s) => sum + s.confidence, 0) / signals.length;
    confidence += 0.3 * avgSignalConfidence;

    // Curve fit quality (if curve was fitted)
    if (curveParams) {
      confidence += 0.1; // Bonus for successful curve fitting
    }

    return Math.min(1.0, confidence);
  }

  /**
   * Get adoption trends over time
   */
  getAdoptionTrends(estimate: AdoptionEstimate, timeRange: { start: number; end: number; step: number }): Array<{ time: number; adoption: number; velocity: number }> {
    if (!estimate.curveParams) {
      return [];
    }

    const trends: Array<{ time: number; adoption: number; velocity: number }> = [];

    for (let t = timeRange.start; t <= timeRange.end; t += timeRange.step) {
      const adoption = evaluateAdoptionCurve(t, estimate.curveParams);
      const velocity = evaluateAdoptionVelocity(t, estimate.curveParams);

      trends.push({ time: t, adoption, velocity });
    }

    return trends;
  }

  /**
   * Predict future adoption
   */
  predictFutureAdoption(estimate: AdoptionEstimate, futureTime: number): number {
    if (!estimate.curveParams) {
      // Fallback: linear extrapolation
      return Math.min(1.0, estimate.adoptionRate + estimate.velocity * futureTime);
    }

    return evaluateAdoptionCurve(futureTime, estimate.curveParams);
  }
}
