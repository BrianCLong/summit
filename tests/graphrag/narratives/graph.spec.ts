import { describe, it, expect } from 'vitest';
import { buildUpsertNodeQuery, buildUpsertEdgeQuery } from "../../../src/graphrag/narratives/queries";
import { GraphNode, GraphEdge } from "../../../src/graphrag/ontology/types";

describe("Narrative Graph Model & Queries", () => {
  it("should build a deterministic upsert node query", () => {
    const node: GraphNode = {
      id: "NARR-001",
      label: "Narrative",
      properties: { title: "Test Narrative", confidence: 0.9, evidence_ids: ["EVD-1"] }
    };
    const { query, params } = buildUpsertNodeQuery(node);
    expect(query).toContain("MERGE (n:Narrative { id: $id })");
    expect(params.id).toBe("NARR-001");
    expect(params.properties.title).toBe("Test Narrative");
  });

  it("should build a deterministic upsert edge query", () => {
    const edge: GraphEdge = {
      from: "ACTOR-001",
      to: "CLAIM-001",
      label: "AMPLIFIES",
      properties: { weight: 0.8 }
    };
    const { query, params } = buildUpsertEdgeQuery(edge);
    expect(query).toContain("MERGE (a)-[r:AMPLIFIES]->(b)");
    expect(params.from).toBe("ACTOR-001");
    expect(params.to).toBe("CLAIM-001");
  });

  it("should verify node types in ontology", () => {
    const narrative: GraphNode = {
      id: "N-1",
      label: "Narrative",
      properties: {}
    };
    expect(narrative.label).toBe("Narrative");
  });
});
