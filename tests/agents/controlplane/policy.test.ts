import { describe, expect, it } from '@jest/globals';

import { evaluatePolicy } from '../../../src/agents/controlplane/policy/PolicyDecisionPoint.js';

const baseAgent = {
  id: 'agent-1',
  name: 'Agent One',
  capabilities: ['summarize'],
  tools: ['graph.query'],
  datasets: ['intel'],
  riskLevel: 'medium' as const,
  determinismScore: 0.8,
  observabilityScore: 0.8,
};

const baseTask = {
  id: 'task-1',
  type: 'summarize',
  requiredCapabilities: ['summarize'],
  requiredTools: ['graph.query'],
  requiredDatasets: ['intel'],
  riskBudget: 'medium' as const,
  requiresApproval: false,
  latencyBudgetMs: 50,
  costBudgetUsd: 0.1,
};

describe('PolicyDecisionPoint', () => {
  it('allows a compatible task-agent pair', () => {
    expect(evaluatePolicy(baseAgent, baseTask)).toEqual({ allow: true, reasons: [] });
  });

  it('denies high-risk tasks without required approval', () => {
    const decision = evaluatePolicy(baseAgent, { ...baseTask, riskBudget: 'high', requiresApproval: false });
    expect(decision.allow).toBe(false);
    expect(decision.reasons).toContain('HIGH_RISK_REQUIRES_APPROVAL');
  });
});
