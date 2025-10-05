import { describe, expect, it, vi } from 'vitest';
import {
  buildFederatedDashboard,
  buildExplanationView,
  computePrivacyFitness,
  enrichThreatScenario
} from '../src/index.js';
import type {
  FederatedAnalysisPayload,
  FederatedAttributionExplanation
} from '../src/federated-attribution.js';
import type {
  FederatedAttributionSummary,
  FederatedThreatScenario
} from '../../common-types/src/index.js';

vi.mock('policy', () => ({
  computeWorkflowEstimates: () => ({ criticalPath: [], totalLatencyMs: 0, totalCostUSD: 0 }),
  topologicalSort: (workflow: { nodes: Array<{ id: string }> }) => ({ order: workflow.nodes.map(node => node.id) }),
  validateWorkflow: (workflow: unknown) => ({
    normalized: workflow,
    analysis: {
      estimated: { criticalPath: [] }
    },
    warnings: []
  })
}));

const summary: FederatedAttributionSummary = {
  totalEntities: 6,
  crossDomainLinks: [
    {
      source: 'actor-b',
      target: 'archive',
      confidence: 0.92,
      domains: ['intel', 'ops'],
      narrative: 'link one',
      privacyDelta: 0.3
    },
    {
      source: 'actor-a',
      target: 'ops-terminal',
      confidence: 0.68,
      domains: ['finance', 'ops'],
      narrative: 'link two',
      privacyDelta: 0.18
    }
  ],
  privacyDelta: 0.18,
  pamagScore: 0.81
} as const;

const scenario: FederatedThreatScenario = {
  actor: 'actor-a',
  pattern: 'multi-domain-lateral',
  severity: 'high',
  detectionConfidence: 0.91,
  recommendedActions: ['isolate-actor', 'audit-logs']
};

const analysis: FederatedAnalysisPayload = {
  tradeoff: {
    privacyScore: 0.79,
    utilityScore: 0.88,
    tradeoffIndex: 0.83,
    rationale: 'balanced'
  },
  threatScenarios: [scenario],
  modelDesign: {
    name: 'Privacy Adaptive Multi-layer Attribution Graph',
    novelty: 'federated provenance',
    claims: ['deterministic privacy budget']
  }
} as const;

const explanation: FederatedAttributionExplanation = {
  focus: 'actor-a',
  domains: ['finance', 'ops'],
  topFactors: [
    { label: 'cross-domain-density', weight: 0.6 },
    { label: 'pamag-score', weight: 0.4 }
  ],
  residualRisk: 0.22,
  supportingLinks: summary.crossDomainLinks
} as const;

describe('federated attribution dashboard', () => {
  it('computes enriched dashboard state with explanation', () => {
    const dashboard = buildFederatedDashboard({ summary, analysis, explanation });
    expect(dashboard.summary.crossDomainLinks[0].confidence).toBeGreaterThanOrEqual(
      dashboard.summary.crossDomainLinks[1].confidence
    );
    expect(dashboard.privacyFitness).toBeCloseTo(
      computePrivacyFitness(dashboard.summary, analysis.tradeoff)
    );
    expect(dashboard.modelDesign.name).toBe('Privacy Adaptive Multi-layer Attribution Graph');
    expect(dashboard.explanation?.recommendedActions).toContain('isolate-actor');
    expect(dashboard.explanation?.domainCoverage).toBeGreaterThan(0);
    expect(dashboard.threatScenarios[0].riskLevel).toBeGreaterThan(0.9);
  });

  it('builds explanation view independently', () => {
    const scenario = enrichThreatScenario(analysis.threatScenarios[0]);
    const view = buildExplanationView(explanation, [scenario]);
    expect(view.supportingLinks.length).toBe(2);
    expect(view.prioritizedFactors[0].contribution).toBeCloseTo(0.6);
    expect(view.recommendedActions).toEqual(['isolate-actor', 'audit-logs']);
  });
});
