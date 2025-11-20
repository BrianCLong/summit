/**
 * Community Detection Algorithms
 *
 * Implements Louvain and Label Propagation algorithms for detecting communities
 * in intelligence networks. Communities reveal organizational structures, cells,
 * operational groups, and other clustered relationships.
 *
 * @module algorithms/community-detection
 */

export interface GraphData {
  nodes: string[];
  edges: { source: string; target: string; weight?: number }[];
}

export interface CommunityDetectionResult {
  /**
   * Map of node ID to community ID
   */
  communities: Map<string, number>;

  /**
   * Number of communities detected
   */
  numCommunities: number;

  /**
   * Modularity score (quality of community structure, -0.5 to 1.0)
   */
  modularity: number;

  /**
   * Community sizes (community ID -> node count)
   */
  communitySizes: Map<number, number>;

  /**
   * Execution time in milliseconds
   */
  executionTime: number;

  /**
   * Algorithm-specific metadata
   */
  metadata?: Record<string, any>;
}

export interface LouvainOptions {
  /**
   * Weight property for edges
   */
  weightProperty?: string;

  /**
   * Minimum modularity gain to continue optimization
   */
  minModularityGain?: number;

  /**
   * Maximum number of iterations per level
   */
  maxIterations?: number;

  /**
   * Resolution parameter (higher = more communities)
   */
  resolution?: number;
}

export interface LabelPropagationOptions {
  /**
   * Maximum number of iterations
   */
  maxIterations?: number;

  /**
   * Seed for random number generator (for reproducibility)
   */
  seed?: number;

  /**
   * Weight property for edges
   */
  weightProperty?: string;
}

/**
 * Louvain Method for Community Detection
 *
 * Hierarchical algorithm that optimizes modularity through iterative local moves.
 * Considered one of the best algorithms for large-scale networks.
 *
 * @param graph - Graph data
 * @param options - Louvain algorithm options
 * @returns Community detection results
 */
export function detectCommunitiesLouvain(
  graph: GraphData,
  options: LouvainOptions = {},
): CommunityDetectionResult {
  const startTime = performance.now();

  const {
    weightProperty,
    minModularityGain = 0.0001,
    maxIterations = 100,
    resolution = 1.0,
  } = options;

  const nodes = graph.nodes;

  // Initialize each node in its own community
  const nodeToCommunity = new Map<string, number>();
  const nodeIndex = new Map<string, number>();

  nodes.forEach((node, index) => {
    nodeToCommunity.set(node, index);
    nodeIndex.set(node, index);
  });

  // Build weighted adjacency structure
  const edges = buildEdgeStructure(graph, weightProperty);
  const nodeWeights = calculateNodeWeights(nodes, edges);
  const totalWeight = calculateTotalWeight(edges);

  let currentModularity = calculateModularity(
    nodeToCommunity,
    edges,
    nodeWeights,
    totalWeight,
    resolution,
  );

  let improved = true;
  let level = 0;
  const hierarchyLevels: Array<Map<string, number>> = [];

  // Multi-level optimization
  while (improved && level < 10) {
    improved = false;
    let localImproved = true;
    let iteration = 0;

    // Phase 1: Optimize modularity by moving nodes
    while (localImproved && iteration < maxIterations) {
      localImproved = false;
      iteration++;

      // Process nodes in random order
      const shuffledNodes = shuffleArray([...nodes]);

      for (const node of shuffledNodes) {
        const currentCommunity = nodeToCommunity.get(node)!;

        // Find best community for this node
        const neighborCommunities = getNeighborCommunities(node, edges, nodeToCommunity);
        let bestCommunity = currentCommunity;
        let bestGain = 0;

        for (const [community, _] of neighborCommunities) {
          const gain = modularityGain(
            node,
            currentCommunity,
            community,
            nodeToCommunity,
            edges,
            nodeWeights,
            totalWeight,
            resolution,
          );

          if (gain > bestGain) {
            bestGain = gain;
            bestCommunity = community;
          }
        }

        // Move node to best community if it improves modularity
        if (bestGain > minModularityGain && bestCommunity !== currentCommunity) {
          nodeToCommunity.set(node, bestCommunity);
          localImproved = true;
          improved = true;
        }
      }
    }

    // Calculate new modularity
    const newModularity = calculateModularity(
      nodeToCommunity,
      edges,
      nodeWeights,
      totalWeight,
      resolution,
    );

    if (newModularity - currentModularity < minModularityGain) {
      break;
    }

    currentModularity = newModularity;
    hierarchyLevels.push(new Map(nodeToCommunity));

    // Phase 2: Build aggregate graph
    // (In production, would implement full graph coarsening)

    level++;
  }

  // Renumber communities to be sequential
  const communityMapping = renumberCommunities(nodeToCommunity);
  const numCommunities = new Set(communityMapping.values()).size;
  const communitySizes = calculateCommunitySizes(communityMapping);

  const executionTime = performance.now() - startTime;

  return {
    communities: communityMapping,
    numCommunities,
    modularity: currentModularity,
    communitySizes,
    executionTime,
    metadata: {
      levels: level,
      iterations: hierarchyLevels.length,
    },
  };
}

