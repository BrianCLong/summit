import { resolvers } from '../../src/graphql/resolvers';
import { runNaturalLanguageProcessor } from '../../src/services/nlq/pythonBridge.js';

jest.mock('../../src/auth/context', () => ({
  getUser: jest.fn(() => ({ id: 'user-1', tenant: 'tenant-1', residency: 'us-east' }))
}));

jest.mock('../../src/policy/enforcer', () => ({
  policyEnforcer: { requirePurpose: jest.fn(() => Promise.resolve({ allow: true })) },
  Purpose: {},
  Action: {}
}));

jest.mock('../../src/db/neo4j', () => ({
  neo: {
    run: jest.fn(() =>
      Promise.resolve({
        records: [
          {
            toObject: () => ({
              node: {
                identity: { toString: () => '1' },
                labels: ['Person'],
                properties: { name: 'Alice', tenantId: 'tenant-1' }
              }
            })
          }
        ]
      })
    )
  }
}));

jest.mock('../../src/services/nlq/pythonBridge.js', () => ({
  runNaturalLanguageProcessor: jest.fn(() =>
    Promise.resolve({
      cypher: 'MATCH (node:Person) RETURN node LIMIT $limit',
      graphql: 'query EntitySearch {}',
      params: { limit: 5 },
      warnings: ['sanitized']
    })
  )
}));

jest.mock('../../src/metrics', () => ({
  gqlDuration: { startTimer: jest.fn(() => jest.fn()) },
  subscriptionFanoutLatency: { observe: jest.fn() }
}));

describe('naturalLanguageGraphSearch resolver', () => {
  it('executes python-backed translation and returns serialized rows', async () => {
    const context = {
      req: { ip: '127.0.0.1', get: () => 'jest' },
      purpose: 'investigation'
    } as any;

    const result = await resolvers.Query.naturalLanguageGraphSearch(
      null,
      { input: { prompt: 'Show people!!', tenantId: 'tenant-1', limit: 5 } },
      context
    );

    expect(result.cypher).toContain('MATCH (node:Person)');
    expect(result.rows).toHaveLength(1);
    expect((result.rows[0] as any).node.properties.name).toBe('Alice');
    expect(result.params).toMatchObject({ tenantId: 'tenant-1', limit: 5 });
    expect(result.warnings).toEqual(['sanitized']);

    expect(runNaturalLanguageProcessor).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'Show people!!', tenantId: 'tenant-1' })
    );

    const { neo } = jest.requireMock('../../src/db/neo4j');
    expect(neo.run).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ tenantId: 'tenant-1', limit: 5 }),
      { tenantId: 'tenant-1' }
    );
  });
});
