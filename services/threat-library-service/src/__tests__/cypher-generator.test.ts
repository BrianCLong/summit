/**
 * Cypher Generator Unit Tests
 */

import { describe, it, expect } from '@jest/globals';
import {
  generateCypherFromMotif,
  generatePatternQueries,
  validateCypherQuery,
} from '../utils/cypher-generator.js';
import type { GraphMotif } from '../types.js';

describe('CypherGenerator', () => {
  const simpleMotif: GraphMotif = {
    id: 'motif-simple',
    name: 'Simple Pattern',
    description: 'A simple two-node pattern',
    nodes: [
      { id: 'actor', type: 'THREAT_ACTOR', label: 'Actor' },
      { id: 'target', type: 'ASSET', label: 'Target' },
    ],
    edges: [
      {
        id: 'e1',
        sourceNodeId: 'actor',
        targetNodeId: 'target',
        type: 'TARGETS',
        direction: 'OUTGOING',
      },
    ],
    weight: 1,
  };

  const complexMotif: GraphMotif = {
    id: 'motif-complex',
    name: 'Complex Pattern',
    description: 'A complex multi-node pattern with constraints',
    nodes: [
      {
        id: 'actor',
        type: 'THREAT_ACTOR',
        requiredProperties: ['name'],
        propertyFilters: [
          { property: 'sophistication', operator: 'EQUALS', value: 'ADVANCED' },
        ],
      },
      {
        id: 'malware',
        type: 'MALWARE',
        propertyFilters: [{ property: 'family', operator: 'CONTAINS', value: 'Cobalt' }],
      },
      {
        id: 'c2',
        type: 'INFRASTRUCTURE',
        propertyFilters: [{ property: 'type', operator: 'EQUALS', value: 'C2' }],
      },
    ],
    edges: [
      {
        id: 'e1',
        sourceNodeId: 'actor',
        targetNodeId: 'malware',
        type: 'USES',
        direction: 'OUTGOING',
      },
      {
        id: 'e2',
        sourceNodeId: 'malware',
        targetNodeId: 'c2',
        type: 'COMMUNICATES_WITH',
        direction: 'OUTGOING',
      },
    ],
    timeConstraints: [
      {
        operator: 'WITHIN',
        referenceNodeId: 'malware',
        targetNodeId: 'c2',
        durationMs: 3600000,
      },
    ],
    aggregations: [
      {
        nodeId: 'c2',
        property: 'connections',
        function: 'COUNT',
        threshold: 10,
      },
    ],
    weight: 0.85,
  };

  describe('generateCypherFromMotif', () => {
    it('should generate a basic Cypher query', () => {
      const result = generateCypherFromMotif(simpleMotif);

      expect(result.query).toContain('MATCH');
      expect(result.query).toContain('RETURN');
      expect(result.query).toContain(':THREAT_ACTOR');
      expect(result.query).toContain(':ASSET');
      expect(result.query).toContain(':TARGETS');
    });

    it('should include tenant isolation when tenantId is provided', () => {
      const result = generateCypherFromMotif(simpleMotif, { tenantId: 'tenant-123' });

      expect(result.query).toContain('tenantId = $tenantId');
      expect(result.parameters.tenantId).toBe('tenant-123');
    });

    it('should generate property filters', () => {
      const result = generateCypherFromMotif(complexMotif);

      expect(result.query).toContain('sophistication = $');
      expect(result.query).toContain('CONTAINS');
    });

    it('should generate required property checks', () => {
      const result = generateCypherFromMotif(complexMotif);

      expect(result.query).toContain('IS NOT NULL');
    });

    it('should generate time constraints', () => {
      const result = generateCypherFromMotif(complexMotif);

      expect(result.query).toContain('duration');
    });

    it('should respect maxResults option', () => {
      const result = generateCypherFromMotif(simpleMotif, { maxResults: 50 });

      expect(result.query).toContain('LIMIT 50');
    });

    it('should generate count return format', () => {
      const result = generateCypherFromMotif(simpleMotif, { returnFormat: 'count' });

      expect(result.query).toContain('count(*)');
    });

    it('should handle variable-length paths', () => {
      const motifWithVarPath: GraphMotif = {
        ...simpleMotif,
        edges: [
          {
            id: 'e1',
            sourceNodeId: 'actor',
            targetNodeId: 'target',
            type: 'RELATED_TO',
            direction: 'OUTGOING',
            minHops: 1,
            maxHops: 3,
          },
        ],
      };

      const result = generateCypherFromMotif(motifWithVarPath);

      expect(result.query).toContain('*1..3');
    });

    it('should handle incoming edge direction', () => {
      const motifWithIncoming: GraphMotif = {
        ...simpleMotif,
        edges: [
          {
            id: 'e1',
            sourceNodeId: 'actor',
            targetNodeId: 'target',
            type: 'TARGETS',
            direction: 'INCOMING',
          },
        ],
      };

      const result = generateCypherFromMotif(motifWithIncoming);

      expect(result.query).toContain('<-[');
    });

    it('should handle bidirectional edges', () => {
      const motifWithBoth: GraphMotif = {
        ...simpleMotif,
        edges: [
          {
            id: 'e1',
            sourceNodeId: 'actor',
            targetNodeId: 'target',
            type: 'RELATED_TO',
            direction: 'BOTH',
          },
        ],
      };

      const result = generateCypherFromMotif(motifWithBoth);

      expect(result.query).toMatch(/-\[r0:RELATED_TO\]-/);
    });
  });

  describe('generatePatternQueries', () => {
    it('should generate multiple queries for complex patterns', () => {
      const queries = generatePatternQueries(complexMotif);

      expect(queries.length).toBeGreaterThan(1);
      // Should have main query, count query, and aggregation queries
    });

    it('should include main and count queries', () => {
      const queries = generatePatternQueries(simpleMotif);

      const mainQuery = queries.find((q) => q.query.includes('AS actor'));
      const countQuery = queries.find((q) => q.query.includes('count(*)'));

      expect(mainQuery).toBeDefined();
      expect(countQuery).toBeDefined();
    });
  });

  describe('validateCypherQuery', () => {
    it('should validate correct query', () => {
      const result = validateCypherQuery('MATCH (n) RETURN n LIMIT 10');

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing MATCH clause', () => {
      const result = validateCypherQuery('RETURN n LIMIT 10');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query must contain at least one MATCH clause');
    });

    it('should detect missing RETURN clause', () => {
      const result = validateCypherQuery('MATCH (n)');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Query must contain a RETURN clause');
    });

    it('should detect unbalanced parentheses', () => {
      const result = validateCypherQuery('MATCH (n RETURN n');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unbalanced parentheses in query');
    });

    it('should detect unbalanced brackets', () => {
      const result = validateCypherQuery('MATCH (n)-[r RETURN n');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Unbalanced brackets in query');
    });

    it('should detect empty MATCH pattern', () => {
      const result = validateCypherQuery('MATCH() RETURN 1');

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Empty MATCH pattern');
    });
  });

  describe('Edge cases', () => {
    it('should handle motif with no edges', () => {
      const noEdgeMotif: GraphMotif = {
        id: 'motif-no-edges',
        name: 'No Edge Pattern',
        description: 'Pattern with single node',
        nodes: [{ id: 'single', type: 'THREAT_ACTOR' }],
        edges: [],
        weight: 1,
      };

      const result = generateCypherFromMotif(noEdgeMotif);

      expect(result.query).toContain('MATCH');
      expect(result.query).toContain(':THREAT_ACTOR');
    });

    it('should handle spatial constraints - same location', () => {
      const spatialMotif: GraphMotif = {
        ...simpleMotif,
        spatialConstraints: {
          sameLocation: ['actor', 'target'],
        },
      };

      const result = generateCypherFromMotif(spatialMotif);

      expect(result.query).toContain('.location =');
    });

    it('should handle sequence time constraints', () => {
      const sequenceMotif: GraphMotif = {
        id: 'motif-sequence',
        name: 'Sequence Pattern',
        description: 'Pattern with sequence constraint',
        nodes: [
          { id: 'first', type: 'INDICATOR' },
          { id: 'second', type: 'INDICATOR' },
          { id: 'third', type: 'INDICATOR' },
        ],
        edges: [],
        timeConstraints: [
          {
            operator: 'SEQUENCE',
            sequence: ['first', 'second', 'third'],
          },
        ],
        weight: 1,
      };

      const result = generateCypherFromMotif(sequenceMotif);

      expect(result.query).toContain('.timestamp <');
    });

    it('should handle property filters with IN operator', () => {
      const inFilterMotif: GraphMotif = {
        ...simpleMotif,
        nodes: [
          {
            id: 'actor',
            type: 'THREAT_ACTOR',
            propertyFilters: [
              { property: 'category', operator: 'IN', value: ['APT', 'Criminal'] },
            ],
          },
          { id: 'target', type: 'ASSET' },
        ],
      };

      const result = generateCypherFromMotif(inFilterMotif);

      expect(result.query).toContain('IN $');
    });

    it('should handle NOT_IN operator', () => {
      const notInMotif: GraphMotif = {
        ...simpleMotif,
        nodes: [
          {
            id: 'actor',
            type: 'THREAT_ACTOR',
            propertyFilters: [
              { property: 'status', operator: 'NOT_IN', value: ['inactive', 'archived'] },
            ],
          },
          { id: 'target', type: 'ASSET' },
        ],
      };

      const result = generateCypherFromMotif(notInMotif);

      expect(result.query).toContain('NOT');
      expect(result.query).toContain('IN $');
    });
  });
});