/**
 * Label Propagation Algorithm for Community Detection
 *
 * Fast algorithm where nodes iteratively adopt the most common label among
 * their neighbors. Simple but effective, especially for large networks.
 *
 * @param graph - Graph data
 * @param options - Label propagation options
 * @returns Community detection results
 */
export function detectCommunitiesLabelPropagation(
  graph: GraphData,
  options: LabelPropagationOptions = {},
): CommunityDetectionResult {
  const startTime = performance.now();

  const {
    maxIterations = 100,
    seed = Date.now(),
    weightProperty,
  } = options;

  const nodes = graph.nodes;

  // Initialize each node with its own label
  const nodeLabels = new Map<string, number>();
  nodes.forEach((node, index) => {
    nodeLabels.set(node, index);
  });

  // Build adjacency with weights
  const adjacency = new Map<string, Map<string, number>>();
  for (const node of nodes) {
    adjacency.set(node, new Map());
  }

  for (const edge of graph.edges) {
    const weight = weightProperty && edge.weight ? edge.weight : 1;
    adjacency.get(edge.source)?.set(edge.target, weight);
    adjacency.get(edge.target)?.set(edge.source, weight);
  }

  // Set up RNG with seed for reproducibility
  let rngState = seed;
  const random = () => {
    rngState = (rngState * 9301 + 49297) % 233280;
    return rngState / 233280;
  };

  let changed = true;
  let iteration = 0;

  // Iteratively propagate labels
  while (changed && iteration < maxIterations) {
    changed = false;
    iteration++;

    // Process nodes in random order
    const shuffledNodes = shuffleArray([...nodes], random);

    for (const node of shuffledNodes) {
      const neighbors = adjacency.get(node) || new Map();

      if (neighbors.size === 0) continue;

      // Count label frequencies weighted by edge weight
      const labelWeights = new Map<number, number>();

      for (const [neighbor, weight] of neighbors) {
        const label = nodeLabels.get(neighbor);
        if (label !== undefined) {
          labelWeights.set(label, (labelWeights.get(label) || 0) + weight);
        }
      }

      // Find most common label(s)
      let maxWeight = 0;
      const bestLabels: number[] = [];

      for (const [label, weight] of labelWeights) {
        if (weight > maxWeight) {
          maxWeight = weight;
          bestLabels.length = 0;
          bestLabels.push(label);
        } else if (weight === maxWeight) {
          bestLabels.push(label);
        }
      }

      // Choose randomly among tied labels
      if (bestLabels.length > 0) {
        const newLabel = bestLabels[Math.floor(random() * bestLabels.length)];
        const currentLabel = nodeLabels.get(node);

        if (newLabel !== currentLabel) {
          nodeLabels.set(node, newLabel);
          changed = true;
        }
      }
    }
  }

  // Renumber communities
  const communities = renumberCommunities(nodeLabels);
  const numCommunities = new Set(communities.values()).size;
  const communitySizes = calculateCommunitySizes(communities);

  // Calculate modularity
  const edges = buildEdgeStructure(graph, weightProperty);
  const nodeWeights = calculateNodeWeights(nodes, edges);
  const totalWeight = calculateTotalWeight(edges);
  const modularity = calculateModularity(communities, edges, nodeWeights, totalWeight, 1.0);

  const executionTime = performance.now() - startTime;

  return {
    communities,
    numCommunities,
    modularity,
    communitySizes,
    executionTime,
    metadata: {
      iterations: iteration,
      converged: !changed,
    },
  };
}

// Helper functions

interface EdgeStructure {
  nodes: Map<string, Map<string, number>>;
}

function buildEdgeStructure(graph: GraphData, weightProperty?: string): EdgeStructure {
  const structure: EdgeStructure = {
    nodes: new Map(),
  };

  for (const node of graph.nodes) {
    structure.nodes.set(node, new Map());
  }

  for (const edge of graph.edges) {
    const weight = weightProperty && edge.weight ? edge.weight : 1;
    structure.nodes.get(edge.source)?.set(edge.target, weight);
    structure.nodes.get(edge.target)?.set(edge.source, weight);
  }

  return structure;
}

function calculateNodeWeights(
  nodes: string[],
  edges: EdgeStructure,
): Map<string, number> {
  const weights = new Map<string, number>();

  for (const node of nodes) {
    const neighbors = edges.nodes.get(node) || new Map();
    const weight = Array.from(neighbors.values()).reduce((sum, w) => sum + w, 0);
    weights.set(node, weight);
  }

  return weights;
}

function calculateTotalWeight(edges: EdgeStructure): number {
  let total = 0;
  for (const neighbors of edges.nodes.values()) {
    for (const weight of neighbors.values()) {
      total += weight;
    }
  }
  return total / 2; // Each edge counted twice
}

