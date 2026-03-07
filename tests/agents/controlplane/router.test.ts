import { describe, expect, it } from '@jest/globals';

import { RouteSignals, routeTask } from '../../../src/agents/controlplane/router/routeTask.js';

const task = {
  id: 'task-1',
  type: 'summarize',
  requiredCapabilities: ['summarize'],
  requiredTools: ['graph.query'],
  requiredDatasets: ['intel'],
  riskBudget: 'medium' as const,
  requiresApproval: false,
  latencyBudgetMs: 50,
  costBudgetUsd: 0.2,
};

const candidates = [
  {
    id: 'agent-b',
    name: 'Agent B',
    capabilities: ['summarize'],
    tools: ['graph.query'],
    datasets: ['intel'],
    riskLevel: 'medium' as const,
    determinismScore: 0.9,
    observabilityScore: 0.8,
  },
  {
    id: 'agent-a',
    name: 'Agent A',
    capabilities: ['summarize'],
    tools: ['graph.query'],
    datasets: ['intel'],
    riskLevel: 'medium' as const,
    determinismScore: 0.9,
    observabilityScore: 0.8,
  },
];

const neutralSignals: RouteSignals = {
  capabilityConfidence: () => 0.8,
  graphRelevance: () => 0.8,
  priorSuccessRate: () => 0.8,
  latencyFitness: () => 0.8,
  costFitness: () => 0.8,
  determinismScore: (agent) => agent.determinismScore,
  observabilityScore: (agent) => agent.observabilityScore,
  blastRadiusScore: () => 0,
  marginalCost: () => 0,
  queueDepth: () => 0,
};

describe('routeTask', () => {
  it('selects lexical-first agent under complete tie', () => {
    const first = routeTask(task, candidates, neutralSignals);
    const second = routeTask(task, candidates, neutralSignals);

    expect(first.selectedAgentId).toBe('agent-a');
    expect(first).toEqual(second);
  });

  it('returns policy denial reasons when no agent is eligible', () => {
    const denied = routeTask({ ...task, requiredTools: ['forbidden.tool'] }, candidates, neutralSignals);
    expect(denied.selectedAgentId).toBeNull();
    expect(denied.denialReasons).toContain('TOOL_SCOPE_DENIED');
  });
});
