/**
 * Centrality and influence metrics for network analysis
 */

import type { Graph, CentralityScores } from './types.js';
import { GraphBuilder } from './GraphBuilder.js';

export class CentralityMetrics {
  private graph: Graph;
  private adjList: Map<string, Set<string>>;

  constructor(graph: Graph) {
    this.graph = graph;
    const builder = new GraphBuilder(graph.directed, graph.weighted);
    builder['graph'] = graph;
    this.adjList = builder.getAdjacencyList();
  }

  /**
   * Calculate degree centrality for all nodes
   */
  degreeCentrality(): Map<string, number> {
    const scores = new Map<string, number>();
    const n = this.graph.nodes.size;

    this.graph.nodes.forEach((_, nodeId) => {
      const neighbors = this.adjList.get(nodeId) || new Set();
      const degree = neighbors.size;
      // Normalize by (n-1)
      scores.set(nodeId, n > 1 ? degree / (n - 1) : 0);
    });

    return scores;
  }

  /**
   * Calculate betweenness centrality using Brandes' algorithm
   */
  betweennessCentrality(): Map<string, number> {
    const betweenness = new Map<string, number>();

    // Initialize all scores to 0
    this.graph.nodes.forEach((_, nodeId) => {
      betweenness.set(nodeId, 0);
    });

    // For each node as source
    this.graph.nodes.forEach((_, source) => {
      // BFS to compute shortest paths
      const stack: string[] = [];
      const paths = new Map<string, string[][]>();
      const sigma = new Map<string, number>();
      const distance = new Map<string, number>();
      const delta = new Map<string, number>();

      this.graph.nodes.forEach((_, v) => {
        paths.set(v, []);
        sigma.set(v, 0);
        distance.set(v, -1);
        delta.set(v, 0);
      });

      sigma.set(source, 1);
      distance.set(source, 0);

      const queue: string[] = [source];

      while (queue.length > 0) {
        const v = queue.shift()!;
        stack.push(v);

        const neighbors = this.adjList.get(v) || new Set();
        neighbors.forEach(w => {
          // First time we see w?
          if (distance.get(w)! < 0) {
            queue.push(w);
            distance.set(w, distance.get(v)! + 1);
          }

          // Is this a shortest path to w?
          if (distance.get(w) === distance.get(v)! + 1) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            paths.get(w)!.push([v]);
          }
        });
      }

      // Accumulation
      while (stack.length > 0) {
        const w = stack.pop()!;
        const predecessors = paths.get(w)!;

        predecessors.forEach(([v]) => {
          const coefficient = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
          delta.set(v, delta.get(v)! + coefficient);
        });

        if (w !== source) {
          betweenness.set(w, betweenness.get(w)! + delta.get(w)!);
        }
      }
    });

    // Normalize
    const n = this.graph.nodes.size;
    const normFactor = this.graph.directed ? (n - 1) * (n - 2) : (n - 1) * (n - 2) / 2;

    if (normFactor > 0) {
      betweenness.forEach((value, key) => {
        betweenness.set(key, value / normFactor);
      });
    }