function calculateModularity(
  communities: Map<string, number>,
  edges: EdgeStructure,
  nodeWeights: Map<string, number>,
  totalWeight: number,
  resolution: number,
): number {
  if (totalWeight === 0) return 0;

  // Calculate sum of weights within each community
  let modularity = 0;
  const communityWeights = new Map<number, number>();

  // Calculate total weight per community
  for (const [node, community] of communities) {
    const weight = nodeWeights.get(node) || 0;
    communityWeights.set(community, (communityWeights.get(community) || 0) + weight);
  }

  // Calculate modularity
  for (const [node, community] of communities) {
    const neighbors = edges.nodes.get(node) || new Map();

    for (const [neighbor, weight] of neighbors) {
      const neighborCommunity = communities.get(neighbor);

      if (community === neighborCommunity) {
        const ki = nodeWeights.get(node) || 0;
        const kj = nodeWeights.get(neighbor) || 0;
        const expected = (ki * kj) / (2 * totalWeight);

        modularity += (weight - resolution * expected) / (2 * totalWeight);
      }
    }
  }

  return modularity;
}

function modularityGain(
  node: string,
  fromCommunity: number,
  toCommunity: number,
  communities: Map<string, number>,
  edges: EdgeStructure,
  nodeWeights: Map<string, number>,
  totalWeight: number,
  resolution: number,
): number {
  if (fromCommunity === toCommunity) return 0;

  const neighbors = edges.nodes.get(node) || new Map();
  const nodeWeight = nodeWeights.get(node) || 0;

  // Weight of edges to nodes in target community
  let weightToCommunity = 0;
  let weightFromCommunity = 0;

  for (const [neighbor, weight] of neighbors) {
    const neighborCommunity = communities.get(neighbor);
    if (neighborCommunity === toCommunity) {
      weightToCommunity += weight;
    } else if (neighborCommunity === fromCommunity) {
      weightFromCommunity += weight;
    }
  }

  // Calculate gain
  const gain =
    (weightToCommunity - weightFromCommunity) / (2 * totalWeight) -
    resolution * (nodeWeight * nodeWeight) / (4 * totalWeight * totalWeight);

  return gain;
}

function getNeighborCommunities(
  node: string,
  edges: EdgeStructure,
  communities: Map<string, number>,
): Map<number, number> {
  const neighborCommunities = new Map<number, number>();
  const neighbors = edges.nodes.get(node) || new Map();

  for (const [neighbor, weight] of neighbors) {
    const community = communities.get(neighbor);
    if (community !== undefined) {
      neighborCommunities.set(community, (neighborCommunities.get(community) || 0) + weight);
    }
  }

  return neighborCommunities;
}

function renumberCommunities(communities: Map<string, number>): Map<string, number> {
  const uniqueCommunities = Array.from(new Set(communities.values())).sort((a, b) => a - b);
  const mapping = new Map<number, number>();

  uniqueCommunities.forEach((oldId, newId) => {
    mapping.set(oldId, newId);
  });

  const renumbered = new Map<string, number>();
  for (const [node, oldCommunity] of communities) {
    renumbered.set(node, mapping.get(oldCommunity) || 0);
  }

  return renumbered;
}

function calculateCommunitySizes(communities: Map<string, number>): Map<number, number> {
  const sizes = new Map<number, number>();

  for (const community of communities.values()) {
    sizes.set(community, (sizes.get(community) || 0) + 1);
  }

  return sizes;
}

function shuffleArray<T>(array: T[], random: () => number = Math.random): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Analyzes community structure quality and characteristics
 */
export function analyzeCommunityStructure(result: CommunityDetectionResult, graph: GraphData): {
  avgCommunitySize: number;
  largestCommunity: number;
  smallestCommunity: number;
  modularityClass: 'weak' | 'moderate' | 'strong';
  interCommunityEdges: number;
  intraCommunityEdges: number;
} {
  const sizes = Array.from(result.communitySizes.values());
  const avgCommunitySize = sizes.reduce((sum, size) => sum + size, 0) / sizes.length;
  const largestCommunity = Math.max(...sizes);
  const smallestCommunity = Math.min(...sizes);

  let modularityClass: 'weak' | 'moderate' | 'strong';
  if (result.modularity < 0.3) {
    modularityClass = 'weak';
  } else if (result.modularity < 0.7) {
    modularityClass = 'moderate';
  } else {
    modularityClass = 'strong';
  }

  // Count inter vs intra community edges
  let interCommunityEdges = 0;
  let intraCommunityEdges = 0;

  for (const edge of graph.edges) {
    const sourceCommunity = result.communities.get(edge.source);
    const targetCommunity = result.communities.get(edge.target);

    if (sourceCommunity === targetCommunity) {
      intraCommunityEdges++;
    } else {
      interCommunityEdges++;
    }
  }

  return {
    avgCommunitySize,
    largestCommunity,
    smallestCommunity,
    modularityClass,
    interCommunityEdges,
    intraCommunityEdges,
  };
}
