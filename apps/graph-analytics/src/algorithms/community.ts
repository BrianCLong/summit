import { Graph, CommunitySummary, CommunityResult } from '../types/analytics';
import { logger } from '../utils/logger';

/**
 * Community Detection Algorithms
 *
 * Implements Label Propagation and Louvain-style modularity optimization
 */

interface AdjacencyMap {
  [nodeId: string]: Set<string>;
}

interface WeightedAdjacency {
  [nodeId: string]: Map<string, number>;
}

/**
 * Build adjacency structures
 */
function buildAdjacencyStructures(graph: Graph): {
  adj: AdjacencyMap;
  weightedAdj: WeightedAdjacency;
  degrees: Map<string, number>;
} {
  const adj: AdjacencyMap = {};
  const weightedAdj: WeightedAdjacency = {};
  const degrees = new Map<string, number>();

  // Initialize
  for (const node of graph.nodes) {
    adj[node.id] = new Set();
    weightedAdj[node.id] = new Map();
    degrees.set(node.id, 0);
  }

  // Build adjacency
  for (const edge of graph.edges) {
    const weight = edge.weight || 1;

    adj[edge.fromId]?.add(edge.toId);
    adj[edge.toId]?.add(edge.fromId);

    weightedAdj[edge.fromId]?.set(
      edge.toId,
      (weightedAdj[edge.fromId]?.get(edge.toId) || 0) + weight,
    );
    weightedAdj[edge.toId]?.set(
      edge.fromId,
      (weightedAdj[edge.toId]?.get(edge.fromId) || 0) + weight,
    );

    degrees.set(edge.fromId, (degrees.get(edge.fromId) || 0) + weight);
    degrees.set(edge.toId, (degrees.get(edge.toId) || 0) + weight);
  }

  return { adj, weightedAdj, degrees };
}

/**
 * Label Propagation Algorithm for community detection
 */
export function labelPropagation(
  graph: Graph,
  maxIterations: number = 100,
): CommunitySummary {
  logger.info('Running label propagation algorithm', {
    nodes: graph.nodes.length,
    maxIterations,
  });

  const { adj } = buildAdjacencyStructures(graph);
  const nodeIds = graph.nodes.map((n) => n.id);

  // Initialize: each node is its own community
  const labels: Map<string, string> = new Map();
  for (const nodeId of nodeIds) {
    labels.set(nodeId, nodeId);
  }

  let changed = true;
  let iteration = 0;

  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    // Randomize node order
    const shuffledNodes = [...nodeIds].sort(() => Math.random() - 0.5);

    for (const nodeId of shuffledNodes) {
      // Count neighbor labels
      const labelCounts = new Map<string, number>();
      const neighbors = adj[nodeId];

      if (!neighbors || neighbors.size === 0) continue;

      for (const neighbor of neighbors) {
        const label = labels.get(neighbor)!;
        labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
      }

      // Find most frequent label
      let maxCount = 0;
      let bestLabel = labels.get(nodeId)!;

      for (const [label, count] of labelCounts.entries()) {
        if (count > maxCount || (count === maxCount && label < bestLabel)) {
          maxCount = count;
          bestLabel = label;
        }
      }

      // Update label if changed
      if (labels.get(nodeId) !== bestLabel) {
        labels.set(nodeId, bestLabel);
        changed = true;
      }
    }
  }

  // Build communities array
  const communities: CommunityResult[] = [];
  const communityMap = new Map<string, string>();
  let communityIndex = 0;

  for (const [nodeId, label] of labels.entries()) {
    if (!communityMap.has(label)) {
      communityMap.set(label, `community_${communityIndex++}`);
    }
    communities.push({
      nodeId,
      communityId: communityMap.get(label)!,
    });
  }

  // Calculate sizes and densities
  const sizes: Record<string, number> = {};
  const densities: Record<string, number> = {};

  for (const communityId of communityMap.values()) {
    sizes[communityId] = 0;
  }

  for (const comm of communities) {
    sizes[comm.communityId]++;
  }

  // Calculate densities (simplified)
  for (const communityId of Object.keys(sizes)) {
    const nodesInCommunity = communities
      .filter((c) => c.communityId === communityId)
      .map((c) => c.nodeId);

    let internalEdges = 0;
    let possibleEdges = (nodesInCommunity.length * (nodesInCommunity.length - 1)) / 2;

    if (possibleEdges > 0) {
      const nodeSet = new Set(nodesInCommunity);
      for (const edge of graph.edges) {
        if (nodeSet.has(edge.fromId) && nodeSet.has(edge.toId)) {
          internalEdges++;
        }
      }
      densities[communityId] = internalEdges / possibleEdges;
    } else {
      densities[communityId] = 0;
    }
  }

  logger.info('Label propagation completed', {
    iterations: iteration,
    communities: communityMap.size,
  });

  return {
    communities,
    numCommunities: communityMap.size,
    sizes,
    densities,
  };
}

/**
 * Calculate modularity score for a community assignment
 */
