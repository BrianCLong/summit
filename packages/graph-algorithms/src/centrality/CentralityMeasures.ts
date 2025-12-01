/**
 * Centrality Measures
 * PageRank, Betweenness, Closeness, Eigenvector centrality
 */

import type { GraphStorage } from '@intelgraph/graph-database';

export interface CentralityResult {
  nodeId: string;
  score: number;
}

export class CentralityMeasures {
  constructor(private storage: GraphStorage) {}

  /**
   * PageRank algorithm
   */
  pageRank(dampingFactor: number = 0.85, maxIterations: number = 100, tolerance: number = 1e-6): Map<string, number> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const n = nodes.length;

    if (n === 0) return new Map();

    // Initialize PageRank values
    const pageRank = new Map<string, number>();
    const newPageRank = new Map<string, number>();

    for (const node of nodes) {
      pageRank.set(node.id, 1 / n);
    }

    // Iterate
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let delta = 0;

      for (const node of nodes) {
        let sum = 0;

        // Sum contributions from incoming nodes
        const incoming = this.storage.getIncomingEdges(node.id);
        for (const edge of incoming) {
          const sourceRank = pageRank.get(edge.sourceId) ?? 0;
          const outDegree = this.storage.getDegree(edge.sourceId, 'out');
          if (outDegree > 0) {
            sum += sourceRank / outDegree;
          }
        }

        const newRank = (1 - dampingFactor) / n + dampingFactor * sum;
        newPageRank.set(node.id, newRank);

        delta += Math.abs(newRank - (pageRank.get(node.id) ?? 0));
      }

      // Update PageRank values
      for (const node of nodes) {
        pageRank.set(node.id, newPageRank.get(node.id)!);
      }

