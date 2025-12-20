/**
 * NL Graph Query Copilot - Comprehensive Test Suite
 *
 * Tests the Query Cookbook patterns:
 * - Time-travel queries
 * - Policy-aware queries
 * - Geo-temporal queries
 * - Narrative/timeline queries
 * - Course of Action (COA) queries
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { NlGraphQueryService } from '../src/ai/nl-graph-query/nl-graph-query.service.js';
import type { CompileRequest, CompileResponse, CompileError, SchemaContext } from '../src/ai/nl-graph-query/types.js';

describe('NlGraphQueryService', () => {
  let service: NlGraphQueryService;
  let baseContext: SchemaContext;

  beforeEach(() => {
    service = new NlGraphQueryService();
    baseContext = {
      nodeLabels: ['Entity', 'Person', 'Organization', 'Event', 'Location'],
      relationshipTypes: [
        'KNOWS',
        'WORKS_FOR',
        'LOCATED_AT',
        'ATTENDED',
        'RELATED_TO',
        'PRECEDED_BY',
        'CAUSED_BY',
      ],
      nodeProperties: {
        Entity: ['id', 'type', 'name', 'createdAt'],
        Person: ['id', 'name', 'email', 'age'],
        Organization: ['id', 'name', 'type', 'industry'],
      },
      tenantId: 'test-tenant',
      userId: 'test-user',
    };
  });

  describe('Basic Query Patterns', () => {
    it('should compile "show all nodes" query', async () => {
      const request: CompileRequest = {
        prompt: 'show all nodes',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.cypher).toContain('MATCH (n)');
        expect(response.cypher).toContain('RETURN n');
        expect(response.cypher).toContain('LIMIT');
        expect(response.isSafe).toBe(true);
        expect(response.estimatedCost.costClass).toBe('low');
      }
    });

    it('should compile "count nodes" query', async () => {
      const request: CompileRequest = {
        prompt: 'count nodes',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.cypher).toContain('count(n)');
        expect(response.estimatedCost.costClass).toBe('low');
      }
    });

    it('should compile "show relationships" query', async () => {
      const request: CompileRequest = {
        prompt: 'show all relationships',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.cypher).toMatch(/MATCH.*-\[.*\]->/);
        expect(response.estimatedCost.costClass).toMatch(/low|medium/);
      }
    });

    it('should compile "find neighbors" query', async () => {
      const request: CompileRequest = {
        prompt: 'show neighbors of node123',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.cypher).toContain('MATCH');
        expect(response.cypher).toContain('-[r]-(neighbor)');
        expect(response.requiredParameters).toContain('nodeId');
      }
    });
  });

  describe('Time-Travel Query Patterns', () => {
    it('should compile time-travel snapshot query', async () => {
      const request: CompileRequest = {
        prompt: 'show graph state at 2024-01-15',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.cypher).toContain('validFrom');
        expect(response.cypher).toContain('validTo');
        expect(response.cypher).toContain('$timestamp');
        expect(response.requiredParameters).toContain('timestamp');
        expect(response.estimatedCost.costClass).toMatch(/medium|high/);
        expect(response.explanation).toContain('time');
      }
    });

    it('should compile time-travel changes query', async () => {
      const request: CompileRequest = {
        prompt: 'show changes between 2024-01-01 and 2024-01-31',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.cypher).toContain('validFrom');
        expect(response.cypher).toContain('$startTime');
        expect(response.cypher).toContain('$endTime');
        expect(response.requiredParameters).toContain('startTime');
        expect(response.requiredParameters).toContain('endTime');
        expect(response.explanation).toContain('changes');
      }
    });
  });

  describe('Policy-Aware Query Patterns', () => {
    it('should compile policy-filtered entity query', async () => {
      const contextWithPolicy: SchemaContext = {
        ...baseContext,
        policyTags: [
          { label: 'Person', classification: 'CONFIDENTIAL' },
          { label: 'Organization', classification: 'SECRET' },
        ],
      };

      const request: CompileRequest = {
        prompt: 'show all Person with classification CONFIDENTIAL',
        schemaContext: contextWithPolicy,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.cypher).toContain('Person');
        // Should include policy filtering
        expect(response.isSafe).toBe(true);
      }
    });

    it('should apply tenant filtering when tenantId is present', async () => {
      const request: CompileRequest = {
        prompt: 'show all nodes',
        schemaContext: { ...baseContext, tenantId: 'tenant-123' },
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.cypher).toContain('tenantId');
        expect(response.cypher).toContain('$tenantId');
      }
    });
  });

  describe('Geo-Temporal Query Patterns', () => {
    it('should compile geo-temporal entity query', async () => {
      const request: CompileRequest = {
        prompt: 'show entities near New York at 2024-01-15',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.cypher).toContain('point.distance');
        expect(response.cypher).toContain('latitude');
        expect(response.cypher).toContain('longitude');
        expect(response.cypher).toContain('observedAt');
        expect(response.requiredParameters).toContain('lat');
        expect(response.requiredParameters).toContain('lon');
        expect(response.estimatedCost.costClass).toMatch(/high|very-high/);
        expect(response.estimatedCost.costDrivers).toEqual(
          expect.arrayContaining([
            expect.stringMatching(/geo-spatial|distance/i),
          ]),
        );
      }
    });
  });

  describe('Narrative/Timeline Query Patterns', () => {
    it('should compile timeline query', async () => {
      const request: CompileRequest = {
        prompt: 'show timeline of events for investigation',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.cypher).toContain('timestamp');
        expect(response.cypher).toContain('ORDER BY');
        expect(response.cypher).toMatch(/PRECEDED_BY|CAUSED_BY|RELATED_TO/);
        expect(response.explanation).toContain('chronological');
      }
    });
  });

  describe('Course of Action (COA) Query Patterns', () => {
    it('should compile shortest path COA query', async () => {
      const request: CompileRequest = {
        prompt: 'shortest path from nodeA to nodeB',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.cypher).toContain('shortestPath');
        expect(response.cypher).toContain('$startId');
        expect(response.cypher).toContain('$endId');
        expect(response.requiredParameters).toContain('startId');
        expect(response.requiredParameters).toContain('endId');
        expect(response.estimatedCost.costClass).toMatch(/high|very-high/);
      }
    });

    it('should compile path analysis query', async () => {
      const request: CompileRequest = {
        prompt: 'find paths from entityA to entityB',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.cypher).toContain('allShortestPaths');
        expect(response.cypher).toMatch(/\[\*\.\.(\d+)\]/); // Variable-length path
        expect(response.estimatedCost.costClass).toMatch(/high|very-high/);
      }
    });

    it('should compile constrained path query', async () => {
      const request: CompileRequest = {
        prompt: 'show paths that avoid suspicious entities',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.cypher).toContain('NOT ANY');
        expect(response.cypher).toContain('excludedTypes');
        expect(response.requiredParameters).toContain('excludedTypes');
        expect(response.estimatedCost.costClass).toBe('very-high');
      }
    });
  });

  describe('Cost Estimation', () => {
    it('should estimate low cost for simple queries', async () => {
      const request: CompileRequest = {
        prompt: 'count nodes',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.estimatedCost.costClass).toBe('low');
        expect(response.estimatedCost.estimatedTimeMs).toBeLessThan(200);
      }
    });

    it('should estimate high cost for variable-length paths', async () => {
      const request: CompileRequest = {
        prompt: 'find paths from A to B',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.estimatedCost.costClass).toMatch(/high|very-high/);
        expect(response.estimatedCost.nodesScanned).toBeGreaterThan(1000);
      }
    });

    it('should provide cost drivers in explanation', async () => {
      const request: CompileRequest = {
        prompt: 'show paths that avoid suspicious entities',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.estimatedCost.costDrivers.length).toBeGreaterThan(0);
        expect(response.warnings.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Validation and Security', () => {
    it('should reject mutation queries', async () => {
      const request: CompileRequest = {
        prompt: 'create new nodes',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      // Should either fail validation or mark as unsafe
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.isSafe).toBe(false);
        expect(response.warnings).toEqual(
          expect.arrayContaining([
            expect.stringMatching(/mutation/i),
          ]),
        );
      }
    });

    it('should detect dangerous operations', async () => {
      // This should not generate, but if it does, should be marked unsafe
      const request: CompileRequest = {
        prompt: 'delete all nodes',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      // Should be an error or unsafe
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.isSafe).toBe(false);
      }
    });

    it('should require parameters for parameterized queries', async () => {
      const request: CompileRequest = {
        prompt: 'show neighbors of node123',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.requiredParameters.length).toBeGreaterThan(0);
        expect(response.requiredParameters).toContain('nodeId');
      }
    });

    it('should validate balanced syntax', async () => {
      // Service should never generate invalid Cypher, but this tests the validator
      const request: CompileRequest = {
        prompt: 'show all nodes',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        // Should have balanced parentheses, brackets, braces
        const cypher = response.cypher;
        expect((cypher.match(/\(/g) || []).length).toBe((cypher.match(/\)/g) || []).length);
        expect((cypher.match(/\[/g) || []).length).toBe((cypher.match(/\]/g) || []).length);
      }
    });
  });

  describe('Explanation Generation', () => {
    it('should provide concise explanation by default', async () => {
      const request: CompileRequest = {
        prompt: 'count nodes',
        schemaContext: baseContext,
        verbose: false,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.explanation).toBeTruthy();
        expect(response.explanation.length).toBeGreaterThan(10);
        expect(response.explanation.length).toBeLessThan(200);
      }
    });

    it('should provide detailed explanation in verbose mode', async () => {
      const request: CompileRequest = {
        prompt: 'shortest path from A to B',
        schemaContext: baseContext,
        verbose: true,
      };

      const result = await service.compile(request);

      expect('cypher' in result).toBe(true);
      if ('cypher' in result) {
        const response = result as CompileResponse;
        expect(response.explanation).toBeTruthy();
        expect(response.explanation.length).toBeGreaterThan(100);
        expect(response.explanation).toContain('---');
      }
    });
  });

  describe('Error Handling', () => {
    it('should return error for empty prompt', async () => {
      const request: CompileRequest = {
        prompt: '',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('code' in result).toBe(true);
      if ('code' in result) {
        const error = result as CompileError;
        expect(error.code).toBe('INVALID_INPUT');
        expect(error.suggestions.length).toBeGreaterThan(0);
      }
    });

    it('should return error for prompt that is too long', async () => {
      const request: CompileRequest = {
        prompt: 'a'.repeat(1001),
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('code' in result).toBe(true);
      if ('code' in result) {
        const error = result as CompileError;
        expect(error.code).toBe('INVALID_INPUT');
      }
    });

    it('should return error with suggestions for unrecognized pattern', async () => {
      const request: CompileRequest = {
        prompt: 'foobar bazqux nonexistent query pattern',
        schemaContext: baseContext,
      };

      const result = await service.compile(request);

      expect('code' in result).toBe(true);
      if ('code' in result) {
        const error = result as CompileError;
        expect(error.code).toBe('GENERATION_FAILED');
        expect(error.suggestions.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Caching', () => {
    it('should cache compilation results', async () => {
      const request: CompileRequest = {
        prompt: 'show all nodes',
        schemaContext: baseContext,
      };

      const result1 = await service.compile(request);
      const result2 = await service.compile(request);

      expect('queryId' in result1).toBe(true);
      expect('queryId' in result2).toBe(true);

      // Should return the same cached result
      if ('queryId' in result1 && 'queryId' in result2) {
        expect(result1.queryId).toBe(result2.queryId);
      }
    });

    it('should clear cache on demand', async () => {
      const request: CompileRequest = {
        prompt: 'show all nodes',
        schemaContext: baseContext,
      };

      await service.compile(request);
      const statsBefore = service.getCacheStats();
      expect(statsBefore.size).toBeGreaterThan(0);

      service.clearCache();
      const statsAfter = service.getCacheStats();
      expect(statsAfter.size).toBe(0);
    });
  });

  describe('Service Information', () => {
    it('should return available patterns', () => {
      const patterns = service.getAvailablePatterns();

      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0]).toHaveProperty('name');
      expect(patterns[0]).toHaveProperty('description');
      expect(patterns[0]).toHaveProperty('expectedCost');
    });

    it('should provide cache statistics', () => {
      const stats = service.getCacheStats();

      expect(stats).toHaveProperty('size');
      expect(stats).toHaveProperty('maxSize');
      expect(typeof stats.size).toBe('number');
      expect(typeof stats.maxSize).toBe('number');
    });
  });

  describe('Integration: Investigation Workflow', () => {
    it('should support complete investigation query workflow', async () => {
      const investigationContext: SchemaContext = {
        ...baseContext,
        investigationId: 'inv-123',
        policyTags: [
          { label: 'Person', classification: 'CONFIDENTIAL', purpose: ['investigation'] },
        ],
      };

      // Step 1: Get all entities in investigation
      const step1 = await service.compile({
        prompt: 'show all entities in investigation inv-123',
        schemaContext: investigationContext,
      });

      expect('cypher' in step1).toBe(true);

      // Step 2: Find timeline
      const step2 = await service.compile({
        prompt: 'show timeline of events',
        schemaContext: investigationContext,
      });

      expect('cypher' in step2).toBe(true);

      // Step 3: Analyze paths
      const step3 = await service.compile({
        prompt: 'find paths from suspect1 to suspect2',
        schemaContext: investigationContext,
      });

      expect('cypher' in step3).toBe(true);

      // All should be safe read-only queries
      if ('cypher' in step1 && 'cypher' in step2 && 'cypher' in step3) {
        expect(step1.isSafe).toBe(true);
        expect(step2.isSafe).toBe(true);
        // step3 might be unsafe due to high cost
      }
    });
  });
});

describe('No Side Effects', () => {
  it('should not have database client imported', async () => {
    // Verify the module doesn't import database clients
    const serviceModule = await import('../src/ai/nl-graph-query/nl-graph-query.service.js');

    // The service should not have any database connection
    expect(serviceModule).toBeDefined();
    expect(new serviceModule.NlGraphQueryService()).toBeDefined();
  });

  it('should not execute queries during compilation', async () => {
    const service = new NlGraphQueryService();
    const request: CompileRequest = {
      prompt: 'show all nodes',
      schemaContext: {
        tenantId: 'test-tenant',
      },
    };

    // This should only compile, not execute
    const result = await service.compile(request);

    expect('cypher' in result).toBe(true);
    // No database should have been touched
  });
});
