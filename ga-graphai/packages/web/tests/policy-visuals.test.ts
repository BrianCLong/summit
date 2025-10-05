import { describe, expect, it } from 'vitest';
import type {
  PolicySimulationReport,
  PolicySimulationMetrics,
  PolicySimulationFrame,
  PolicyMitigationAction
} from 'common-types';
import {
  buildImpactSparkline,
  buildComplianceMatrix,
  buildScenarioStoryboard
} from '../src/index';

function metrics(partial: Partial<PolicySimulationMetrics>): PolicySimulationMetrics {
  return {
    averageRiskUsd: 120000,
    riskP95Usd: 240000,
    costUsd: 6000,
    compliancePosture: 'guarded',
    approvalsRequired: 3,
    mitigatedRiskUsd: 40000,
    incidentProbability: 0.18,
    scenarioScore: 55,
    ...partial
  };
}

describe('policy visuals', () => {
  const frames: PolicySimulationFrame[] = [
    {
      iteration: 1,
      baseline: { cumulativeRiskUsd: 80000, cumulativeCostUsd: 3000, incidentRate: 0.2, postureScore: 0.45 },
      proposed: { cumulativeRiskUsd: 50000, cumulativeCostUsd: 2600, incidentRate: 0.12, postureScore: 0.6 },
      delta: { riskUsd: 30000, costUsd: 400, postureShift: 0.15 }
    },
    {
      iteration: 2,
      baseline: { cumulativeRiskUsd: 150000, cumulativeCostUsd: 6100, incidentRate: 0.22, postureScore: 0.48 },
      proposed: { cumulativeRiskUsd: 90000, cumulativeCostUsd: 5200, incidentRate: 0.14, postureScore: 0.63 },
      delta: { riskUsd: 60000, costUsd: 900, postureShift: 0.15 }
    },
    {
      iteration: 3,
      baseline: { cumulativeRiskUsd: 220000, cumulativeCostUsd: 9100, incidentRate: 0.24, postureScore: 0.5 },
      proposed: { cumulativeRiskUsd: 120000, cumulativeCostUsd: 7700, incidentRate: 0.16, postureScore: 0.66 },
      delta: { riskUsd: 100000, costUsd: 1400, postureShift: 0.16 }
    }
  ];
  const mitigations: PolicyMitigationAction[] = [
    {
      id: 'mit-1',
      agentId: 'agent-x',
      description: 'Deploy sentinel automation',
      expectedRiskReductionUsd: 70000,
      residualRiskUsd: 30000,
      automationCandidate: true,
      coverage: 0.7,
      playbook: 'Playbook',
      validationSteps: ['step1', 'step2']
    }
  ];
  const report: PolicySimulationReport = {
    baseline: metrics({ averageRiskUsd: 90000, costUsd: 3200, scenarioScore: 52, incidentProbability: 0.2 }),
    proposed: metrics({ averageRiskUsd: 45000, costUsd: 2500, scenarioScore: 76, incidentProbability: 0.12, compliancePosture: 'resilient' }),
    delta: { riskDeltaUsd: 45000, costDeltaUsd: 700, complianceDelta: 24, incidentDelta: 0.08 },
    mitigations,
    testCases: [],
    frames,
    graphInsights: {
      highRiskNodes: ['n1', 'n2'],
      chokePoints: ['n1->n2'],
      sandboxFindings: [
        { eventId: 'export', postureLiftUsd: 54000, baselineRiskUsd: 90000, proposedRiskUsd: 36000, occurrences: 5, recommendedAgentId: 'agent-x', nodeId: 'n1', automationCandidate: true }
      ]
    },
    agents: [],
    workloads: []
  };

  it('builds smoothed sparkline data', () => {
    const sparkline = buildImpactSparkline(report);
    expect(sparkline).toHaveLength(frames.length);
    expect(sparkline[0].smoothedRiskDelta).toBeCloseTo(63333.33, 0);
    expect(sparkline.at(-1)?.smoothedRiskDelta).toBeGreaterThan(60000);
  });

  it('builds compliance matrix cells', () => {
    const matrix = buildComplianceMatrix(report);
    expect(matrix).toHaveLength(4);
    const postureCell = matrix.find(cell => cell.metric === 'posture');
    expect(postureCell?.delta).toBe(24);
    const incidentCell = matrix.find(cell => cell.metric === 'incident');
    expect(incidentCell?.delta).toBeCloseTo(0.08, 3);
  });

  it('generates storyboard frames with mitigation context', () => {
    const storyboard = buildScenarioStoryboard(report);
    expect(storyboard.length).toBeGreaterThan(0);
    expect(storyboard[0].keyFindings[0]).toContain('High-risk nodes');
    expect(storyboard.at(-1)?.title).toBe('Policy steady-state');
  });
});
