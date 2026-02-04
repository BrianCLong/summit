import { describe, it, expect } from '@jest/globals';
import { IntentCompiler, EvidenceBudget, IntentSpec } from '../../src/rag/intent_compiler.js';
import { v4 as uuidv4 } from 'uuid';

describe('IntentCompiler', () => {
  const defaultBudget = new EvidenceBudget({ maxNodes: 50, maxEdges: 100, maxPaths: 10 });
  const compiler = new IntentCompiler(defaultBudget);

  const validSpec: IntentSpec = {
    query_id: uuidv4(),
    original_query: "Who knows Malfoy?",
    intent_type: "neighbor_expansion",
    target_entities: [{ id: "p1", type: "Person", confidence: 1.0 }],
    constraints: { max_hops: 2 },
    evidence_budget: { max_nodes: 10, max_edges: 20, max_paths: 5 },
    ordering: { by: "centrality", direction: "DESC" }
  };

  it('validates budget correctly', () => {
    expect(compiler.validateBudget(validSpec)).toBe(true);

    const invalidSpec = { ...validSpec, evidence_budget: { ...validSpec.evidence_budget, max_nodes: 1000 } };
    expect(compiler.validateBudget(invalidSpec)).toBe(false);
  });

  it('generates deterministic cypher with params', () => {
    const result = compiler.generateCypher(validSpec);
    const cypher = result.query;
    const params = result.params;

    expect(cypher).toContain("MATCH (start) WHERE start.id IN $startIds");
    expect(params.startIds).toEqual(['p1']);

    expect(cypher).toContain("-[r*1..2]->");
    expect(cypher).toContain("ORDER BY coalesce(end.centrality, 0) DESC");
    expect(cypher).toContain("LIMIT 5");
  });

  it('generates cypher with relationship constraints', () => {
      const spec: IntentSpec = {
          ...validSpec,
          constraints: {
              ...validSpec.constraints,
              relationship_types: ["KNOWS", "WORKS_WITH"]
          }
      };
      const result = compiler.generateCypher(spec);
      expect(result.query).toContain("-[r:`KNOWS`|`WORKS_WITH`*1..2]->");
  });

  it('generates cypher with min confidence param', () => {
      const spec: IntentSpec = {
          ...validSpec,
          constraints: {
              ...validSpec.constraints,
              min_confidence: 0.8
          }
      };
      const result = compiler.generateCypher(spec);
      expect(result.query).toContain("WHERE all(x in relationships(path) WHERE x.confidence >= $minConfidence)");
      expect(result.params.minConfidence).toBe(0.8);
  });
});
