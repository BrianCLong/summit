/**
 * Betweenness Centrality Algorithm Implementation
 *
 * Betweenness centrality measures the extent to which a node lies on paths between
 * other nodes. High betweenness indicates a node that acts as a bridge between
 * different parts of the network - critical for intelligence analysis to identify
 * key intermediaries, information brokers, or potential single points of failure.
 *
 * This implementation uses Brandes' algorithm for efficient computation.
 *
 * @module algorithms/betweenness
 */

export interface BetweennessOptions {
  /**
   * Whether to normalize scores (divide by max possible betweenness)
   */
  normalized?: boolean;

  /**
   * Whether the graph is directed
   */
  directed?: boolean;

  /**
   * Weight property for weighted betweenness (empty for unweighted)
   */
  weightProperty?: string;

  /**
   * Whether to include edge betweenness
   */
  includeEdgeBetweenness?: boolean;

  /**
   * Sample size for approximate betweenness (null for exact)
   * For large graphs, sampling provides a good approximation faster
   */
  sampleSize?: number;
}

export interface BetweennessResult {
  /**
   * Map of node ID to betweenness centrality score
   */
  nodeBetweenness: Map<string, number>;

  /**
   * Map of edge (source-target) to betweenness score (if requested)
   */
  edgeBetweenness?: Map<string, number>;

  /**
   * Execution time in milliseconds
   */
  executionTime: number;

  /**
   * Whether scores are normalized
   */
  normalized: boolean;

  /**
   * Whether this is an approximate result
   */
  approximate: boolean;
}

interface GraphData {
  nodes: string[];
  edges: { source: string; target: string; weight?: number }[];
}

/**
 * Calculates betweenness centrality using Brandes' algorithm
 *
 * @param graph - Graph data with nodes and edges
 * @param options - Betweenness calculation options
 * @returns Betweenness centrality scores
 */
export function calculateBetweenness(
  graph: GraphData,
  options: BetweennessOptions = {},
): BetweennessResult {
  const startTime = performance.now();

  const {
    normalized = true,
    directed = false,
    weightProperty,
    includeEdgeBetweenness = false,
    sampleSize,
  } = options;

  const nodes = graph.nodes;
  const nodeCount = nodes.length;

  // Initialize betweenness scores
  const nodeBetweenness = new Map<string, number>();
  const edgeBetweenness = includeEdgeBetweenness ? new Map<string, number>() : undefined;

  for (const node of nodes) {
    nodeBetweenness.set(node, 0);
  }

  if (edgeBetweenness) {
    for (const edge of graph.edges) {
      const key = `${edge.source}->${edge.target}`;
      edgeBetweenness.set(key, 0);
      if (!directed) {
        edgeBetweenness.set(`${edge.target}->${edge.source}`, 0);
      }
    }
  }

  // Build adjacency list
  const adjacency = new Map<string, Map<string, number>>();
  for (const node of nodes) {
    adjacency.set(node, new Map());
  }

  for (const edge of graph.edges) {
    const weight = weightProperty && edge.weight ? edge.weight : 1;
    adjacency.get(edge.source)?.set(edge.target, weight);
    if (!directed) {
      adjacency.get(edge.target)?.set(edge.source, weight);
    }
  }

  // Determine which nodes to use as sources
  let sourceNodes = nodes;
  let approximate = false;
  if (sampleSize && sampleSize < nodeCount) {
    // Random sampling for approximate betweenness
    sourceNodes = sampleNodes(nodes, sampleSize);
    approximate = true;
  }

  // Brandes' algorithm: compute shortest path dependencies
  for (const source of sourceNodes) {
    // Initialize single-source shortest path data structures
    const stack: string[] = [];
    const predecessors = new Map<string, string[]>();
    const sigma = new Map<string, number>(); // number of shortest paths
    const distance = new Map<string, number>();

    for (const node of nodes) {
      predecessors.set(node, []);
      sigma.set(node, 0);
      distance.set(node, Infinity);
    }

    sigma.set(source, 1);
    distance.set(source, 0);

    // BFS or Dijkstra depending on weights
    if (weightProperty) {
      dijkstraTraversal(source, adjacency, distance, sigma, predecessors, stack);
    } else {
      bfsTraversal(source, adjacency, distance, sigma, predecessors, stack);
    }

    // Accumulation: back-propagate dependencies
    const delta = new Map<string, number>();
    for (const node of nodes) {
      delta.set(node, 0);
    }

    while (stack.length > 0) {
      const w = stack.pop()!;
      const wDelta = delta.get(w) || 0;
      const wSigma = sigma.get(w) || 1;

      for (const v of predecessors.get(w) || []) {
        const vSigma = sigma.get(v) || 1;
        const contribution = (vSigma / wSigma) * (1 + wDelta);
        delta.set(v, (delta.get(v) || 0) + contribution);

        // Edge betweenness
        if (edgeBetweenness) {
          const edgeKey = `${v}->${w}`;
          edgeBetweenness.set(edgeKey, (edgeBetweenness.get(edgeKey) || 0) + contribution);
        }
      }

      if (w !== source) {
        nodeBetweenness.set(w, (nodeBetweenness.get(w) || 0) + wDelta);
      }
    }
  }

  // Scale for approximate betweenness
  if (approximate && sampleSize) {
    const scaleFactor = nodeCount / sampleSize;
    for (const [node, score] of nodeBetweenness.entries()) {
      nodeBetweenness.set(node, score * scaleFactor);
    }
    if (edgeBetweenness) {
      for (const [edge, score] of edgeBetweenness.entries()) {
        edgeBetweenness.set(edge, score * scaleFactor);
      }
    }
  }

  // Normalization
  if (normalized && nodeCount > 2) {
    // Normalization factor depends on whether graph is directed
    const normFactor = directed
      ? (nodeCount - 1) * (nodeCount - 2)
      : (nodeCount - 1) * (nodeCount - 2) / 2;

    for (const [node, score] of nodeBetweenness.entries()) {
      nodeBetweenness.set(node, score / normFactor);
    }

    if (edgeBetweenness) {
      for (const [edge, score] of edgeBetweenness.entries()) {
        edgeBetweenness.set(edge, score / normFactor);
      }
    }
  }

  const executionTime = performance.now() - startTime;

  return {
    nodeBetweenness,
    edgeBetweenness,
    executionTime,
    normalized,
    approximate,
  };
}