    return betweenness;
  }

  /**
   * Calculate closeness centrality
   */
  closenessCentrality(): Map<string, number> {
    const closeness = new Map<string, number>();

    this.graph.nodes.forEach((_, source) => {
      const distances = this.bfs(source);
      let totalDistance = 0;
      let reachable = 0;

      distances.forEach((dist, target) => {
        if (dist > 0 && dist < Infinity) {
          totalDistance += dist;
          reachable++;
        }
      });

      if (reachable > 0) {
        // Wasserman-Faust normalization
        const n = this.graph.nodes.size;
        closeness.set(source, (reachable * reachable) / ((n - 1) * totalDistance));
      } else {
        closeness.set(source, 0);
      }
    });

    return closeness;
  }

  /**
   * Calculate harmonic centrality (alternative to closeness)
   */
  harmonicCentrality(): Map<string, number> {
    const harmonic = new Map<string, number>();

    this.graph.nodes.forEach((_, source) => {
      const distances = this.bfs(source);
      let harmonicSum = 0;

      distances.forEach((dist, target) => {
        if (dist > 0 && dist < Infinity) {
          harmonicSum += 1 / dist;
        }
      });

      const n = this.graph.nodes.size;
      harmonic.set(source, n > 1 ? harmonicSum / (n - 1) : 0);
    });

    return harmonic;
  }

  /**
   * Calculate eigenvector centrality using power iteration
   */
  eigenvectorCentrality(maxIterations = 100, tolerance = 1e-6): Map<string, number> {
    const n = this.graph.nodes.size;
    const nodeIds = Array.from(this.graph.nodes.keys());

    // Initialize centrality scores
    let scores = new Map<string, number>();
    nodeIds.forEach(id => scores.set(id, 1 / Math.sqrt(n)));

    for (let iter = 0; iter < maxIterations; iter++) {
      const newScores = new Map<string, number>();
      let norm = 0;

      // Calculate new scores
      nodeIds.forEach(nodeId => {
        let sum = 0;
        const neighbors = this.adjList.get(nodeId) || new Set();

        neighbors.forEach(neighbor => {
          sum += scores.get(neighbor) || 0;
        });

        newScores.set(nodeId, sum);
        norm += sum * sum;
      });

      // Normalize
      norm = Math.sqrt(norm);
      if (norm > 0) {
        newScores.forEach((value, key) => {
          newScores.set(key, value / norm);
        });
      }

      // Check convergence
      let maxDiff = 0;
      nodeIds.forEach(id => {
        const diff = Math.abs((newScores.get(id) || 0) - (scores.get(id) || 0));
        maxDiff = Math.max(maxDiff, diff);
      });

      scores = newScores;

      if (maxDiff < tolerance) {
        break;
      }
    }

    return scores;
  }

  /**
   * Calculate PageRank
   */
  pageRank(dampingFactor = 0.85, maxIterations = 100, tolerance = 1e-6): Map<string, number> {
    const n = this.graph.nodes.size;
    const nodeIds = Array.from(this.graph.nodes.keys());

    // Initialize scores
    let scores = new Map<string, number>();
    nodeIds.forEach(id => scores.set(id, 1 / n));

    // Calculate out-degrees
    const outDegrees = new Map<string, number>();
    nodeIds.forEach(id => {
      const neighbors = this.adjList.get(id) || new Set();
      outDegrees.set(id, neighbors.size);
    });

    for (let iter = 0; iter < maxIterations; iter++) {
      const newScores = new Map<string, number>();

      nodeIds.forEach(nodeId => {
        let sum = 0;

        // Sum contributions from in-neighbors
        this.graph.nodes.forEach((_, otherId) => {
          const neighbors = this.adjList.get(otherId) || new Set();
          if (neighbors.has(nodeId)) {
            const outDegree = outDegrees.get(otherId) || 1;
            sum += (scores.get(otherId) || 0) / outDegree;
          }
        });

        newScores.set(nodeId, (1 - dampingFactor) / n + dampingFactor * sum);
      });

      // Check convergence
      let maxDiff = 0;
      nodeIds.forEach(id => {
        const diff = Math.abs((newScores.get(id) || 0) - (scores.get(id) || 0));
        maxDiff = Math.max(maxDiff, diff);
      });

      scores = newScores;

      if (maxDiff < tolerance) {
        break;
      }
    }

    return scores;
  }

  /**
   * Calculate Katz centrality
   */
  katzCentrality(alpha = 0.1, beta = 1, maxIterations = 100, tolerance = 1e-6): Map<string, number> {
    const nodeIds = Array.from(this.graph.nodes.keys());

    // Initialize scores
    let scores = new Map<string, number>();
    nodeIds.forEach(id => scores.set(id, beta));

    for (let iter = 0; iter < maxIterations; iter++) {
      const newScores = new Map<string, number>();

      nodeIds.forEach(nodeId => {
        let sum = beta;

        // Sum contributions from neighbors
        this.graph.nodes.forEach((_, otherId) => {
          const neighbors = this.adjList.get(otherId) || new Set();
          if (neighbors.has(nodeId)) {
            sum += alpha * (scores.get(otherId) || 0);
          }
        });

        newScores.set(nodeId, sum);
      });

      // Check convergence
      let maxDiff = 0;
      nodeIds.forEach(id => {
        const diff = Math.abs((newScores.get(id) || 0) - (scores.get(id) || 0));
        maxDiff = Math.max(maxDiff, diff);
      });

      scores = newScores;

      if (maxDiff < tolerance) {
        break;
      }
    }

    return scores;
  }

  /**
   * Calculate all centrality metrics for a node
   */
  calculateAllMetrics(nodeId: string): CentralityScores {
    const degree = this.degreeCentrality().get(nodeId) || 0;
    const betweenness = this.betweennessCentrality().get(nodeId) || 0;
    const closeness = this.closenessCentrality().get(nodeId) || 0;
    const eigenvector = this.eigenvectorCentrality().get(nodeId) || 0;
    const pageRank = this.pageRank().get(nodeId) || 0;
    const katz = this.katzCentrality().get(nodeId) || 0;
    const harmonic = this.harmonicCentrality().get(nodeId) || 0;

    return {
      nodeId,
      degree,
      betweenness,
      closeness,
      eigenvector,
      pageRank,
      katz,
      harmonic
    };
  }

  /**
   * BFS for shortest path distances
   */
  private bfs(source: string): Map<string, number> {
    const distances = new Map<string, number>();
    this.graph.nodes.forEach((_, id) => {
      distances.set(id, Infinity);
    });
    distances.set(source, 0);

    const queue: string[] = [source];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDist = distances.get(current)!;
      const neighbors = this.adjList.get(current) || new Set();

      neighbors.forEach(neighbor => {
        if (distances.get(neighbor) === Infinity) {
          distances.set(neighbor, currentDist + 1);
          queue.push(neighbor);
        }
      });
    }

    return distances;
  }
}
