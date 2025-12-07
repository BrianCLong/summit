import { describe, it, expect } from '@jest/globals';
import { parseDSL, buildCypherFromDSL } from '../dsl/execution.js';

describe('DSL Execution', () => {
  it('should parse valid JSON DSL', () => {
    const json = '{"start": {"type": "Actor"}}';
    const dsl = parseDSL(json);
    expect(dsl.start.type).toBe('Actor');
  });

  it('should build valid Cypher for simple start query', () => {
    const dsl = { start: { type: 'Actor' } };
    const { cypher, params } = buildCypherFromDSL(dsl, 'tenant-1');

    expect(cypher).toContain('MATCH (n:GraphNode { tenantId: $tenantId })');
    expect(cypher).toContain('WHERE n.entityType = $startType');
    expect(params.tenantId).toBe('tenant-1');
    expect(params.startType).toBe('Actor');
  });

  it('should handle traversal', () => {
    const dsl = {
      start: { id: 'root' },
      traverse: [
        { edgeTypes: ['USES'], direction: 'out' as const, depth: 2 }
      ]
    };
    const { cypher } = buildCypherFromDSL(dsl, 'tenant-1');
    expect(cypher).toContain('MATCH (n)-[:USES*1..2]->(m0)');
  });
});
