import { GraphSnapshot, Node, Edge, GraphMetrics } from '../contracts/predictive/types';

export class SimpleGraphEngine {
  private adjacencyList: Map<string, string[]>;
  private nodes: Map<string, Node>;
  private edges: Edge[];

  constructor(snapshot: GraphSnapshot) {
    this.nodes = new Map(snapshot.nodes.map(n => [n.id, n]));
    this.edges = snapshot.edges;
    this.adjacencyList = new Map();

    // Initialize adjacency list
    snapshot.nodes.forEach(n => this.adjacencyList.set(n.id, []));
    snapshot.edges.forEach(e => {
      if (!this.adjacencyList.has(e.source)) this.adjacencyList.set(e.source, []);
      this.adjacencyList.get(e.source)?.push(e.target);

      // Assuming undirected for some metrics, or directed for others.
      // For general robustness in "social" graphs, we often treat as undirected for connectivity
      // but directed for flow. Let's stick to directed for now, maybe add reverse lookup if needed.
    });
  }

  public getMetrics(): GraphMetrics {
    return {
      density: this.calculateDensity(),
      avgDegree: this.calculateAvgDegree(),
      centrality: this.calculateDegreeCentrality(),
      communities: this.countConnectedComponents(),
    };
  }

  private calculateDensity(): number {
    const n = this.nodes.size;
    const e = this.edges.length;
    if (n <= 1) return 0;
    return e / (n * (n - 1)); // Directed density
  }

  private calculateAvgDegree(): number {
    if (this.nodes.size === 0) return 0;
    return this.edges.length / this.nodes.size;
  }

  private calculateDegreeCentrality(): Record<string, number> {
    const centrality: Record<string, number> = {};
    const n = this.nodes.size;
    if (n <= 1) {
      this.nodes.forEach(node => centrality[node.id] = 0);
      return centrality;
    }

    // Initialize counts
    this.nodes.forEach(node => centrality[node.id] = 0);

    // Count degrees (in-degree + out-degree for simple centrality? or just out?)
    // Standard degree centrality in directed graph is often In+Out or split.
    // Let's do total degree.
    this.edges.forEach(e => {
        if (centrality[e.source] !== undefined) centrality[e.source]++;
        if (centrality[e.target] !== undefined) centrality[e.target]++;
    });

    // Normalize
    Object.keys(centrality).forEach(key => {
        centrality[key] = centrality[key] / (n - 1);
    });

    return centrality;
  }

  // BFS for connected components (weakly connected)
  private countConnectedComponents(): number {
    const visited = new Set<string>();
    let count = 0;

    // Build undirected adjacency for component detection
    const undirectedAdj = new Map<string, string[]>();
    this.nodes.forEach(n => undirectedAdj.set(n.id, []));
    this.edges.forEach(e => {
        undirectedAdj.get(e.source)?.push(e.target);
        undirectedAdj.get(e.target)?.push(e.source);
    });

    for (const nodeId of this.nodes.keys()) {
      if (!visited.has(nodeId)) {
        count++;
        this.bfs(nodeId, visited, undirectedAdj);
      }
    }
    return count;
  }

  private bfs(startNode: string, visited: Set<string>, adj: Map<string, string[]>) {
    const queue = [startNode];
    visited.add(startNode);
    while (queue.length > 0) {
      const u = queue.shift()!;
      const neighbors = adj.get(u) || [];
      for (const v of neighbors) {
        if (!visited.has(v)) {
          visited.add(v);
          queue.push(v);
        }
      }
    }
  }

  public calculatePageRank(iterations: number = 20, damping: number = 0.85): Record<string, number> {
    const N = this.nodes.size;
    if (N === 0) return {};

    let ranks: Record<string, number> = {};
    this.nodes.forEach(n => ranks[n.id] = 1 / N);

    const outDegree = new Map<string, number>();
    this.nodes.forEach(n => outDegree.set(n.id, 0));
    this.edges.forEach(e => {
        outDegree.set(e.source, (outDegree.get(e.source) || 0) + 1);
    });

    // Build incoming map for faster lookup
    const incoming = new Map<string, string[]>();
    this.nodes.forEach(n => incoming.set(n.id, []));
    this.edges.forEach(e => {
        incoming.get(e.target)?.push(e.source);
    });

    for (let i = 0; i < iterations; i++) {
        const newRanks: Record<string, number> = {};
        let sinkRankSum = 0;

        // Handle dangling nodes (nodes with no out-links)
        this.nodes.forEach(n => {
            if ((outDegree.get(n.id) || 0) === 0) {
                sinkRankSum += ranks[n.id];
            }
        });

        this.nodes.forEach(n => {
            let rankSum = 0;
            const inbound = incoming.get(n.id) || [];
            for (const sourceId of inbound) {
                rankSum += ranks[sourceId] / (outDegree.get(sourceId) || 1);
            }

            newRanks[n.id] = (1 - damping) / N + damping * (rankSum + sinkRankSum / N);
        });
        ranks = newRanks;
    }

    return ranks;
  }

  // Simulation support
  public getNeighbors(nodeId: string): string[] {
      return this.adjacencyList.get(nodeId) || [];
  }
}
