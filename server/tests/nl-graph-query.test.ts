/**
 * NL Graph Query Copilot - Test Suite
 *
 * Tests the Query Cookbook patterns and core functionality.
 */

import { NlGraphQueryService } from '../src/ai/nl-graph-query/nl-graph-query.service.js';
import type {
  CompileRequest,
  CompileResponse,
  CompileError,
  SchemaContext,
} from '../src/ai/nl-graph-query/types.js';
import { validateCypher, extractRequiredParameters, isReadOnlyQuery } from '../src/ai/nl-graph-query/validator.js';
import { estimateQueryCost } from '../src/ai/nl-graph-query/cost-estimator.js';
import { explainQuery, summarizeQuery } from '../src/ai/nl-graph-query/explainer.js';

describe('NlGraphQueryService', () => {
  let service: NlGraphQueryService;
  let baseContext: SchemaContext;

  beforeEach(() => {
    service = new NlGraphQueryService();
    baseContext = {
      nodeLabels: ['Entity', 'Person', 'Organization', 'Event', 'Location'],
      relationshipTypes: ['KNOWS', 'WORKS_FOR', 'LOCATED_AT', 'ATTENDED'],
      tenantId: 'test-tenant',
      userId: 'test-user',
    };
  });

  afterEach(() => {
    service.shutdown();
  });

  // Helper to check if result is a successful compilation
  const isSuccess = (result: CompileResponse | CompileError): result is CompileResponse => {
    return 'cypher' in result;
  };

  describe('Basic Query Patterns', () => {
    test('compiles "show all nodes" query', async () => {
      const result = await service.compile({
        prompt: 'show all nodes',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.cypher).toContain('MATCH (n)');
        expect(result.cypher).toContain('RETURN');
        expect(result.cypher).toContain('LIMIT');
        expect(result.isSafe).toBe(true);
        expect(result.estimatedCost.costClass).toBe('low');
      }
    });

    test('compiles "count nodes" query', async () => {
      const result = await service.compile({
        prompt: 'count nodes',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.cypher).toContain('count(n)');
        expect(result.estimatedCost.costClass).toBe('low');
      }
    });

    test('compiles "show relationships" query', async () => {
      const result = await service.compile({
        prompt: 'show all relationships',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.cypher).toMatch(/MATCH.*-\[.*\]->/);
      }
    });

    test('compiles "find neighbors" query', async () => {
      const result = await service.compile({
        prompt: 'show neighbors of node123',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.cypher).toContain('MATCH');
        expect(result.requiredParameters).toContain('nodeId');
      }
    });
  });

  describe('Time-Travel Queries', () => {
    test('compiles time-travel snapshot query', async () => {
      const result = await service.compile({
        prompt: 'show graph state at 2024-01-15',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.cypher).toContain('validFrom');
        expect(result.cypher).toContain('validTo');
        expect(result.requiredParameters).toContain('timestamp');
      }
    });

    test('compiles time-travel changes query', async () => {
      const result = await service.compile({
        prompt: 'show changes between 2024-01-01 and 2024-01-31',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.requiredParameters).toContain('startTime');
        expect(result.requiredParameters).toContain('endTime');
      }
    });
  });

  describe('Path Queries (COA)', () => {
    test('compiles shortest path query', async () => {
      const result = await service.compile({
        prompt: 'shortest path from nodeA to nodeB',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.cypher).toContain('shortestPath');
        expect(result.requiredParameters).toContain('startId');
        expect(result.requiredParameters).toContain('endId');
        expect(['high', 'very-high']).toContain(result.estimatedCost.costClass);
      }
    });

    test('compiles path analysis query', async () => {
      const result = await service.compile({
        prompt: 'find paths from entityA to entityB',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.cypher).toContain('allShortestPaths');
      }
    });
  });

  describe('Cost Estimation', () => {
    test('estimates low cost for simple queries', async () => {
      const result = await service.compile({
        prompt: 'count nodes',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.estimatedCost.costClass).toBe('low');
        expect(result.estimatedCost.estimatedTimeMs).toBeLessThan(200);
      }
    });

    test('estimates high cost for path queries', async () => {
      const result = await service.compile({
        prompt: 'find paths from A to B',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(['high', 'very-high']).toContain(result.estimatedCost.costClass);
      }
    });
  });

  describe('Validation', () => {
    test('rejects empty prompt', async () => {
      const result = await service.compile({
        prompt: '',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(false);
      if (!isSuccess(result)) {
        expect(result.code).toBe('INVALID_INPUT');
      }
    });

    test('rejects prompt that is too long', async () => {
      const result = await service.compile({
        prompt: 'a'.repeat(1001),
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(false);
      if (!isSuccess(result)) {
        expect(result.code).toBe('INVALID_INPUT');
      }
    });

    test('returns error for unrecognized pattern', async () => {
      const result = await service.compile({
        prompt: 'foobar bazqux nonexistent pattern xyz',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(false);
      if (!isSuccess(result)) {
        expect(result.code).toBe('GENERATION_FAILED');
        expect(result.suggestions.length).toBeGreaterThan(0);
      }
    });

    test('detects injection attempts', async () => {
      const result = await service.compile({
        prompt: 'show nodes; DROP DATABASE',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(false);
      if (!isSuccess(result)) {
        expect(result.code).toBe('INVALID_INPUT');
      }
    });
  });

  describe('Caching', () => {
    test('caches compilation results', async () => {
      const request: CompileRequest = {
        prompt: 'show all nodes',
        schemaContext: baseContext,
      };

      const result1 = await service.compile(request);
      const result2 = await service.compile(request);

      expect(isSuccess(result1)).toBe(true);
      expect(isSuccess(result2)).toBe(true);

      // Same queryId means it was cached
      if (isSuccess(result1) && isSuccess(result2)) {
        expect(result1.queryId).toBe(result2.queryId);
      }
    });

    test('clears cache on demand', async () => {
      await service.compile({
        prompt: 'show all nodes',
        schemaContext: baseContext,
      });

      expect(service.getCacheStats().size).toBeGreaterThan(0);

      service.clearCache();
      expect(service.getCacheStats().size).toBe(0);
    });
  });

  describe('Service Information', () => {
    test('returns available patterns', () => {
      const patterns = service.getAvailablePatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('name');
      expect(patterns[0]).toHaveProperty('description');
      expect(patterns[0]).toHaveProperty('expectedCost');
    });

    test('provides cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(stats).toHaveProperty('ttlMs');
    });
  });

  describe('Fuzzy Matching', () => {
    test('handles "list nodes" variation', async () => {
      const result = await service.compile({
        prompt: 'list nodes',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.cypher).toContain('MATCH (n)');
      }
    });

    test('handles "how many nodes" variation', async () => {
      const result = await service.compile({
        prompt: 'how many nodes are there',
        schemaContext: baseContext,
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.cypher).toContain('count');
      }
    });
  });

  describe('Tenant Filtering', () => {
    test('applies tenant filter when tenantId is present', async () => {
      const result = await service.compile({
        prompt: 'show all nodes',
        schemaContext: { ...baseContext, tenantId: 'tenant-123' },
      });

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.cypher).toContain('tenantId');
        expect(result.cypher).toContain('$tenantId');
      }
    });
  });
});

describe('Cypher Validator', () => {
  test('validates correct Cypher', () => {
    const result = validateCypher('MATCH (n) RETURN n LIMIT 25');
    expect(result.isValid).toBe(true);
    expect(result.syntaxErrors).toHaveLength(0);
  });

  test('detects empty query', () => {
    const result = validateCypher('');
    expect(result.isValid).toBe(false);
    expect(result.syntaxErrors).toContain('Empty query');
  });

  test('detects unbalanced parentheses', () => {
    const result = validateCypher('MATCH (n RETURN n');
    expect(result.isValid).toBe(false);
    expect(result.syntaxErrors.some((e) => e.includes('parentheses'))).toBe(true);
  });

  test('detects dangerous DELETE operation', () => {
    const result = validateCypher('MATCH (n) DELETE n');
    expect(result.isValid).toBe(false);
    expect(result.securityIssues.some((e) => e.includes('DELETE'))).toBe(true);
  });

  test('warns about missing LIMIT', () => {
    const result = validateCypher('MATCH (n) RETURN n');
    expect(result.isValid).toBe(true);
    expect(result.warnings.some((w) => w.includes('LIMIT'))).toBe(true);
  });

  test('identifies read-only queries', () => {
    expect(isReadOnlyQuery('MATCH (n) RETURN n')).toBe(true);
    expect(isReadOnlyQuery('CREATE (n:Person)')).toBe(false);
    expect(isReadOnlyQuery('MATCH (n) SET n.name = "test"')).toBe(false);
    expect(isReadOnlyQuery('MATCH (n) DELETE n')).toBe(false);
  });

  test('extracts required parameters', () => {
    const params = extractRequiredParameters('MATCH (n) WHERE n.id = $nodeId AND n.type = $nodeType RETURN n');
    expect(params).toContain('nodeId');
    expect(params).toContain('nodeType');
    expect(params).toHaveLength(2);
  });
});

describe('Cost Estimator', () => {
  test('estimates low cost for simple query', () => {
    const cost = estimateQueryCost('MATCH (n) RETURN count(n)');
    expect(cost.costClass).toBe('low');
  });

  test('estimates high cost for variable-length paths', () => {
    const cost = estimateQueryCost('MATCH p = (a)-[*..5]-(b) RETURN p');
    expect(['high', 'very-high']).toContain(cost.costClass);
    expect(cost.costDrivers.some((d) => d.includes('path'))).toBe(true);
  });

  test('estimates very high cost for allShortestPaths', () => {
    const cost = estimateQueryCost('MATCH p = allShortestPaths((a)-[*]-(b)) RETURN p');
    expect(cost.costClass).toBe('very-high');
  });

  test('reduces cost estimate for indexed properties', () => {
    const indexedCost = estimateQueryCost('MATCH (n) WHERE n.id = $id RETURN n LIMIT 10');
    const unindexedCost = estimateQueryCost('MATCH (n) WHERE n.name = $name RETURN n LIMIT 10');
    expect(indexedCost.nodesScanned).toBeLessThan(unindexedCost.nodesScanned);
  });

  test('includes cost drivers in output', () => {
    const cost = estimateQueryCost('MATCH (n) RETURN n');
    expect(cost.costDrivers).toBeDefined();
    expect(Array.isArray(cost.costDrivers)).toBe(true);
  });
});

describe('Query Explainer', () => {
  test('generates summary for simple query', () => {
    const summary = summarizeQuery('MATCH (n) RETURN n LIMIT 25');
    expect(summary).toBeTruthy();
    expect(summary.length).toBeGreaterThan(10);
    expect(summary.length).toBeLessThan(200);
  });

  test('generates detailed explanation', () => {
    const explanation = explainQuery('MATCH (n)-[r]->(m) WHERE n.id = $id RETURN n, r, m', true);
    expect(explanation).toContain('---');
    expect(explanation.length).toBeGreaterThan(100);
  });

  test('mentions path operations in explanation', () => {
    const explanation = explainQuery('MATCH p = shortestPath((a)-[*]-(b)) RETURN p');
    expect(explanation.toLowerCase()).toContain('shortest');
  });

  test('mentions aggregations in explanation', () => {
    const explanation = explainQuery('MATCH (n) RETURN count(n)');
    expect(explanation.toLowerCase()).toContain('count');
  });
});

describe('No Side Effects', () => {
  test('service has no database dependencies', async () => {
    const service = new NlGraphQueryService();

    // Compile should work without any database connection
    const result = await service.compile({
      prompt: 'show all nodes',
      schemaContext: { tenantId: 'test' },
    });

    expect('cypher' in result).toBe(true);
    service.shutdown();
  });

  test('compilation is pure - no execution', async () => {
    const service = new NlGraphQueryService();

    const result = await service.compile({
      prompt: 'show all nodes',
      schemaContext: { tenantId: 'test' },
    });

    expect('cypher' in result).toBe(true);
    if ('cypher' in result) {
      // The result is just a string - it was never executed
      expect(typeof result.cypher).toBe('string');
    }

    service.shutdown();
  });
});
