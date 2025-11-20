/**
 * Graph Analytics Package
 *
 * Provides advanced graph analytics for identity networks including:
 * - Community detection algorithms
 * - Centrality and influence scoring
 * - Path analysis between entities
 * - Network clustering and segmentation
 * - Anomaly detection in networks
 */

export interface GraphNode {
  id: string;
  label: string;
  properties: Record<string, any>;
}

export interface GraphEdge {
  source: string;
  target: string;
  type: string;
  weight: number;
  properties: Record<string, any>;
}

export interface IdentityGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface CentralityScores {
  degree: Map<string, number>;
  betweenness: Map<string, number>;
  closeness: Map<string, number>;
  eigenvector: Map<string, number>;
}

export interface Community {
  id: string;
  members: string[];
  density: number;
  centralNodes: string[];
}

export class GraphAnalyzer {
  private graph: IdentityGraph;
  private adjacencyList: Map<string, Set<string>>;

  constructor(graph: IdentityGraph) {
    this.graph = graph;
    this.adjacencyList = this.buildAdjacencyList();
  }

  private buildAdjacencyList(): Map<string, Set<string>> {
    const adj = new Map<string, Set<string>>();

    for (const node of this.graph.nodes) {
      adj.set(node.id, new Set());
    }

    for (const edge of this.graph.edges) {
      adj.get(edge.source)?.add(edge.target);
      adj.get(edge.target)?.add(edge.source);
    }

    return adj;
  }

  /**
   * Calculate degree centrality
   */
  calculateDegreeCentrality(): Map<string, number> {
    const centrality = new Map<string, number>();
    const n = this.graph.nodes.length;

    for (const [node, neighbors] of this.adjacencyList) {
      centrality.set(node, neighbors.size / (n - 1));
    }

    return centrality;
  }

  /**
   * Calculate betweenness centrality
   */
  calculateBetweennessCentrality(): Map<string, number> {
    const centrality = new Map<string, number>();

    for (const node of this.graph.nodes) {
      centrality.set(node.id, 0);
    }

    // Simplified implementation using shortest paths
    for (const source of this.graph.nodes) {
      const distances = this.bfs(source.id);

      for (const [target, dist] of distances) {
        if (dist > 1) {
          const path = this.findShortestPath(source.id, target);
          for (let i = 1; i < path.length - 1; i++) {
            centrality.set(path[i], (centrality.get(path[i]) || 0) + 1);
          }
        }
      }
    }

    return centrality;
  }

  /**
   * BFS traversal
   */
  private bfs(start: string): Map<string, number> {
    const distances = new Map<string, number>();
    const queue: string[] = [start];
    distances.set(start, 0);

    while (queue.length > 0) {
      const node = queue.shift()!;
      const dist = distances.get(node)!;

      const neighbors = this.adjacencyList.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, dist + 1);
          queue.push(neighbor);
        }
      }
    }

    return distances;
  }

  /**
   * Find shortest path between two nodes
   */
  findShortestPath(source: string, target: string): string[] {
    const queue: Array<{ node: string; path: string[] }> = [
      { node: source, path: [source] }
    ];
    const visited = new Set<string>([source]);

    while (queue.length > 0) {
      const { node, path } = queue.shift()!;

      if (node === target) return path;

      const neighbors = this.adjacencyList.get(node) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ node: neighbor, path: [...path, neighbor] });
        }
      }
    }

    return [];
  }

  /**
   * Detect communities using label propagation
   */
  detectCommunities(): Community[] {
    const labels = new Map<string, string>();

    // Initialize each node with its own label
    for (const node of this.graph.nodes) {
      labels.set(node.id, node.id);
    }

    // Propagate labels
    let changed = true;
    let iterations = 0;
    const maxIterations = 100;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const node of this.graph.nodes) {
        const neighbors = this.adjacencyList.get(node.id) || new Set();
        const labelCounts = new Map<string, number>();

        for (const neighbor of neighbors) {
          const label = labels.get(neighbor)!;
          labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
        }

        if (labelCounts.size > 0) {
          const maxLabel = Array.from(labelCounts.entries())
            .reduce((a, b) => (a[1] > b[1] ? a : b))[0];

          if (maxLabel !== labels.get(node.id)) {
            labels.set(node.id, maxLabel);
            changed = true;
          }
        }
      }
    }

    // Build communities
    const communities = new Map<string, string[]>();
    for (const [node, label] of labels) {
      const members = communities.get(label) || [];
      members.push(node);
      communities.set(label, members);
    }

    return Array.from(communities.entries()).map(([id, members]) => ({
      id,
      members,
      density: this.calculateDensity(members),
      centralNodes: this.findCentralNodes(members)
    }));
  }

  /**
   * Calculate subgraph density
   */
  private calculateDensity(nodes: string[]): number {
    const nodeSet = new Set(nodes);
    let edgeCount = 0;

    for (const edge of this.graph.edges) {
      if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
        edgeCount++;
      }
    }

    const maxEdges = (nodes.length * (nodes.length - 1)) / 2;
    return maxEdges > 0 ? edgeCount / maxEdges : 0;
  }

  /**
   * Find central nodes in subgraph
   */
  private findCentralNodes(nodes: string[]): string[] {
    const nodeSet = new Set(nodes);
    const degrees = new Map<string, number>();

    for (const node of nodes) {
      const neighbors = this.adjacencyList.get(node) || new Set();
      const internalDegree = Array.from(neighbors).filter(n =>
        nodeSet.has(n)
      ).length;
      degrees.set(node, internalDegree);
    }

    const sorted = Array.from(degrees.entries()).sort((a, b) => b[1] - a[1]);
    return sorted.slice(0, Math.min(3, sorted.length)).map(([node]) => node);
  }
}
