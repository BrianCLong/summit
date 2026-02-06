import { z } from 'zod';

// Define Zod schema matching the JSON schema for runtime validation
export const IntentSpecSchema = z.object({
  query_id: z.string().uuid(),
  original_query: z.string(),
  intent_type: z.enum(["traversal", "aggregation", "path_finding", "neighbor_expansion"]),
  target_entities: z.array(z.object({
    id: z.string(),
    type: z.string(),
    confidence: z.number().min(0).max(1)
  })),
  constraints: z.object({
    max_hops: z.number().int().min(1).max(5).optional(),
    min_confidence: z.number().min(0).max(1).optional(),
    relationship_types: z.array(z.string()).optional(),
  }).optional(),
  evidence_budget: z.object({
    max_nodes: z.number().int().default(50),
    max_edges: z.number().int().default(100),
    max_paths: z.number().int().default(10)
  }),
  ordering: z.object({
    by: z.enum(["centrality", "recency", "confidence"]),
    direction: z.enum(["ASC", "DESC"])
  })
});

export type IntentSpec = z.infer<typeof IntentSpecSchema>;

export class EvidenceBudget {
  constructor(private config: { maxNodes: number; maxEdges: number; maxPaths: number }) {}

  validate(spec: IntentSpec): { valid: boolean; reason?: string } {
    if (spec.evidence_budget.max_nodes > this.config.maxNodes) {
      return { valid: false, reason: `Requested nodes (${spec.evidence_budget.max_nodes}) exceeds limit (${this.config.maxNodes})` };
    }
    if (spec.evidence_budget.max_edges > this.config.maxEdges) {
      return { valid: false, reason: `Requested edges (${spec.evidence_budget.max_edges}) exceeds limit (${this.config.maxEdges})` };
    }
    if (spec.evidence_budget.max_paths > this.config.maxPaths) {
      return { valid: false, reason: `Requested paths (${spec.evidence_budget.max_paths}) exceeds limit (${this.config.maxPaths})` };
    }
    return { valid: true };
  }
}

export interface CypherQuery {
  query: string;
  params: Record<string, any>;
}

export class IntentCompiler {
  constructor(private budget: EvidenceBudget) {}

  /**
   * Mocks the compilation of a natural language query into an IntentSpec.
   * In a real implementation, this would invoke an LLM.
   */
  async compile(query: string): Promise<IntentSpec> {
     // Stub implementation
     throw new Error("LLM Integration not available in this context.");
  }

  validateBudget(spec: IntentSpec): boolean {
    const result = this.budget.validate(spec);
    return result.valid;
  }

  generateCypher(spec: IntentSpec): CypherQuery {
    const { target_entities, constraints, evidence_budget, ordering } = spec;

    // 1. Where Clause (Entity Binding)
    const entityIds = target_entities.map((e: { id: string }) => e.id);
    const params: Record<string, any> = {
      startIds: entityIds
    };

    // 2. Traversal
    const hops = constraints?.max_hops || 1;
    const relTypes = constraints?.relationship_types
      ? `:${constraints.relationship_types.map((t: string) => `\`${t}\``).join('|')}`
      : '';

    // 3. Construct Query
    // Pattern: Match start nodes -> traverse -> end nodes
    let cypher = `MATCH (start) WHERE start.id IN $startIds`;
    cypher += `\nMATCH path = (start)-[r${relTypes}*1..${hops}]->(end)`;

    if (constraints?.min_confidence) {
        cypher += `\nWHERE all(x in relationships(path) WHERE x.confidence >= $minConfidence)`;
        params.minConfidence = constraints.min_confidence;
    }

    // 4. Return
    cypher += `\nRETURN path`;

    // 5. Order By (Deterministic)
    // Coalesce is important for null safety in sorting
    cypher += `\nORDER BY coalesce(end.${ordering.by}, 0) ${ordering.direction}`;

    // 6. Limit (Budget)
    cypher += `\nLIMIT ${evidence_budget.max_paths}`;

    return { query: cypher, params };
  }
}
