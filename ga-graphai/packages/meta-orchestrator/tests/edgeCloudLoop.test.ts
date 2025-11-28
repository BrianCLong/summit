import { describe, expect, it } from 'vitest';
import {
  EdgeCloudLoopController,
  type EdgeCloudLoopConfig,
  type ExecutionSignal,
  type RoundMetrics,
} from '../src/index.js';

const config: EdgeCloudLoopConfig = {
  perceptionSloMs: 200,
  planSloMs: 800,
  governanceBacklogThreshold: 5,
  cloudQueueBackpressurePct: 70,
  mergeThreshold: 82,
  targetUpliftPercent: 40,
};

function controller(): EdgeCloudLoopController {
  return new EdgeCloudLoopController(config);
}

describe('EdgeCloudLoopController', () => {
  it('prefers edge for simple, low-latency work', () => {
    const signal: ExecutionSignal = {
      perceptionLatencyMs: 120,
      planningLatencyMs: 400,
      cloudQueueDepthPct: 30,
      governancePending: 1,
      changeComplexity: 'low',
      complianceRisk: 'low',
    };

    const decision = controller().chooseExecutionTier(signal);

    expect(decision.tier).toBe('edge');
    expect(decision.reasons.some((reason) => reason.includes('edge preference'))).toBe(
      true,
    );
  });

  it('promotes to cloud when latency or compliance risk is high', () => {
    const signal: ExecutionSignal = {
      perceptionLatencyMs: 250,
      planningLatencyMs: 900,
      cloudQueueDepthPct: 20,
      governancePending: 0,
      changeComplexity: 'medium',
      complianceRisk: 'high',
    };

    const decision = controller().chooseExecutionTier(signal);

    expect(decision.tier).toBe('cloud');
    expect(decision.reasons).toContain('perception latency breach');
    expect(decision.reasons).toContain('high compliance risk');
  });

  it('avoids cloud when queue is saturated even if complexity is high', () => {
    const signal: ExecutionSignal = {
      perceptionLatencyMs: 150,
      planningLatencyMs: 600,
      cloudQueueDepthPct: 90,
      governancePending: 0,
      changeComplexity: 'high',
      complianceRisk: 'medium',
    };

    const decision = controller().chooseExecutionTier(signal);

    expect(decision.tier).toBe('edge');
    expect(
      decision.reasons.some((reason) => reason.includes('cloud queue saturated')),
    ).toBe(true);
  });

  it('declares merge-ready when uplift, governance, and score targets are met', () => {
    const metrics: RoundMetrics = {
      round: 3,
      deltaQuality: 50,
      deltaVelocity: 45,
      governanceScore: 0.9,
      incidentsOpen: 0,
    };

    const evaluation = controller().evaluateRound(metrics);

    expect(evaluation.mergeReady).toBe(true);
    expect(evaluation.requiresRollback).toBe(false);
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(82);
  });

  it('triggers rollback guidance when incidents are open', () => {
    const metrics: RoundMetrics = {
      round: 7,
      deltaQuality: 10,
      deltaVelocity: 5,
      governanceScore: 0.55,
      incidentsOpen: 1,
      rollbackRef: 'metric-6',
    };

    const evaluation = controller().evaluateRound(metrics);

    expect(evaluation.mergeReady).toBe(false);
    expect(evaluation.requiresRollback).toBe(true);
    expect(evaluation.reasons.some((reason) => reason.includes('rollback'))).toBe(
      true,
    );
  });

  it('emits Neo4j-friendly telemetry snapshot', () => {
    const metrics: RoundMetrics = {
      round: 5,
      deltaQuality: 30,
      deltaVelocity: 20,
      governanceScore: 0.88,
      incidentsOpen: 0,
    };

    const evaluation = controller().evaluateRound(metrics);
    const decision = controller().chooseExecutionTier({
      perceptionLatencyMs: 100,
      planningLatencyMs: 400,
      cloudQueueDepthPct: 15,
      governancePending: 0,
      changeComplexity: 'low',
      complianceRisk: 'low',
    });

    const snapshot = controller().buildTelemetrySnapshot(metrics, evaluation, decision);

    expect(snapshot.nodes.find((node) => node.id === 'metric-5')).toBeDefined();
    expect(snapshot.nodes.find((node) => node.id === 'governance-5')).toBeDefined();
    expect(snapshot.nodes.find((node) => node.id === 'decision-5')).toBeDefined();
    expect(snapshot.edges.length).toBeGreaterThanOrEqual(2);
  });
});