/**
 * BFS traversal for unweighted shortest paths
 */
function bfsTraversal(
  source: string,
  adjacency: Map<string, Map<string, number>>,
  distance: Map<string, number>,
  sigma: Map<string, number>,
  predecessors: Map<string, string[]>,
  stack: string[],
): void {
  const queue: string[] = [source];

  while (queue.length > 0) {
    const v = queue.shift()!;
    stack.push(v);

    const vDistance = distance.get(v) || 0;
    const vSigma = sigma.get(v) || 0;

    for (const [w, _weight] of adjacency.get(v) || []) {
      const wDistance = distance.get(w) || Infinity;

      // First time visiting w
      if (wDistance === Infinity) {
        queue.push(w);
        distance.set(w, vDistance + 1);
      }

      // Shortest path to w via v
      if (wDistance === vDistance + 1) {
        sigma.set(w, (sigma.get(w) || 0) + vSigma);
        predecessors.get(w)?.push(v);
      }
    }
  }
}

/**
 * Dijkstra traversal for weighted shortest paths
 */
function dijkstraTraversal(
  source: string,
  adjacency: Map<string, Map<string, number>>,
  distance: Map<string, number>,
  sigma: Map<string, number>,
  predecessors: Map<string, string[]>,
  stack: string[],
): void {
  // Min-heap priority queue (simplified - for production use a proper heap)
  const queue: Array<{ node: string; dist: number }> = [{ node: source, dist: 0 }];
  const visited = new Set<string>();

  while (queue.length > 0) {
    // Extract min
    queue.sort((a, b) => a.dist - b.dist);
    const { node: v, dist: vDist } = queue.shift()!;

    if (visited.has(v)) continue;
    visited.add(v);
    stack.push(v);

    const vSigma = sigma.get(v) || 0;

    for (const [w, weight] of adjacency.get(v) || []) {
      const wDistance = distance.get(w) || Infinity;
      const altDistance = vDist + weight;

      // Found shorter path to w
      if (altDistance < wDistance) {
        distance.set(w, altDistance);
        sigma.set(w, vSigma);
        predecessors.set(w, [v]);
        queue.push({ node: w, dist: altDistance });
      }
      // Found another shortest path to w
      else if (altDistance === wDistance) {
        sigma.set(w, (sigma.get(w) || 0) + vSigma);
        predecessors.get(w)?.push(v);
      }
    }
  }
}

/**
 * Randomly sample nodes from the graph
 */
function sampleNodes(nodes: string[], sampleSize: number): string[] {
  const shuffled = [...nodes];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.min(sampleSize, nodes.length));
}

/**
 * Identifies bridge nodes - nodes with highest betweenness
 * These are critical intermediaries in the network
 */
export function findBridgeNodes(
  result: BetweennessResult,
  threshold: number = 0.1,
): Array<{ node: string; score: number }> {
  const bridges = Array.from(result.nodeBetweenness.entries())
    .filter(([_, score]) => score >= threshold)
    .map(([node, score]) => ({ node, score }))
    .sort((a, b) => b.score - a.score);

  return bridges;
}

/**
 * Calculates the vulnerability of the network by identifying critical nodes
 * whose removal would most disrupt shortest paths
 */
export function calculateNetworkVulnerability(
  result: BetweennessResult,
): {
  maxBetweenness: number;
  vulnerabilityScore: number;
  criticalNodes: string[];
} {
  const scores = Array.from(result.nodeBetweenness.values());
  const maxBetweenness = Math.max(...scores, 0);
  const avgBetweenness = scores.reduce((sum, s) => sum + s, 0) / scores.length;

  // Vulnerability is high when betweenness is concentrated in few nodes
  const variance =
    scores.reduce((sum, s) => sum + Math.pow(s - avgBetweenness, 2), 0) / scores.length;
  const stdDev = Math.sqrt(variance);

  // Nodes with betweenness > mean + 2*stdDev are critical
  const threshold = avgBetweenness + 2 * stdDev;
  const criticalNodes = Array.from(result.nodeBetweenness.entries())
    .filter(([_, score]) => score >= threshold)
    .map(([node, _]) => node);

  // Vulnerability score: higher when more betweenness is concentrated
  const vulnerabilityScore = maxBetweenness > 0 ? stdDev / avgBetweenness : 0;

  return {
    maxBetweenness,
    vulnerabilityScore,
    criticalNodes,
  };
}
