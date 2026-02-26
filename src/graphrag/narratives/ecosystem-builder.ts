/**
 * Ecosystem Mapping Builder for INFOWAR.
 */

import { FEATURE_NARRATIVE_ECOSYSTEM } from "../../config/flags";
import { GraphNode, GraphEdge } from "../ontology/types";

export interface EcosystemMetrics {
  narrative_id: string;
  total_claims: number;
  unique_actors: number;
  platform_distribution: Record<string, number>;
  reach_score: number;
}

/**
 * Builds an ecosystem map for a given narrative if the feature flag is enabled.
 */
export async function buildEcosystemMap(narrativeId: string): Promise<EcosystemMetrics | null> {
  if (!FEATURE_NARRATIVE_ECOSYSTEM) {
    console.log(`[EcosystemBuilder] Feature flag 'FEATURE_NARRATIVE_ECOSYSTEM' is OFF. Skipping.`);
    return null;
  }

  console.log(`[EcosystemBuilder] Mapping ecosystem for narrative ${narrativeId}...`);
  // Stub implementation for metrics calculation
  return {
    narrative_id: narrativeId,
    total_claims: 0,
    unique_actors: 0,
    platform_distribution: {},
    reach_score: 0
  };
}

/**
 * Calculates propagation stats for a set of nodes and edges.
 */
export function calculatePropagation(nodes: GraphNode[], edges: GraphEdge[]): any {
  if (!FEATURE_NARRATIVE_ECOSYSTEM) return null;

  return {
    nodes_count: nodes.length,
    edges_count: edges.length,
    amplification_factor: edges.filter(e => e.label === "AMPLIFIES").length / Math.max(1, nodes.length)
  };
}
