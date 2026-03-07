import { describe, expect, it } from '@jest/globals';

import { routeTask } from '../../../src/agents/controlplane/router/routeTask.js';

const candidate = {
  id: 'agent-safe',
  name: 'Safe Agent',
  capabilities: ['summarize'],
  tools: ['graph.query'],
  datasets: ['internal'],
  riskLevel: 'low' as const,
  determinismScore: 1,
  observabilityScore: 1,
};

describe('deny fixtures', () => {
  it('denies tasks with restricted dataset outside agent scope', () => {
    const decision = routeTask(
      {
        id: 'task-sensitive',
        type: 'summarize',
        requiredCapabilities: ['summarize'],
        requiredTools: ['graph.query'],
        requiredDatasets: ['restricted-dataset'],
        riskBudget: 'low',
        requiresApproval: true,
        latencyBudgetMs: 20,
        costBudgetUsd: 0.1,
      },
      [candidate],
    );

    expect(decision.selectedAgentId).toBeNull();
    expect(decision.denialReasons).toContain('DATASET_SCOPE_DENIED');
  });
});
