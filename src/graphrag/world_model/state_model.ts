/**
 * State Model — canonical enterprise world-state snapshot
 *
 * Represents the current state of the enterprise as a unified latent vector
 * anchored to a Neo4j graph snapshot and linked to raw observation refs.
 *
 * Evidence: EVD-WORLD_MODEL-ARCH-001
 */

import type { UnifiedStateVector } from "./representation.js"

export interface WorldState {
  /** Unique snapshot ID (UUIDv4 recommended) */
  id: string
  /** ISO-8601 creation timestamp */
  timestamp: string
  /** Self-Flow latent embedding for this state */
  semantic_vector: UnifiedStateVector
  /** Neo4j graph snapshot node ID that grounds this state */
  graph_snapshot_id: string
  /** References to source observations that produced this state */
  observation_refs: string[]
  /** Confidence score in [0, 1] — higher means more grounded */
  confidence: number
}

/**
 * Create a new WorldState from its constituent parts.
 * graph_snapshot_id must be a valid Neo4j node ID; callers are responsible
 * for verifying the node exists before creating a state.
 */
export function createWorldState(params: {
  id: string
  semantic_vector: UnifiedStateVector
  graph_snapshot_id: string
  observation_refs: string[]
  confidence?: number
}): WorldState {
  return {
    id: params.id,
    timestamp: new Date().toISOString(),
    semantic_vector: params.semantic_vector,
    graph_snapshot_id: params.graph_snapshot_id,
    observation_refs: params.observation_refs,
    confidence: params.confidence ?? 1.0,
  }
}
