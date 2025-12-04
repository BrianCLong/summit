import { Graph, CentralityScores, CentralityResult } from '../types/analytics';
import { logger } from '../utils/logger';

/**
 * Centrality Algorithms
 *
 * Implements degree, betweenness, closeness, and eigenvector centrality
 */

interface AdjacencyMap {
  [nodeId: string]: string[];
}

/**
 * Build adjacency map from graph
 */
function buildAdjacencyMap(graph: Graph): AdjacencyMap {
  const adj: AdjacencyMap = {};

  for (const node of graph.nodes) {
    adj[node.id] = [];
  }

  for (const edge of graph.edges) {
    if (!adj[edge.fromId]) adj[edge.fromId] = [];
    if (!adj[edge.toId]) adj[edge.toId] = [];

    adj[edge.fromId].push(edge.toId);
    // Assuming undirected for most centrality calculations
    adj[edge.toId].push(edge.fromId);
  }

  return adj;
}

/**
 * Calculate degree centrality for all nodes
 */
export function calculateDegreeCentrality(graph: Graph): Record<string, number> {
  const degree: Record<string, number> = {};

  // Initialize all nodes with degree 0
  for (const node of graph.nodes) {
    degree[node.id] = 0;
  }

  // Count edges
  for (const edge of graph.edges) {
    if (degree[edge.fromId] !== undefined) {
      degree[edge.fromId]++;
    }
    if (degree[edge.toId] !== undefined) {
      degree[edge.toId]++;
    }
  }

  return degree;
}

/**
 * Calculate betweenness centrality using Brandes' algorithm
 */
export function calculateBetweennessCentrality(
  graph: Graph,
): Record<string, number> {
  const adj = buildAdjacencyMap(graph);
  const nodeIds = graph.nodes.map((n) => n.id);
  const betweenness: Record<string, number> = {};

  // Initialize betweenness scores
  for (const nodeId of nodeIds) {
    betweenness[nodeId] = 0;
  }

  // For each node as source
  for (const source of nodeIds) {
    const stack: string[] = [];
    const predecessors: Record<string, string[]> = {};
    const sigma: Record<string, number> = {};
    const distance: Record<string, number> = {};

    for (const nodeId of nodeIds) {
      predecessors[nodeId] = [];
      sigma[nodeId] = 0;
      distance[nodeId] = -1;
    }

    sigma[source] = 1;
    distance[source] = 0;

    const queue: string[] = [source];

    // BFS
    while (queue.length > 0) {
      const v = queue.shift()!;
      stack.push(v);

      const neighbors = adj[v] || [];
      for (const w of neighbors) {
        // First time we see this node?
        if (distance[w] < 0) {
          queue.push(w);
          distance[w] = distance[v] + 1;
        }

        // Shortest path to w via v?
        if (distance[w] === distance[v] + 1) {
          sigma[w] += sigma[v];
          predecessors[w].push(v);
        }
      }
    }

    // Accumulation
    const delta: Record<string, number> = {};
    for (const nodeId of nodeIds) {
      delta[nodeId] = 0;
    }

    // Stack returns vertices in order of non-increasing distance from source
    while (stack.length > 0) {
      const w = stack.pop()!;
      for (const v of predecessors[w]) {
        delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
      }
      if (w !== source) {
        betweenness[w] += delta[w];
      }
    }
  }

  // Normalize by dividing by 2 (for undirected graphs)
  for (const nodeId of nodeIds) {
    betweenness[nodeId] /= 2;
  }

  return betweenness;
}

/**
 * Calculate closeness centrality
 */
export function calculateClosenessCentrality(
  graph: Graph,
): Record<string, number> {
  const adj = buildAdjacencyMap(graph);
  const nodeIds = graph.nodes.map((n) => n.id);
  const closeness: Record<string, number> = {};

  for (const source of nodeIds) {
    // BFS to calculate distances
    const distance: Record<string, number> = {};
    for (const nodeId of nodeIds) {
      distance[nodeId] = -1;
    }

    distance[source] = 0;
    const queue: string[] = [source];

    while (queue.length > 0) {
      const v = queue.shift()!;
      const neighbors = adj[v] || [];

      for (const w of neighbors) {
        if (distance[w] < 0) {
          distance[w] = distance[v] + 1;
          queue.push(w);
        }
      }
    }

    // Calculate closeness (inverse of average distance)
    let totalDistance = 0;
    let reachableNodes = 0;

    for (const nodeId of nodeIds) {
      if (nodeId !== source && distance[nodeId] > 0) {
        totalDistance += distance[nodeId];
        reachableNodes++;
      }
    }

    if (reachableNodes > 0) {
      closeness[source] = reachableNodes / totalDistance;
    } else {
      closeness[source] = 0;
    }
  }

  return closeness;
}

