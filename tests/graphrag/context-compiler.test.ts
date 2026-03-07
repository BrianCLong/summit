import { describe, expect, it } from '@jest/globals';

import { compileGraphContext } from '../../src/graphrag/context-compiler/compileGraphContext.js';

describe('compileGraphContext', () => {
  it('compiles a policy-filtered context package', async () => {
    const context = await compileGraphContext({
      id: 't1',
      type: 'triage',
      requiredCapabilities: ['triage'],
      requiredTools: ['graph.query'],
      requiredDatasets: ['intel'],
      riskBudget: 'medium',
      requiresApproval: false,
      latencyBudgetMs: 50,
      costBudgetUsd: 0.2,
    });

    expect(context.allowedDatasets).toEqual(['intel']);
    expect(context.allowedTools).toEqual(['graph.query']);
    expect(context.evidenceIds[0]).toContain('EVD-AFCP-KG');
  });
});
