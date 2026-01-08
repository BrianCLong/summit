import { describe, expect, it } from "vitest";
import { analyzeCypherPlan, buildCostScore, estimateDepth, estimateRows } from "../src/index.js";

describe("cypher estimator", () => {
  it("derives depth and rows from Cypher structure", () => {
    const cypher =
      'MATCH (p:Person)-[r:EMPLOYED_BY]->(o:Org)\nWHERE p.location = "Berlin"\nRETURN p, r LIMIT 20';
    const depth = estimateDepth(cypher);
    const rows = estimateRows(cypher, {
      anticipatedRows: 120,
      estimatedLatencyMs: 300,
      estimatedRru: 2,
    });
    const costScore = buildCostScore(rows, depth);

    expect(depth).toBeGreaterThanOrEqual(1);
    expect(rows).toBeLessThanOrEqual(20);
    expect(costScore).toBeGreaterThan(0);
  });

  it("flags write intent and enforces expansion caps", () => {
    const { estimate, warnings } = analyzeCypherPlan("MATCH (n)-[r]->(m) DELETE r", {
      maxDepth: 0,
    });

    expect(estimate.containsWrite).toBe(true);
    expect(warnings.some((warning) => warning.includes("write"))).toBe(true);
    expect(warnings.some((warning) => warning.includes("sandbox cap"))).toBe(true);
  });
});
