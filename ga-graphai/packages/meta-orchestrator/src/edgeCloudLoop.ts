import type { GraphEdge, GraphNode, GraphSnapshot } from '@ga-graphai/knowledge-graph';

type ExecutionTier = 'edge' | 'cloud';

export interface EdgeCloudLoopConfig {
  perceptionSloMs: number;
  planSloMs: number;
  governanceBacklogThreshold: number;
  cloudQueueBackpressurePct: number;
  mergeThreshold: number;
  targetUpliftPercent: number;
}

export interface ExecutionSignal {
  perceptionLatencyMs: number;
  planningLatencyMs: number;
  cloudQueueDepthPct: number;
  governancePending: number;
  changeComplexity: 'low' | 'medium' | 'high';
  complianceRisk: 'low' | 'medium' | 'high';
}

export interface RoundMetrics {
  round: number;
  deltaQuality: number;
  deltaVelocity: number;
  governanceScore: number; // 0..1
  incidentsOpen: number;
  rollbackRef?: string;
}

export interface TierDecision {
  tier: ExecutionTier;
  reasons: string[];
}

export interface RoundEvaluation {
  overallScore: number;
  mergeReady: boolean;
  requiresRollback: boolean;
  reasons: string[];
}

export class EdgeCloudLoopController {
  constructor(private readonly config: EdgeCloudLoopConfig) {}

  chooseExecutionTier(signal: ExecutionSignal): TierDecision {
    const reasons: string[] = [];
    let tier: ExecutionTier = 'edge';

    if (signal.changeComplexity === 'high') {
      tier = 'cloud';
      reasons.push('high complexity change');
    }

    if (signal.complianceRisk === 'high') {
      tier = 'cloud';
      reasons.push('high compliance risk');
    }

    if (signal.perceptionLatencyMs > this.config.perceptionSloMs) {
      tier = 'cloud';
      reasons.push('perception latency breach');
    }

    if (signal.planningLatencyMs > this.config.planSloMs) {
      tier = 'cloud';
      reasons.push('planning latency breach');
    }

    if (
      signal.governancePending > this.config.governanceBacklogThreshold &&
      tier === 'edge'
    ) {
      reasons.push('edge governance backlog high; staying edge to drain locally');
    }

    if (signal.cloudQueueDepthPct > this.config.cloudQueueBackpressurePct) {
      if (tier === 'cloud') {
        reasons.push('cloud queue saturated; re-evaluate for edge capacity');
        tier = 'edge';
      } else {
        reasons.push('cloud queue saturated; keep workload local');
      }
    }

    if (reasons.length === 0) {
      reasons.push('default edge preference for fast iteration');
    }

    return { tier, reasons };
  }

  evaluateRound(metrics: RoundMetrics): RoundEvaluation {
    const reasons: string[] = [];

    const qualityScore = clamp(50 + metrics.deltaQuality * 0.5, 0, 100);
    const velocityScore = clamp(50 + metrics.deltaVelocity * 0.5, 0, 100);
    const governanceScore = clamp(metrics.governanceScore * 100, 0, 100);

    const overallScore = roundToTwo(
      qualityScore * 0.4 + velocityScore * 0.3 + governanceScore * 0.3,
    );

    const upliftScore = (metrics.deltaQuality + metrics.deltaVelocity) / 2;
    const upliftMet = upliftScore >= this.config.targetUpliftPercent;

    if (!upliftMet) {
      reasons.push(`uplift ${upliftScore.toFixed(1)}% below target`);
    } else {
      reasons.push(`uplift ${upliftScore.toFixed(1)}% meets target`);
    }

    if (metrics.governanceScore < 0.82) {
      reasons.push('governance score below Gemini threshold');
    }

    if (metrics.incidentsOpen > 0) {
      reasons.push('open incidents present');
    }

    const mergeReady =
      overallScore >= this.config.mergeThreshold &&
      metrics.governanceScore >= 0.82 &&
      upliftMet &&
      metrics.incidentsOpen === 0;

    if (mergeReady) {
      reasons.push('merge conditions satisfied');
    }

    const requiresRollback =
      metrics.incidentsOpen > 0 || metrics.governanceScore < 0.6;

    if (requiresRollback && metrics.rollbackRef) {
      reasons.push(`rollback to ${metrics.rollbackRef}`);
    }

    if (overallScore < this.config.mergeThreshold) {
      reasons.push('overall score below merge threshold');
    }

    return { overallScore, mergeReady, requiresRollback, reasons };
  }

  buildTelemetrySnapshot(
    metrics: RoundMetrics,
    evaluation: RoundEvaluation,
    decision: TierDecision,
  ): GraphSnapshot {
    const nodes: GraphNode[] = [
      {
        id: `metric-${metrics.round}`,
        type: 'pipeline',
        data: {
          round: metrics.round,
          deltaQuality: metrics.deltaQuality,
          deltaVelocity: metrics.deltaVelocity,
          governanceScore: metrics.governanceScore,
          overallScore: evaluation.overallScore,
        },
      },
      {
        id: `governance-${metrics.round}`,
        type: 'policy',
        data: {
          status: metrics.governanceScore >= 0.82 ? 'pass' : 'fail',
          score: metrics.governanceScore,
          reasons: evaluation.reasons.filter((reason) =>
            reason.toLowerCase().includes('governance'),
          ),
        },
      },
    ];

    if (metrics.rollbackRef) {
      nodes.push({
        id: `rollback-${metrics.round}`,
        type: 'incident',
        data: {
          rollbackRef: metrics.rollbackRef,
          triggered: evaluation.requiresRollback,
        },
      });
    }

    const edges: GraphEdge[] = [
      {
        id: edgeId(nodes[0].id, 'GOVERNS', nodes[1].id),
        from: nodes[0].id,
        to: nodes[1].id,
        type: 'GOVERNS',
      },
    ];

    if (metrics.rollbackRef) {
      edges.push({
        id: edgeId(nodes[0].id, 'OCCURRED_IN', `rollback-${metrics.round}`),
        from: nodes[0].id,
        to: `rollback-${metrics.round}`,
        type: 'OCCURRED_IN',
      });
    }

    nodes.push({
      id: `decision-${metrics.round}`,
      type: 'stage',
      data: { tier: decision.tier, reasons: decision.reasons },
    });

    edges.push({
      id: edgeId(nodes[0].id, 'CONTAINS', `decision-${metrics.round}`),
      from: nodes[0].id,
      to: `decision-${metrics.round}`,
      type: 'CONTAINS',
    });

    return {
      generatedAt: new Date().toISOString(),
      version: metrics.round,
      nodes,
      edges,
      serviceRisk: {},
    };
  }
}

function edgeId(from: string, type: string, to: string): string {
  return `${from}:${type}:${to}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}
