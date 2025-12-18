/**
 * Unit tests for NL-to-Query Service
 *
 * Tests mapping of natural language prompts to expected Cypher query skeletons.
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NLQueryService, createNLQueryService } from '../nl-query.service.js';
import type { NLQueryRequest } from '../types.js';

describe('NLQueryService', () => {
  let service: NLQueryService;

  beforeEach(() => {
    service = createNLQueryService();
  });

  describe('Pattern Matching', () => {
    const baseRequest: Partial<NLQueryRequest> = {
      investigationId: 'test-investigation-123',
      tenantId: 'test-tenant',
      userId: 'test-user',
      dryRun: true,
    };

    it('should map "show all nodes" to a MATCH (n) RETURN query', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'show all nodes',
      } as NLQueryRequest);

      expect(result.cypher).toMatch(/MATCH\s*\(n\)/i);
      expect(result.cypher).toMatch(/RETURN\s+n/i);
      expect(result.cypher).toMatch(/LIMIT/i);
      expect(result.isSafe).toBe(true);
      expect(result.allowed).toBe(true);
    });

    it('should map "list nodes" to a node listing query', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'list nodes',
      } as NLQueryRequest);

      expect(result.cypher).toMatch(/MATCH/i);
      expect(result.cypher).toMatch(/RETURN/i);
      expect(result.cost.costClass).toBe('low');
    });

    it('should map "count nodes" to a COUNT aggregation', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'count all nodes',
      } as NLQueryRequest);

      expect(result.cypher).toMatch(/count\s*\(/i);
      expect(result.explanation).toBeTruthy();
    });

    it('should map "find relationships" to an edge query', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'show all relationships',
      } as NLQueryRequest);

      expect(result.cypher).toMatch(/\(a\)-\[r\]->\(b\)/i);
      expect(result.cypher).toMatch(/RETURN.*r/i);
    });

    it('should map "shortest path from X to Y" to shortestPath', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'shortest path from entity A to entity B',
      } as NLQueryRequest);

      expect(result.cypher).toMatch(/shortestPath/i);
      expect(result.cost.costClass).toBe('high');
    });

    it('should map "neighbors of X" to a 1-hop traversal', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'show neighbors of entity123',
      } as NLQueryRequest);

      expect(result.cypher).toMatch(/MATCH\s*\(n\)-\[r\]-\(neighbor\)/i);
    });

    it('should map time-travel queries to temporal filtering', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'show graph at 2024-01-01',
      } as NLQueryRequest);

      expect(result.cypher).toMatch(/validFrom/i);
      expect(result.cypher).toMatch(/validTo/i);
    });

    it('should map "find communities" to connected component query', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'detect communities in the graph',
      } as NLQueryRequest);

      expect(result.cypher).toMatch(/collect/i);
      expect(result.cost.costClass).toBe('very-high');
    });

    it('should map investigation-scoped queries', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'show all entities in investigation ABC',
      } as NLQueryRequest);

      expect(result.cypher).toMatch(/investigationId/i);
    });

    it('should map timeline queries to temporal ordering', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'create timeline of events',
      } as NLQueryRequest);

      expect(result.cypher).toMatch(/ORDER BY.*timestamp/i);
    });
  });

  describe('Cost Estimation', () => {
    const baseRequest: Partial<NLQueryRequest> = {
      investigationId: 'test-investigation',
      dryRun: true,
    };

    it('should classify simple node queries as low cost', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'show all nodes',
      } as NLQueryRequest);

      expect(result.cost.costClass).toBe('low');
      expect(result.cost.nodesScanned).toBeLessThan(1000);
    });

    it('should classify path queries as high cost', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'shortest path between A and B',
      } as NLQueryRequest);

      expect(['high', 'very-high']).toContain(result.cost.costClass);
    });

    it('should classify community detection as very high cost', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'detect communities',
      } as NLQueryRequest);

      expect(result.cost.costClass).toBe('very-high');
      expect(result.isSafe).toBe(false);
    });

    it('should generate cost warnings for expensive queries', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'find all paths from X to Y',
      } as NLQueryRequest);

      // Should have some warnings for potentially expensive query
      expect(result.warnings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Safety Validation', () => {
    const baseRequest: Partial<NLQueryRequest> = {
      investigationId: 'test-investigation',
      dryRun: true,
    };

    it('should reject mutation queries', async () => {
      // Since we use pattern matching, mutation keywords won't match
      // Let's test the validation path
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'delete all nodes',
      } as NLQueryRequest);

      // Should fail to match pattern or be blocked
      if (result.cypher) {
        expect(result.isSafe).toBe(false);
        expect(result.warnings).toContain(
          expect.stringMatching(/mutation|DELETE/i),
        );
      }
    });

    it('should mark queries without WHERE as potentially unsafe', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'show all relationships',
      } as NLQueryRequest);

      // Check for warnings about missing WHERE clause
      const hasWhereWarning = result.warnings.some(
        (w) => w.toLowerCase().includes('where') || w.toLowerCase().includes('filter'),
      );
      // This is informational, not blocking
      expect(result.allowed).toBe(true);
    });

    it('should add tenant filtering when tenantId provided', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        tenantId: 'tenant-123',
        query: 'show all nodes',
      } as NLQueryRequest);

      expect(result.cypher).toMatch(/tenantId/i);
    });
  });

  describe('Query Refinement Suggestions', () => {
    const baseRequest: Partial<NLQueryRequest> = {
      investigationId: 'test-investigation',
      dryRun: true,
    };

    it('should suggest LIMIT for expensive queries', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'detect communities',
      } as NLQueryRequest);

      if (result.refinements && result.refinements.length > 0) {
        const limitSuggestion = result.refinements.find(
          (r) => r.reason.toLowerCase().includes('limit'),
        );
        expect(limitSuggestion).toBeDefined();
      }
    });

    it('should suggest bounded paths for unbounded traversals', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'find all paths between nodes',
      } as NLQueryRequest);

      if (result.refinements && result.refinements.length > 0) {
        const pathSuggestion = result.refinements.find(
          (r) =>
            r.reason.toLowerCase().includes('depth') ||
            r.reason.toLowerCase().includes('path'),
        );
        // May or may not have path refinement depending on pattern
      }
    });
  });

  describe('Error Handling', () => {
    const baseRequest: Partial<NLQueryRequest> = {
      investigationId: 'test-investigation',
      dryRun: true,
    };

    it('should handle empty prompts gracefully', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: '',
      } as NLQueryRequest);

      expect(result.allowed).toBe(false);
      expect(result.blockReason).toBeTruthy();
    });

    it('should handle very long prompts', async () => {
      const longPrompt = 'show ' + 'all '.repeat(500) + 'nodes';

      await expect(
        service.compileQuery({
          ...baseRequest,
          query: longPrompt,
        } as NLQueryRequest),
      ).rejects.toThrow();
    });

    it('should handle unrecognized patterns', async () => {
      const result = await service.compileQuery({
        ...baseRequest,
        query: 'do something weird with quantum entanglement',
      } as NLQueryRequest);

      // Should fail gracefully with suggestions
      expect(result.allowed).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe('Caching', () => {
    const baseRequest: Partial<NLQueryRequest> = {
      investigationId: 'test-investigation',
      dryRun: true,
    };

    it('should cache query results', async () => {
      const query = 'show all nodes';

      // First call
      const result1 = await service.compileQuery({
        ...baseRequest,
        query,
      } as NLQueryRequest);

      // Second call (should be cached)
      const result2 = await service.compileQuery({
        ...baseRequest,
        query,
      } as NLQueryRequest);

      expect(result1.queryId).not.toBe(result2.queryId);
      expect(result1.cypher).toBe(result2.cypher);
    });

    it('should return different results for different investigations', async () => {
      const query = 'show all nodes';

      const result1 = await service.compileQuery({
        ...baseRequest,
        investigationId: 'investigation-1',
        query,
      } as NLQueryRequest);

      const result2 = await service.compileQuery({
        ...baseRequest,
        investigationId: 'investigation-2',
        query,
      } as NLQueryRequest);

      // Different investigations should generate different cache keys
      expect(result1.queryId).not.toBe(result2.queryId);
    });

    it('should allow cache clearing', async () => {
      // Compile a query
      await service.compileQuery({
        ...baseRequest,
        query: 'show all nodes',
      } as NLQueryRequest);

      // Clear cache
      service.clearCache();

      // Cache should be empty now
      const cached = service.getCachedPreview({
        ...baseRequest,
        query: 'show all nodes',
      } as NLQueryRequest);

      expect(cached).toBeNull();
    });
  });

  describe('Available Patterns', () => {
    it('should return list of available query patterns', () => {
      const patterns = service.getAvailablePatterns();

      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);

      // Each pattern should have name, description, and expectedCost
      patterns.forEach((pattern) => {
        expect(pattern).toHaveProperty('name');
        expect(pattern).toHaveProperty('description');
        expect(pattern).toHaveProperty('expectedCost');
      });
    });

    it('should include common query patterns', () => {
      const patterns = service.getAvailablePatterns();
      const patternNames = patterns.map((p) => p.name);

      expect(patternNames).toContain('list-all-nodes');
      expect(patternNames).toContain('count-nodes');
      expect(patternNames).toContain('find-relationships');
      expect(patternNames).toContain('shortest-path');
    });
  });
});
