/**
 * Graph Analytics Package
 */

import Graph from 'graphology';
import { pagerank } from 'graphology-metrics/centrality/pagerank';
import { betweennessCentrality } from 'graphology-metrics/centrality/betweenness';
import { louvain } from 'graphology-communities-louvain';

export interface CentralityMetrics {
  pagerank: Record<string, number>;
  betweenness: Record<string, number>;
  degree: Record<string, number>;
  closeness: Record<string, number>;
}

export interface CommunityDetectionResult {
  communities: Map<string, number>;
  modularity: number;
  communityCount: number;
}

export class GraphAnalyzer {
  private graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  /**
   * Calculate PageRank centrality
   */
  calculatePageRank(options?: { alpha?: number; maxIterations?: number }): Record<string, number> {
    return pagerank(this.graph, {
      alpha: options?.alpha || 0.85,
      maxIterations: options?.maxIterations || 100
    });
  }

  /**
   * Calculate betweenness centrality
   */
  calculateBetweenness(): Record<string, number> {
    return betweennessCentrality(this.graph);
  }

  /**
   * Calculate all centrality metrics
   */
  calculateAllCentrality(): CentralityMetrics {
    const degree: Record<string, number> = {};

    this.graph.forEachNode((node) => {
      degree[node] = this.graph.degree(node);
    });

    return {
      pagerank: this.calculatePageRank(),
      betweenness: this.calculateBetweenness(),
      degree,
      closeness: {} // Placeholder
    };
  }

  /**
   * Detect communities using Louvain method
   */
  detectCommunities(): CommunityDetectionResult {
    const communities = louvain(this.graph);
    const communityMap = new Map<string, number>();

    this.graph.forEachNode((node, attrs) => {
      const communityId = communities[node];
      communityMap.set(node, communityId);
    });

    const communityCount = new Set(Object.values(communities)).size;

    return {
      communities: communityMap,
      modularity: 0, // Would calculate actual modularity
      communityCount
    };
  }

  /**
   * Find shortest path between two nodes
   */
  shortestPath(source: string, target: string): string[] | null {
    // Simple BFS implementation
    const queue: Array<{ node: string; path: string[] }> = [{ node: source, path: [source] }];
    const visited = new Set<string>([source]);

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;

      if (node === target) {
        return path;
      }

      this.graph.forEachNeighbor(node, (neighbor) => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      });
    }

    return null;
  }

  /**
   * Get k-hop neighbors
   */
  getKHopNeighbors(node: string, k: number): Set<string> {
    const neighbors = new Set<string>();
    let currentLevel = new Set<string>([node]);

    for (let i = 0; i < k; i++) {
      const nextLevel = new Set<string>();

      for (const n of currentLevel) {
        this.graph.forEachNeighbor(n, (neighbor) => {
          if (!neighbors.has(neighbor) && neighbor !== node) {
            neighbors.add(neighbor);
            nextLevel.add(neighbor);
          }
        });
      }

      currentLevel = nextLevel;
    }

    return neighbors;
  }

  /**
   * Calculate graph density
   */
  calculateDensity(): number {
    const nodeCount = this.graph.order;
    const edgeCount = this.graph.size;

    if (nodeCount <= 1) return 0;

    const maxEdges = (nodeCount * (nodeCount - 1)) / 2;
    return edgeCount / maxEdges;
  }

  /**
   * Get graph statistics
   */
  getStatistics(): {
    nodeCount: number;
    edgeCount: number;
    density: number;
    avgDegree: number;
    connected: boolean;
  } {
    const nodeCount = this.graph.order;
    const edgeCount = this.graph.size;

    let totalDegree = 0;
    this.graph.forEachNode((node) => {
      totalDegree += this.graph.degree(node);
    });

    return {
      nodeCount,
      edgeCount,
      density: this.calculateDensity(),
      avgDegree: nodeCount > 0 ? totalDegree / nodeCount : 0,
      connected: true // Would implement proper connectivity check
    };
  }
}

export { GraphAnalyzer as default };
