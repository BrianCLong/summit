/**
 * Core XAI Algorithms (Pure Functions)
 * These algorithms operate on local adjacency representations to provide
 * explanations for graph metrics without requiring a live database connection.
 */

// Basic Adjacency List Type: NodeId -> List of NeighborIds
export type AdjacencyList = Map<string, string[]>;

/**
 * Explains the influence of neighbors on a target node based on Degree Centrality.
 * In a degree-based metric, the explanation is simply the neighbors themselves,
 * ranked by their own connectivity (finding "Hubs" connected to the target).
 *
 * @param graph The local graph structure
 * @param targetNode The node to explain
 * @param topK Number of top contributors to return
 * @returns List of explaining nodes and their scores
 */
export function explainDegreeCentrality(
  graph: AdjacencyList,
  targetNode: string,
  topK: number = 5
): { nodeId: string; score: number }[] {
  const neighbors = graph.get(targetNode);
  if (!neighbors) {
    return [];
  }

  // Score neighbors by their own degree (Second-order influence)
  const scores = neighbors.map((neighbor) => {
    const neighborDegree = graph.get(neighbor)?.length || 0;
    return {
      nodeId: neighbor,
      score: neighborDegree, // Simple heuristic: connected to a hub makes you more important
    };
  });

  return scores.sort((a, b) => b.score - a.score).slice(0, topK);
}

/**
 * Explains community assignment by identifying which neighbors share the same label/community.
 * This is a "Homophily Explanation".
 *
 * @param graph The local graph structure
 * @param communities Map of NodeId -> CommunityId (or Label)
 * @param targetNode The node to explain
 * @returns Breakdown of neighbor communities
 */
export function explainCommunity(
  graph: AdjacencyList,
  communities: Map<string, string>,
  targetNode: string
): { community: string; count: number; examples: string[] }[] {
  const neighbors = graph.get(targetNode);
  if (!neighbors) {
    return [];
  }

  const distribution = new Map<string, { count: number; examples: string[] }>();
  const targetCommunity = communities.get(targetNode) || 'Unknown';

  neighbors.forEach((neighbor) => {
    const comm = communities.get(neighbor) || 'Unknown';
    if (!distribution.has(comm)) {
      distribution.set(comm, { count: 0, examples: [] });
    }
    const entry = distribution.get(comm)!;
    entry.count++;
    if (entry.examples.length < 3) {
      entry.examples.push(neighbor);
    }
  });

  // Sort by count, prioritizing the target's own community
  return Array.from(distribution.entries())
    .map(([community, data]) => ({
      community,
      count: data.count,
      examples: data.examples,
      isSame: community === targetCommunity,
    }))
    .sort((a, b) => {
      if (a.isSame && !b.isSame) return -1;
      if (!a.isSame && b.isSame) return 1;
      return b.count - a.count;
    });
}

/**
 * Calculates a simple "Explanation Sparsity" score.
 * Sparsity = 1 - (ExplanationSize / NeighborhoodSize)
 */
export function calculateSparsity(explanationSize: number, totalNeighbors: number): number {
  if (totalNeighbors === 0) return 1.0;
  return 1.0 - (explanationSize / totalNeighbors);
}
