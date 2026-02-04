import { describe, it, expect } from '@jest/globals';
import { SynintMapper } from '../SynintMapper.js';

describe('SynintMapper', () => {
  it('maps whois findings into domain and registered-to edge', () => {
    const mapper = new SynintMapper({ sourceTag: 'synint' });
    const now = new Date().toISOString();

    const mutations = mapper.toMutations({
      target: 'example.com',
      startedAt: now,
      completedAt: now,
      agents: [
        {
          agentName: 'WhoisAgent',
          success: true,
          findings: {
            domain: 'example.com',
            registrantOrg: 'Example Org',
          },
        },
      ],
    });

    expect(
      mutations.some(
        (mutation) =>
          mutation.kind === 'upsertNode' &&
          mutation.node.id === 'domain:example.com',
      ),
    ).toBe(true);

    expect(
      mutations.some(
        (mutation) =>
          mutation.kind === 'upsertEdge' &&
          mutation.edge.type === 'REGISTERED_TO',
      ),
    ).toBe(true);
  });
});
