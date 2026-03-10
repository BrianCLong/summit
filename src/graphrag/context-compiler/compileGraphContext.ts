<<<<<<< HEAD
/**
 * compileGraphContext — knowledge-graph-aware context compiler for Summit.
 *
 * Compiler stages:
 *   1. bindEntities     — map task tokens to graph entity ids.
 *   2. expandNeighborhood — fetch 1–N hop subgraph from Neo4j / knowledge graph.
 *   3. applyPolicyTrim  — remove forbidden tools/datasets/agents per policy.
 *   4. compactContext   — summarise to a token budget (preserves key facts).
 *
 * Feature flag: SUMMIT_GRAPH_CONTEXT_COMPILER
 *
 * Foundation-lane: stages 2–4 are stubs returning safe defaults.
 * They will be replaced with Neo4j + vector-search calls in the
 * innovation lane once the flag is enabled and the benchmark passes.
 *
 * EVD-AFCP-KG-003
 */

import type { TaskSpec } from "../../agents/controlplane/router/RouterTypes.js";

export interface GraphContextPackage {
  /** Graph entity ids resolved from the task. */
  entities: string[];

  /** Subgraph structure (opaque in foundation lane). */
  subgraph: unknown;

  /** Dataset identifiers the policy allows for this task context. */
  allowedDatasets: string[];

  /** Tool identifiers the policy allows for this task context. */
  allowedTools: string[];

  /** Evidence artifact ids attached to this compiled context. */
  evidenceIds: string[];

  /** Token count consumed by this package. */
  tokenCount: number;
}

// ─── Stage implementations (foundation-lane stubs) ────────────────────────────

async function bindEntities(task: TaskSpec): Promise<string[]> {
  // Production: query Neo4j / entity resolver to map task.goal tokens → entity ids.
  // Foundation stub: return task type as a single synthetic entity.
  return [`entity:${task.type}:${task.id}`];
}

async function expandNeighborhood(
  entities: string[],
  options: { hops: number }
): Promise<unknown> {
  // Production: execute Cypher MATCH (n)-[*1..hops]-(m) WHERE n.id IN $entities.
  // Foundation stub: return minimal placeholder.
  return { entities, hops: options.hops, edges: [] };
}

async function applyPolicyTrim(
  subgraph: unknown,
  policyScope: string
): Promise<{ subgraph: unknown; allowedDatasets: string[]; allowedTools: string[] }> {
  // Production: evaluate OPA / PDP against each node and edge in the subgraph.
  // Foundation stub: return empty allowlists (deny-by-default).
  return {
    subgraph,
    allowedDatasets: [],
    allowedTools: [],
  };
}

async function compactContext(
  trimmed: { subgraph: unknown; allowedDatasets: string[]; allowedTools: string[] },
  entities: string[],
  tokenBudget: number
): Promise<GraphContextPackage> {
  // Production: run graph summariser to reduce token footprint by >= 40%.
  // Foundation stub: passthrough with zero token count.
  return {
    entities,
    subgraph: trimmed.subgraph,
    allowedDatasets: trimmed.allowedDatasets,
    allowedTools: trimmed.allowedTools,
    evidenceIds: [],
    tokenCount: 0,
  };
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Compile a graph context package for a given task.
 *
 * Returns a safe, policy-trimmed context package that the router and planner
 * can use to make graph-aware decisions.
 *
 * In the foundation lane this returns safe defaults (empty allowlists).
 * Callers should treat an empty allowedDatasets / allowedTools as "use only
 * what the agent descriptor already permits".
 */
export async function compileGraphContext(task: TaskSpec): Promise<GraphContextPackage> {
  const entities = await bindEntities(task);
  const subgraph = await expandNeighborhood(entities, { hops: 2 });
  const trimmed = await applyPolicyTrim(subgraph, task.type);
  return compactContext(trimmed, entities, task.tokenBudget ?? 4096);
}
=======
export interface GraphContextPackage {
  entities: string[];
  subgraph: {
    nodes: Array<{ id: string; type: string }>;
    edges: Array<{ from: string; to: string; type: string }>;
  };
  allowedDatasets: string[];
  allowedTools: string[];
  evidenceIds: string[];
}

export interface GraphContextRequest {
  taskId: string;
  entities: string[];
  policyScope?: {
    datasets?: string[];
    tools?: string[];
  };
}

export function compileGraphContext(
  request: GraphContextRequest,
): GraphContextPackage {
  return {
    entities: request.entities,
    subgraph: {
      nodes: request.entities.map((entity) => ({ id: entity, type: 'entity' })),
      edges: [],
    },
    allowedDatasets: request.policyScope?.datasets ?? [],
    allowedTools: request.policyScope?.tools ?? [],
    evidenceIds: [`EVD-AOT2026-CONTEXT-${request.taskId}`],
  };
}
>>>>>>> origin/main
