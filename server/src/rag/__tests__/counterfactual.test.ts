import { jest, describe, beforeEach, test, expect } from '@jest/globals';

// Define mocks before imports
const mockNeoRun = jest.fn();
const mockPgManyOrNone = jest.fn().mockResolvedValue([]);

jest.unstable_mockModule('../../db/neo4j.js', () => ({
  neo: {
    run: mockNeoRun
  }
}));

jest.unstable_mockModule('../../db/pg.js', () => ({
  pg: {
    manyOrNone: mockPgManyOrNone
  }
}));

// Dynamic imports
const { KnowledgeFabricRetrievalService } = await import('../retrieval.js');
const { CypherGuard } = await import('../cypherInvariance.js');
// Import the mocked module to access the mock function if needed,
// but we can also use the closure variable mockNeoRun which IS accessible
// because unstable_mockModule factory IS executed in scope (unlike jest.mock hoist)
// actually wait, unstable_mockModule factory is also sandboxed/hoisted?
// No, unstable_mockModule is NOT hoisted automatically in the same way, but it must be called before import.
// Using closure variable is safer if we define it in the factory scope or globally?
// Actually jest.unstable_mockModule documentation says:
// "The factory function returns a Promise that resolves to the module namespace object."
// We can use variables if we are careful.

// Let's rely on importing the mock back.
const { neo } = await import('../../db/neo4j.js');

describe('Counterfactual Reasoning & Evidence Contracts', () => {
  let service: any; // Type as any or generic to avoid strict type issues with dynamic import
  const mockLogger = { error: jest.fn(), info: jest.fn() };

  beforeEach(() => {
    service = new KnowledgeFabricRetrievalService(mockLogger as any);
    jest.clearAllMocks();
  });

  test('Should enforce Cypher invariants (Shape Invariance)', () => {
    const rawQuery = "MATCH (n) RETURN n";
    const safeQuery = CypherGuard.enforceInvariants(rawQuery, { strict: false, defaultLimit: 10 });

    expect(safeQuery).toContain('LIMIT 10');
    expect(safeQuery).not.toContain('ORDER BY'); // Not strict, so just warning/missing
  });

  test('Should throw error on invariant violation in strict mode', () => {
    const rawQuery = "MATCH (n) RETURN n";
    expect(() => {
      CypherGuard.enforceInvariants(rawQuery, { strict: true, defaultLimit: 10 });
    }).toThrow('Invariant Violation');
  });

  test('Should return an Evidence Bundle with manifest', async () => {
    // Mock Neo4j response
    (neo.run as any).mockResolvedValue({
      records: []
    });

    const result = await service.search({
      tenantId: 't1',
      queryText: 'test',
      filters: { entityIds: ['e1'] }
    });

    expect(result.results.length).toBeGreaterThan(0);
    const contract = result.results[0];

    // Check Evidence Contract Fields
    expect(contract.schemaVersion).toBe('1.0.0');
    expect(contract.manifest).toBeDefined();
    expect(contract.manifest.strategy).toBe('HYBRID');
    expect(contract.manifest.sources).toContain('neo4j:knowledge_graph');
  });

  test('Counterfactual Simulation: Removing a node changes the evidence hash', async () => {
    // This test simulates a "What if X was missing?" scenario by manipulating the mock return

    const mockRecord1 = {
      get: (key: string) => {
        if (key === 'n') return { properties: { id: 'n1', pageRank: 0.5 }, labels: ['Person'], identity: { toString: () => 'n1' } };
        if (key === 'm') return { properties: { id: 'm1', pageRank: 0.2 }, labels: ['Location'], identity: { toString: () => 'm1' } };
        if (key === 'r') return { identity: { toString: () => 'r1' }, start: { toString: () => 'n1' }, end: { toString: () => 'm1' }, type: 'LIVES_IN', properties: {} };
        return null;
      }
    };

    // Run 1: Full Graph
    (neo.run as any).mockResolvedValueOnce({
      records: [mockRecord1]
    });
    const result1 = await service.search({ tenantId: 't1', queryText: 'test', filters: { entityIds: ['n1'] } });
    const evidence1 = result1.results[0].graphEvidence;

    // Run 2: Counterfactual (Node m1 is missing)
    const mockRecord2 = {
        get: (key: string) => {
          if (key === 'n') return { properties: { id: 'n1', pageRank: 0.5 }, labels: ['Person'], identity: { toString: () => 'n1' } };
          if (key === 'm') return null; // m1 is gone
          if (key === 'r') return null; // relationship is gone
          return null;
        }
    };
    (neo.run as any).mockResolvedValueOnce({
        records: [mockRecord2]
    });
    const result2 = await service.search({ tenantId: 't1', queryText: 'test', filters: { entityIds: ['n1'] } });
    const evidence2 = result2.results[0].graphEvidence;

    expect(evidence1?.nodes.length).toBe(2);
    expect(evidence2?.nodes.length).toBe(1);

    expect(evidence1).not.toEqual(evidence2);
  });
});