export function calculateModularity(
  graph: Graph,
  communities: CommunityResult[],
): number {
  const m = graph.edges.length;
  if (m === 0) return 0;

  const communityMap = new Map<string, string>();
  for (const comm of communities) {
    communityMap.set(comm.nodeId, comm.communityId);
  }

  const degrees = new Map<string, number>();
  for (const node of graph.nodes) {
    degrees.set(node.id, 0);
  }

  for (const edge of graph.edges) {
    degrees.set(edge.fromId, (degrees.get(edge.fromId) || 0) + 1);
    degrees.set(edge.toId, (degrees.get(edge.toId) || 0) + 1);
  }

  let modularity = 0;

  for (const edge of graph.edges) {
    const ci = communityMap.get(edge.fromId);
    const cj = communityMap.get(edge.toId);

    if (ci === cj) {
      const ki = degrees.get(edge.fromId) || 0;
      const kj = degrees.get(edge.toId) || 0;
      modularity += 1 - (ki * kj) / (2 * m);
    }
  }

  return modularity / m;
}

/**
 * Louvain-style modularity optimization (simplified single-pass)
 */
export function louvainCommunityDetection(graph: Graph): CommunitySummary {
  logger.info('Running Louvain community detection', {
    nodes: graph.nodes.length,
  });

  const { adj, weightedAdj, degrees } = buildAdjacencyStructures(graph);
  const nodeIds = graph.nodes.map((n) => n.id);

  // Initialize: each node in its own community
  const nodeToCommunity = new Map<string, string>();
  for (const nodeId of nodeIds) {
    nodeToCommunity.set(nodeId, nodeId);
  }

  let improved = true;
  let iteration = 0;
  const maxIterations = 50;

  while (improved && iteration < maxIterations) {
    improved = false;
    iteration++;

    // Try moving each node to neighbor's community
    for (const nodeId of nodeIds) {
      const currentCommunity = nodeToCommunity.get(nodeId)!;
      const neighbors = adj[nodeId];

      if (!neighbors || neighbors.size === 0) continue;

      // Find neighbor communities
      const neighborCommunities = new Set<string>();
      for (const neighbor of neighbors) {
        neighborCommunities.add(nodeToCommunity.get(neighbor)!);
      }

      // Calculate modularity gain for each community
      let bestCommunity = currentCommunity;
      let bestGain = 0;

      for (const targetCommunity of neighborCommunities) {
        if (targetCommunity === currentCommunity) continue;

        // Simplified modularity gain calculation
        const gain = calculateModularityGain(
          nodeId,
          currentCommunity,
          targetCommunity,
          nodeToCommunity,
          weightedAdj,
          degrees,
        );

        if (gain > bestGain) {
          bestGain = gain;
          bestCommunity = targetCommunity;
        }
      }

      // Move node if beneficial
      if (bestCommunity !== currentCommunity) {
        nodeToCommunity.set(nodeId, bestCommunity);
        improved = true;
      }
    }
  }

  // Build result
  const communities: CommunityResult[] = [];
  const communityMap = new Map<string, string>();
  let communityIndex = 0;

  for (const [nodeId, commId] of nodeToCommunity.entries()) {
    if (!communityMap.has(commId)) {
      communityMap.set(commId, `community_${communityIndex++}`);
    }
    communities.push({
      nodeId,
      communityId: communityMap.get(commId)!,
    });
  }

  // Calculate sizes and densities
  const sizes: Record<string, number> = {};
  const densities: Record<string, number> = {};

  for (const communityId of communityMap.values()) {
    sizes[communityId] = communities.filter(
      (c) => c.communityId === communityId,
    ).length;
  }

  // Calculate densities
  for (const communityId of Object.keys(sizes)) {
    const nodesInCommunity = communities
      .filter((c) => c.communityId === communityId)
      .map((c) => c.nodeId);

    let internalEdges = 0;
    const possibleEdges =
      (nodesInCommunity.length * (nodesInCommunity.length - 1)) / 2;

    if (possibleEdges > 0) {
      const nodeSet = new Set(nodesInCommunity);
      for (const edge of graph.edges) {
        if (nodeSet.has(edge.fromId) && nodeSet.has(edge.toId)) {
          internalEdges++;
        }
      }
      densities[communityId] = internalEdges / possibleEdges;
    } else {
      densities[communityId] = 0;
    }
  }

  const modularityScore = calculateModularity(graph, communities);

  logger.info('Louvain completed', {
    iterations: iteration,
    communities: communityMap.size,
    modularity: modularityScore.toFixed(4),
  });

  return {
    communities,
    numCommunities: communityMap.size,
    modularityScore,
    sizes,
    densities,
  };
}

/**
 * Calculate modularity gain from moving a node to a different community
 */
function calculateModularityGain(
  nodeId: string,
  fromCommunity: string,
  toCommunity: string,
  nodeToCommunity: Map<string, string>,
  weightedAdj: WeightedAdjacency,
  degrees: Map<string, number>,
): number {
  // Simplified calculation - in production would use more precise formula
  const neighbors = weightedAdj[nodeId];
  if (!neighbors) return 0;

  let edgesToTarget = 0;
  let edgesFromCurrent = 0;

  for (const [neighbor, weight] of neighbors.entries()) {
    const neighborCommunity = nodeToCommunity.get(neighbor);
    if (neighborCommunity === toCommunity) {
      edgesToTarget += weight;
    }
    if (neighborCommunity === fromCommunity) {
      edgesFromCurrent += weight;
    }
  }

  // Positive gain if more connections to target community
  return edgesToTarget - edgesFromCurrent;
}

/**
 * Detect communities using specified algorithm
 */
export function detectCommunities(
  graph: Graph,
  algorithm: 'label_propagation' | 'louvain' = 'louvain',
): CommunitySummary {
  if (algorithm === 'label_propagation') {
    return labelPropagation(graph);
  } else {
    return louvainCommunityDetection(graph);
  }
}
