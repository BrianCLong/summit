import { describe, expect, it } from '@jest/globals';

import { AgentRegistry } from '../../../src/agents/controlplane/registry/AgentRegistry.js';

describe('AgentRegistry', () => {
  it('registers and lists agents in stable lexical order', () => {
    const registry = new AgentRegistry();
    registry.register({
      id: 'z-agent',
      name: 'Zeta',
      capabilities: ['search'],
      tools: ['graph.query'],
      datasets: ['intel'],
      riskLevel: 'low',
      determinismScore: 0.9,
      observabilityScore: 0.9,
    });
    registry.register({
      id: 'a-agent',
      name: 'Alpha',
      capabilities: ['search'],
      tools: ['graph.query'],
      datasets: ['intel'],
      riskLevel: 'low',
      determinismScore: 0.8,
      observabilityScore: 0.8,
    });

    expect(registry.list().map((agent) => agent.id)).toEqual(['a-agent', 'z-agent']);
  });

  it('rejects capability-empty descriptors', () => {
    const registry = new AgentRegistry();

    expect(() =>
      registry.register({
        id: 'broken',
        name: 'Broken',
        capabilities: [],
        tools: [],
        datasets: [],
        riskLevel: 'low',
        determinismScore: 0,
        observabilityScore: 0,
      }),
    ).toThrow(/capabilities/i);
  });
});
