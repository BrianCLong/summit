import { describe, expect, it } from 'vitest';
import type { PolicySimulationScenario } from 'common-types';
import { PolicyComplianceSimulator } from '../src/index.ts';

describe('PolicyComplianceSimulator', () => {
  const scenario: PolicySimulationScenario = {
    id: 'scenario-eu-shield',
    name: 'EU Data Residency Shield',
    description: 'Backtest policy controls against cross-region exports',
    change: {
      id: 'chg-eu-01',
      summary: 'Harden residency boundaries',
      type: 'policy',
      rationale: 'Ensure EU-regulated data stays within region',
      modifications: {
        denyCrossRegion: true,
        sandboxGraph: 'residency-v2'
      },
      tags: ['residency', 'regulation']
    },
    baselineRules: [
      {
        id: 'allow-analyst-export',
        description: 'Baseline export access for analysts',
        effect: 'allow',
        actions: ['dataset:exfiltrate'],
        resources: ['sensitive-dataset'],
        conditions: [
          { attribute: 'roles', operator: 'includes', value: ['analyst'] }
        ]
      },
      {
        id: 'allow-model-eval',
        description: 'Permit model evaluation for ml roles',
        effect: 'allow',
        actions: ['model:invoke'],
        resources: ['llm'],
        conditions: [
          { attribute: 'roles', operator: 'includes', value: ['ml'] },
          { attribute: 'region', operator: 'eq', value: 'us-east-1' }
        ]
      }
    ],
    proposedRules: [
      {
        id: 'deny-cross-region',
        description: 'Block export when region mismatch',
        effect: 'deny',
        actions: ['dataset:exfiltrate'],
        resources: ['sensitive-dataset'],
        conditions: [
          { attribute: 'region', operator: 'neq', value: 'us-east-1' }
        ]
      },
      {
        id: 'allow-analyst-in-region',
        description: 'Permit export when analyst remains in region',
        effect: 'allow',
        actions: ['dataset:exfiltrate'],
        resources: ['sensitive-dataset'],
        conditions: [
          { attribute: 'roles', operator: 'includes', value: ['analyst'] },
          { attribute: 'region', operator: 'eq', value: 'us-east-1' }
        ]
      },
      {
        id: 'allow-model-eval',
        description: 'Carry forward model evaluation access',
        effect: 'allow',
        actions: ['model:invoke'],
        resources: ['llm'],
        conditions: [
          { attribute: 'roles', operator: 'includes', value: ['ml'] }
        ]
      }
    ],
    graph: {
      nodes: [
        { id: 'n1', label: 'EU Data Lake', type: 'data', criticality: 0.9 },
        { id: 'n2', label: 'Policy API', type: 'system', criticality: 0.8 },
        { id: 'n3', label: 'Compliance Desk', type: 'control', criticality: 0.7 }
      ],
      edges: [
        { id: 'e1', from: 'n1', to: 'n2', relation: 'ingest', weight: 0.6, risk: 0.7 },
        { id: 'e2', from: 'n2', to: 'n3', relation: 'approval', weight: 0.8, risk: 0.4 }
      ]
    },
    workloads: [
      {
        id: 'export-event',
        name: 'Cross-region export attempt',
        action: 'dataset:exfiltrate',
        resource: 'sensitive-dataset',
        probability: 0.65,
        potentialLossUsd: 250000,
        compliancePenalty: 0.75,
        costUsd: 1800,
        detectionDifficulty: 0.6,
        context: {
          tenantId: 'tenant-eu',
          userId: 'user-1',
          roles: ['analyst'],
          region: 'eu-west-1',
          attributes: { nodeId: 'n1' }
        }
      },
      {
        id: 'model-eval',
        name: 'Model eval in region',
        action: 'model:invoke',
        resource: 'llm',
        probability: 0.45,
        potentialLossUsd: 50000,
        compliancePenalty: 0.25,
        costUsd: 420,
        detectionDifficulty: 0.3,
        context: {
          tenantId: 'tenant-eu',
          userId: 'user-ml',
          roles: ['ml'],
          region: 'us-east-1',
          attributes: { nodeId: 'n2' }
        }
      }
    ],
    agents: [
      {
        id: 'agent-sentinel',
        name: 'Ops Sentinel',
        role: 'Compliance Strategist',
        archetype: 'defender',
        effectiveness: 0.78,
        responsivenessMinutes: 35,
        costPerAction: 320,
        capacityPerHour: 14,
        traits: {
          automation: 0.68,
          focus: 0.55,
          'focus:sensitive-dataset': 0.82
        }
      },
      {
        id: 'agent-ledger',
        name: 'Ledger Twin',
        role: 'Audit partner',
        archetype: 'auditor',
        effectiveness: 0.66,
        responsivenessMinutes: 80,
        costPerAction: 190,
        capacityPerHour: 18,
        traits: {
          automation: 0.72,
          focus: 0.48,
          'focus:llm': 0.6
        }
      }
    ],
    assumptions: {
      iterations: 40,
      seed: 42,
      confidenceLevels: [0.5, 0.9]
    }
  };

  it('quantifies before/after risk and produces mitigation actions', () => {
    const simulator = new PolicyComplianceSimulator(scenario, {
      frameInterval: 5
    });
    const report = simulator.run();

    expect(report.baseline.averageRiskUsd).toBeGreaterThan(report.proposed.averageRiskUsd);
    expect(report.delta.riskDeltaUsd).toBeGreaterThan(0);
    expect(report.delta.complianceDelta).toBeGreaterThan(0);
    expect(report.mitigations.length).toBeGreaterThan(0);
    expect(report.mitigations[0].validationSteps.length).toBeGreaterThan(1);
    expect(report.testCases.length).toBe(scenario.workloads.length);
    expect(report.testCases[0].steps[0]).toContain('Seed sandbox graph');
    expect(report.frames.at(-1)?.iteration).toBe(40);
    expect(report.graphInsights.highRiskNodes).toContain('n1');
  });

  it('produces real-time frames with positive posture shift', () => {
    const simulator = new PolicyComplianceSimulator(scenario, {
      frameInterval: 4
    });
    const report = simulator.run();

    expect(report.frames.length).toBeGreaterThan(0);
    const finalFrame = report.frames.at(-1);
    expect(finalFrame?.delta.riskUsd).toBeGreaterThan(0);
    expect(finalFrame?.delta.postureShift).toBeGreaterThanOrEqual(-1);
    expect(report.proposed.scenarioScore).toBeGreaterThan(report.baseline.scenarioScore);
  });
});
