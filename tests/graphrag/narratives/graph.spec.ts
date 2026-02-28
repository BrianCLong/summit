import { describe, it, expect } from '@jest/globals';
import { buildUpsertNodeQuery, buildNarrativeQuery } from '../../../src/graphrag/narratives/queries.js';
import { GraphNode } from '../../../src/graphrag/ontology/types.js';

describe('Narrative Graph Queries', () => {
  it('should build a secure upsert node query', () => {
    const node: GraphNode = {
      id: "N1",
      label: "Narrative",
      properties: { title: "Test Narrative" }
    };
    const { query, params } = buildUpsertNodeQuery(node);

    expect(query).toContain('MERGE (n:Narrative { id: $id })');
    expect(params.id).toBe("N1");
    expect(params.properties.title).toBe("Test Narrative");
  });

  it('should throw for invalid node labels (injection protection)', () => {
    const node: any = {
      id: "N1",
      label: "Narrative; DROP TABLE nodes;",
      properties: {}
    };
    expect(() => buildUpsertNodeQuery(node)).toThrow('Invalid node label');
  });

  it('should build a parameterized narrative query', () => {
    const { query, params } = buildNarrativeQuery("N1");
    expect(query).toContain('MATCH (n:Narrative { id: $narrativeId })');
    expect(params.narrativeId).toBe("N1");
  });
});
