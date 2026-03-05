/**
 * Graph Grounding — anchor WorldState to Neo4j + Qdrant
 *
 * Every state must be grounded to a KG node before it can be used by the
 * dynamics or planning layers. This prevents hallucination drift: a state
 * without a valid graph anchor is invalid by contract.
 *
 * Evidence: EVD-WORLD_MODEL-ARCH-001
 */

import type { WorldState } from "./state_model.js"

export interface GraphGroundingResult {
  /** Neo4j node ID that was confirmed to exist */
  graph_snapshot_id: string
  /** Qdrant vector point ID for nearest-neighbour retrieval */
  qdrant_point_id: string
  /** Whether the grounding succeeded */
  grounded: boolean
  /** Error message if grounding failed */
  error?: string
}

/**
 * Minimal interface for a Neo4j graph client.
 * Production code injects a real driver; tests inject a stub.
 */
export interface GraphClient {
  nodeExists(nodeId: string): Promise<boolean>
  upsertStateNode(state: WorldState): Promise<string>
}

/**
 * Minimal interface for a Qdrant vector store client.
 */
export interface VectorStoreClient {
  upsertVector(id: string, vector: number[]): Promise<string>
}

/**
 * Ground `state` against the graph and vector store.
 *
 * Throws if the declared graph_snapshot_id does not exist in the KG —
 * the caller must ensure the node is present before calling this function.
 */
export async function groundState(
  state: WorldState,
  graph: GraphClient,
  vectorStore: VectorStoreClient
): Promise<GraphGroundingResult> {
  const exists = await graph.nodeExists(state.graph_snapshot_id)
  if (!exists) {
    return {
      graph_snapshot_id: state.graph_snapshot_id,
      qdrant_point_id: "",
      grounded: false,
      error: `KG node not found: ${state.graph_snapshot_id}`,
    }
  }

  const qdrant_point_id = await vectorStore.upsertVector(
    state.id,
    state.semantic_vector
  )

  return {
    graph_snapshot_id: state.graph_snapshot_id,
    qdrant_point_id,
    grounded: true,
  }
}
