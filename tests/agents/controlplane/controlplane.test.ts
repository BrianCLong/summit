import { compileGraphContext } from '../../../src/graphrag/context-compiler/compileGraphContext.js';
import { evaluateAgentPolicy } from '../../../src/agents/controlplane/policy/agentPolicy.js';
import { selectAgent } from '../../../src/agents/controlplane/router/agentRouter.js';
import {
  AgentRegistry,
  type AgentDescriptor,
} from '../../../src/agents/controlplane/registry/agentRegistry.js';

describe('agent control plane scaffolding', () => {
  test('registers and lists agents', () => {
    const registry = new AgentRegistry();
    registry.register({
      id: 'analyst-a',
      name: 'Analyst A',
      capabilities: ['research'],
      tools: ['web-search'],
      riskLevel: 'low',
    });

    expect(registry.get('analyst-a')?.name).toBe('Analyst A');
    expect(registry.list()).toHaveLength(1);
  });

  test('selectAgent applies deterministic lexical tie-break', () => {
    const agents: AgentDescriptor[] = [
      {
        id: 'z-agent',
        name: 'Z Agent',
        capabilities: ['summarize'],
        tools: ['notes'],
        riskLevel: 'low',
      },
      {
        id: 'a-agent',
        name: 'A Agent',
        capabilities: ['summarize'],
        tools: ['notes'],
        riskLevel: 'low',
      },
    ];

    const selected = selectAgent({ type: 'summarize', riskBudget: 'medium' }, agents);
    expect(selected?.id).toBe('a-agent');
  });

  test('policy denies high-risk agent with low observability score', () => {
    const decision = evaluateAgentPolicy(
      {
        id: 'high-risk',
        name: 'High Risk',
        capabilities: ['triage'],
        tools: ['incident'],
        riskLevel: 'high',
        observabilityScore: 0.4,
      },
      ['triage'],
    );

    expect(decision.allow).toBe(false);
    expect(decision.reasons).toContain('OBSERVABILITY_SCORE_TOO_LOW');
  });

  test('graph context compiler emits deterministic evidence id', () => {
    const context = compileGraphContext({
      taskId: '1234',
      entities: ['task:1234', 'agent:a-agent'],
      policyScope: { datasets: ['internal'], tools: ['search'] },
    });

    expect(context.evidenceIds).toEqual(['EVD-AOT2026-CONTEXT-1234']);
    expect(context.allowedDatasets).toEqual(['internal']);
  });
});