/**
 * Calculate eigenvector centrality using power iteration
 */
export function calculateEigenvectorCentrality(
  graph: Graph,
  maxIterations: number = 100,
  tolerance: number = 1e-6,
): Record<string, number> {
  const adj = buildAdjacencyMap(graph);
  const nodeIds = graph.nodes.map((n) => n.id);
  const n = nodeIds.length;

  if (n === 0) return {};

  // Initialize scores
  let scores: Record<string, number> = {};
  for (const nodeId of nodeIds) {
    scores[nodeId] = 1 / Math.sqrt(n);
  }

  // Power iteration
  for (let iter = 0; iter < maxIterations; iter++) {
    const newScores: Record<string, number> = {};
    let maxChange = 0;

    for (const nodeId of nodeIds) {
      let sum = 0;
      const neighbors = adj[nodeId] || [];

      for (const neighbor of neighbors) {
        sum += scores[neighbor] || 0;
      }

      newScores[nodeId] = sum;
    }

    // Normalize
    const norm = Math.sqrt(
      Object.values(newScores).reduce((sum, val) => sum + val * val, 0),
    );

    if (norm > 0) {
      for (const nodeId of nodeIds) {
        newScores[nodeId] /= norm;
        maxChange = Math.max(
          maxChange,
          Math.abs(newScores[nodeId] - scores[nodeId]),
        );
      }
    }

    scores = newScores;

    if (maxChange < tolerance) {
      logger.debug(`Eigenvector centrality converged in ${iter + 1} iterations`);
      break;
    }
  }

  return scores;
}

/**
 * Compute all centrality metrics and return organized results
 */
export function computeCentrality(
  graph: Graph,
  options?: {
    includeEigenvector?: boolean;
    includeCloseness?: boolean;
    topN?: number;
  },
): CentralityResult {
  const startTime = Date.now();
  const topN = options?.topN || 10;

  logger.info('Computing centrality metrics', {
    nodes: graph.nodes.length,
    edges: graph.edges.length,
  });

  // Degree centrality
  const degree = calculateDegreeCentrality(graph);

  // Betweenness centrality
  const betweenness = calculateBetweennessCentrality(graph);

  // Optional: Eigenvector centrality
  let eigenvector: Record<string, number> | undefined;
  if (options?.includeEigenvector) {
    eigenvector = calculateEigenvectorCentrality(graph);
  }

  // Optional: Closeness centrality
  let closeness: Record<string, number> | undefined;
  if (options?.includeCloseness) {
    closeness = calculateClosenessCentrality(graph);
  }

  // Get top N nodes for each metric
  const sortByValue = (
    scores: Record<string, number>,
    n: number,
  ): string[] => {
    return Object.entries(scores)
      .sort(([, a], [, b]) => b - a)
      .slice(0, n)
      .map(([nodeId]) => nodeId);
  };

  const topByDegree = sortByValue(degree, topN);
  const topByBetweenness = sortByValue(betweenness, topN);
  const topByEigenvector = eigenvector
    ? sortByValue(eigenvector, topN)
    : undefined;
  const topByCloseness = closeness ? sortByValue(closeness, topN) : undefined;

  // Calculate stats
  const degreeValues = Object.values(degree);
  const betweennessValues = Object.values(betweenness);

  const avgDegree =
    degreeValues.reduce((sum, val) => sum + val, 0) / degreeValues.length;
  const maxDegree = Math.max(...degreeValues);
  const avgBetweenness =
    betweennessValues.reduce((sum, val) => sum + val, 0) /
    betweennessValues.length;
  const maxBetweenness = Math.max(...betweennessValues);

  const result: CentralityResult = {
    scores: {
      degree,
      betweenness,
      eigenvector,
      closeness,
    },
    summaries: {
      topByDegree,
      topByBetweenness,
      topByEigenvector,
      topByCloseness,
    },
    stats: {
      avgDegree,
      maxDegree,
      avgBetweenness,
      maxBetweenness,
    },
  };

  const elapsed = Date.now() - startTime;
  logger.info('Centrality metrics computed', {
    elapsed: `${elapsed}ms`,
    topByDegree: topByDegree.slice(0, 3),
  });

  return result;
}