      // Check convergence
      if (delta < tolerance) {
        break;
      }
    }

    return pageRank;
  }

  /**
   * Betweenness Centrality
   * Measures how often a node appears on shortest paths
   */
  betweennessCentrality(): Map<string, number> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const betweenness = new Map<string, number>();

    // Initialize
    for (const node of nodes) {
      betweenness.set(node.id, 0);
    }

    // For each node as source
    for (const source of nodes) {
      const stack: string[] = [];
      const predecessors = new Map<string, string[]>();
      const sigma = new Map<string, number>();
      const distance = new Map<string, number>();
      const delta = new Map<string, number>();

      // Initialize
      for (const node of nodes) {
        predecessors.set(node.id, []);
        sigma.set(node.id, 0);
        distance.set(node.id, -1);
        delta.set(node.id, 0);
      }

      sigma.set(source.id, 1);
      distance.set(source.id, 0);

      const queue = [source.id];

      // BFS
      while (queue.length > 0) {
        const v = queue.shift()!;
        stack.push(v);

        const neighbors = this.storage.getNeighbors(v, 'out');
        for (const neighbor of neighbors) {
          const w = neighbor.id;

          // First visit to w?
          if (distance.get(w)! < 0) {
            queue.push(w);
            distance.set(w, distance.get(v)! + 1);
          }

          // Shortest path to w via v?
          if (distance.get(w)! === distance.get(v)! + 1) {
            sigma.set(w, sigma.get(w)! + sigma.get(v)!);
            predecessors.get(w)!.push(v);
          }
        }
      }

      // Accumulation
      while (stack.length > 0) {
        const w = stack.pop()!;
        const preds = predecessors.get(w)!;

        for (const v of preds) {
          const coefficient = (sigma.get(v)! / sigma.get(w)!) * (1 + delta.get(w)!);
          delta.set(v, delta.get(v)! + coefficient);
        }

        if (w !== source.id) {
          betweenness.set(w, betweenness.get(w)! + delta.get(w)!);
        }
      }
    }

    // Normalize
    const n = nodes.length;
    if (n > 2) {
      const normalization = 2 / ((n - 1) * (n - 2));
      for (const node of nodes) {
        betweenness.set(node.id, betweenness.get(node.id)! * normalization);
      }
    }

    return betweenness;
  }

  /**
   * Closeness Centrality
   * Average distance to all other nodes
   */
  closenessCentrality(): Map<string, number> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const closeness = new Map<string, number>();

    for (const source of nodes) {
      const distances = this.bfsDistances(source.id);
      let sum = 0;
      let reachable = 0;

      for (const [nodeId, distance] of distances) {
        if (distance > 0 && distance < Infinity) {
          sum += distance;
          reachable++;
        }
      }

      if (reachable > 0) {
        closeness.set(source.id, reachable / sum);
      } else {
        closeness.set(source.id, 0);
      }
    }

    return closeness;
  }

  /**
   * Eigenvector Centrality
   * Centrality proportional to the sum of centralities of neighbors
   */
  eigenvectorCentrality(maxIterations: number = 100, tolerance: number = 1e-6): Map<string, number> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const n = nodes.length;

    if (n === 0) return new Map();

    // Initialize
    const centrality = new Map<string, number>();
    for (const node of nodes) {
      centrality.set(node.id, 1 / Math.sqrt(n));
    }

    // Power iteration
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      const newCentrality = new Map<string, number>();
      let maxDelta = 0;

      for (const node of nodes) {
        let sum = 0;

        // Sum centralities of incoming neighbors
        const incoming = this.storage.getIncomingEdges(node.id);
        for (const edge of incoming) {
          sum += centrality.get(edge.sourceId) ?? 0;
        }

        newCentrality.set(node.id, sum);
      }

      // Normalize
      let norm = 0;
      for (const value of newCentrality.values()) {
        norm += value * value;
      }
      norm = Math.sqrt(norm);

      for (const node of nodes) {
        const normalized = (newCentrality.get(node.id) ?? 0) / norm;
        maxDelta = Math.max(maxDelta, Math.abs(normalized - (centrality.get(node.id) ?? 0)));
        centrality.set(node.id, normalized);
      }

      // Check convergence
      if (maxDelta < tolerance) {
        break;
      }
    }

    return centrality;
  }

  /**
   * Degree Centrality
   * Simply the degree of each node
   */
  degreeCentrality(direction: 'in' | 'out' | 'both' = 'both'): Map<string, number> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const centrality = new Map<string, number>();

    const maxDegree = nodes.length - 1;

    for (const node of nodes) {
      const degree = this.storage.getDegree(node.id, direction);
      centrality.set(node.id, maxDegree > 0 ? degree / maxDegree : 0);
    }

    return centrality;
  }

  /**
   * Harmonic Centrality
   * Sum of reciprocal distances
   */
  harmonicCentrality(): Map<string, number> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const centrality = new Map<string, number>();

    for (const source of nodes) {
      const distances = this.bfsDistances(source.id);
      let sum = 0;

      for (const [nodeId, distance] of distances) {
        if (distance > 0 && distance < Infinity) {
          sum += 1 / distance;
        }
      }

      centrality.set(source.id, sum);
    }

    // Normalize
    const n = nodes.length;
    if (n > 1) {
      for (const node of nodes) {
        centrality.set(node.id, (centrality.get(node.id) ?? 0) / (n - 1));
      }
    }

    return centrality;
  }

  /**
   * Get top K nodes by centrality
   */
  getTopK(centrality: Map<string, number>, k: number): CentralityResult[] {
    const results: CentralityResult[] = Array.from(centrality.entries()).map(([nodeId, score]) => ({
      nodeId,
      score
    }));

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, k);
  }

  /**
   * BFS to compute distances from source
   */
  private bfsDistances(sourceId: string): Map<string, number> {
    const distances = new Map<string, number>();
    const queue = [sourceId];
    distances.set(sourceId, 0);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentDistance = distances.get(current)!;

      const neighbors = this.storage.getNeighbors(current, 'out');
      for (const neighbor of neighbors) {
        if (!distances.has(neighbor.id)) {
          distances.set(neighbor.id, currentDistance + 1);
          queue.push(neighbor.id);
        }
      }
    }

    return distances;
  }
}
