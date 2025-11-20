/**
 * Network motif analysis and pattern detection
 */

import type { Graph, Motif } from './types.js';
import { GraphBuilder } from './GraphBuilder.js';

export class MotifAnalyzer {
  private graph: Graph;
  private adjList: Map<string, Set<string>>;

  constructor(graph: Graph) {
    this.graph = graph;
    const builder = new GraphBuilder(graph.directed, graph.weighted);
    builder['graph'] = graph;
    this.adjList = builder.getAdjacencyList();
  }

  /**
   * Count triangles in the network
   */
  countTriangles(): number {
    let triangles = 0;
    const nodeIds = Array.from(this.graph.nodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        for (let k = j + 1; k < nodeIds.length; k++) {
          const a = nodeIds[i];
          const b = nodeIds[j];
          const c = nodeIds[k];

          if (this.formsTriangle(a, b, c)) {
            triangles++;
          }
        }
      }
    }

    return triangles;
  }

  /**
   * Find all triangles and return as motifs
   */
  findTriangles(): Motif[] {
    const triangles: Motif[] = [];
    const nodeIds = Array.from(this.graph.nodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        for (let k = j + 1; k < nodeIds.length; k++) {
          const a = nodeIds[i];
          const b = nodeIds[j];
          const c = nodeIds[k];

          if (this.formsTriangle(a, b, c)) {
            triangles.push({
              type: 'triangle',
              nodes: [a, b, c],
              count: 1
            });
          }
        }
      }
    }

    return triangles;
  }

  /**
   * Find 3-node motifs (13 possible directed motifs)
   */
  find3NodeMotifs(): Map<string, Motif> {
    const motifs = new Map<string, Motif>();
    const nodeIds = Array.from(this.graph.nodes.keys());

    for (let i = 0; i < nodeIds.length; i++) {
      for (let j = i + 1; j < nodeIds.length; j++) {
        for (let k = j + 1; k < nodeIds.length; k++) {
          const a = nodeIds[i];
          const b = nodeIds[j];
          const c = nodeIds[k];

          const motifType = this.classify3NodeMotif(a, b, c);

          if (motifType !== 'none') {
            const existing = motifs.get(motifType);
            if (existing) {
              existing.count++;
            } else {
              motifs.set(motifType, {
                type: motifType,
                nodes: [a, b, c],
                count: 1
              });
            }
          }
        }
      }
    }

    return motifs;
  }

  /**
   * Find cliques of size k
   */
  findCliques(k: number): Motif[] {
    const cliques: Motif[] = [];
    const nodeIds = Array.from(this.graph.nodes.keys());

    // Use Bron-Kerbosch algorithm for maximal cliques
    const R = new Set<string>();
    const P = new Set(nodeIds);
    const X = new Set<string>();

    const bronKerbosch = (R: Set<string>, P: Set<string>, X: Set<string>) => {
      if (P.size === 0 && X.size === 0) {
        // R is a maximal clique
        if (R.size === k) {
          cliques.push({
            type: `clique-${k}`,
            nodes: Array.from(R),
            count: 1
          });
        }
        return;
      }

      const PArray = Array.from(P);
      for (const v of PArray) {
        const neighbors = this.adjList.get(v) || new Set();

        const newR = new Set([...R, v]);
        const newP = new Set(Array.from(P).filter(x => neighbors.has(x)));
        const newX = new Set(Array.from(X).filter(x => neighbors.has(x)));

        bronKerbosch(newR, newP, newX);

        P.delete(v);
        X.add(v);
      }
    };

    bronKerbosch(R, P, X);
    return cliques;
  }

  /**
   * K-core decomposition
   */
  kCoreDecomposition(): Map<string, number> {
    const coreness = new Map<string, number>();
    const degrees = new Map<string, number>();

    // Initialize degrees
    this.graph.nodes.forEach((_, nodeId) => {
      degrees.set(nodeId, (this.adjList.get(nodeId) || new Set()).size);
      coreness.set(nodeId, 0);
    });

    // Iteratively remove nodes with degree < k
    let k = 1;
    while (degrees.size > 0) {
      // Find nodes with degree < k
      const toRemove: string[] = [];
      degrees.forEach((degree, nodeId) => {
        if (degree < k) {
          toRemove.push(nodeId);
        }
      });

      if (toRemove.length === 0) {
        k++;
        continue;
      }

      // Remove nodes and update neighbors
      toRemove.forEach(nodeId => {
        coreness.set(nodeId, k - 1);
        degrees.delete(nodeId);

        const neighbors = this.adjList.get(nodeId) || new Set();
        neighbors.forEach(neighbor => {
          if (degrees.has(neighbor)) {
            degrees.set(neighbor, degrees.get(neighbor)! - 1);
          }
        });
      });
    }

    return coreness;
  }

  /**
   * Find structural holes (nodes with low clustering but high betweenness)
   */
  findStructuralHoles(): string[] {
    const structuralHoles: string[] = [];

    this.graph.nodes.forEach((_, nodeId) => {
      const clustering = this.calculateLocalClusteringCoefficient(nodeId);
      const degree = (this.adjList.get(nodeId) || new Set()).size;

      // Structural holes have low clustering and high degree
      if (clustering < 0.3 && degree > 3) {
        structuralHoles.push(nodeId);
      }
    });

    return structuralHoles;
  }

  /**
   * Identify bridges (edges whose removal increases components)
   */
  findBridges(): Array<[string, string]> {
    const bridges: Array<[string, string]> = [];

    this.graph.edges.forEach(edge => {
      if (this.isBridge(edge.source, edge.target)) {
        bridges.push([edge.source, edge.target]);
      }
    });

    return bridges;
  }

  /**
   * Calculate motif significance (z-score compared to random networks)
   */
  calculateMotifSignificance(
    observedMotifs: Map<string, Motif>,
    numRandomizations = 100
  ): Map<string, number> {
    const significance = new Map<string, number>();

    // Generate random networks and count motifs
    const randomCounts = new Map<string, number[]>();

    for (let i = 0; i < numRandomizations; i++) {
      const randomGraph = this.generateRandomGraph();
      const analyzer = new MotifAnalyzer(randomGraph);
      const randomMotifs = analyzer.find3NodeMotifs();

      randomMotifs.forEach((motif, type) => {
        if (!randomCounts.has(type)) {
          randomCounts.set(type, []);
        }
        randomCounts.get(type)!.push(motif.count);
      });
    }

    // Calculate z-scores
    observedMotifs.forEach((motif, type) => {
      const randomValues = randomCounts.get(type) || [];
      if (randomValues.length > 0) {
        const mean = randomValues.reduce((a, b) => a + b, 0) / randomValues.length;
        const variance =
          randomValues.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / randomValues.length;
        const stdDev = Math.sqrt(variance);

        const zScore = stdDev > 0 ? (motif.count - mean) / stdDev : 0;
        significance.set(type, zScore);
      }
    });

    return significance;
  }

  /**
   * Check if three nodes form a triangle
   */
  private formsTriangle(a: string, b: string, c: string): boolean {
    const neighborsA = this.adjList.get(a) || new Set();
    const neighborsB = this.adjList.get(b) || new Set();
    const neighborsC = this.adjList.get(c) || new Set();

    return (
      (neighborsA.has(b) || neighborsB.has(a)) &&
      (neighborsB.has(c) || neighborsC.has(b)) &&
      (neighborsC.has(a) || neighborsA.has(c))
    );
  }

  /**
   * Classify 3-node motif type
   */
  private classify3NodeMotif(a: string, b: string, c: string): string {
    const edges = [
      this.hasDirectedEdge(a, b),
      this.hasDirectedEdge(b, a),
      this.hasDirectedEdge(b, c),
      this.hasDirectedEdge(c, b),
      this.hasDirectedEdge(c, a),
      this.hasDirectedEdge(a, c)
    ];

    const edgeCount = edges.filter(e => e).length;

    // Classify based on edge pattern
    if (edgeCount === 0) return 'none';
    if (edgeCount === 1) return 'single-edge';
    if (edgeCount === 2) return this.classify2EdgeMotif(edges);
    if (edgeCount === 3) return this.classify3EdgeMotif(edges);
    if (edgeCount === 4) return 'four-edge';
    if (edgeCount === 5) return 'five-edge';
    if (edgeCount === 6) return 'complete-triangle';

    return 'unknown';
  }

  /**
   * Classify 2-edge motifs
   */
  private classify2EdgeMotif(edges: boolean[]): string {
    const [ab, ba, bc, cb, ca, ac] = edges;

    if ((ab && bc) || (ba && cb) || (ca && ab)) return 'chain';
    if ((ab && cb) || (ba && bc) || (ca && ac)) return 'convergent';
    if ((ab && ac) || (ba && ca) || (bc && cb)) return 'divergent';

    return 'two-edge';
  }

  /**
   * Classify 3-edge motifs
   */
  private classify3EdgeMotif(edges: boolean[]): string {
    const [ab, ba, bc, cb, ca, ac] = edges;

    // Cyclic patterns
    if ((ab && bc && ca) || (ba && cb && ac)) return 'cycle';

    // Feed-forward loop
    if ((ab && bc && ac) || (ba && cb && ca)) return 'feed-forward';

    return 'three-edge';
  }

  /**
   * Check if directed edge exists
   */
  private hasDirectedEdge(source: string, target: string): boolean {
    return this.graph.edges.some(edge => edge.source === source && edge.target === target);
  }

  /**
   * Check if edge is a bridge
   */
  private isBridge(source: string, target: string): boolean {
    // Remove edge temporarily
    const originalEdges = [...this.graph.edges];
    this.graph.edges = this.graph.edges.filter(
      e => !(e.source === source && e.target === target)
    );

    // Rebuild adjacency list
    const builder = new GraphBuilder(this.graph.directed, this.graph.weighted);
    builder['graph'] = this.graph;
    const tempAdjList = builder.getAdjacencyList();

    // Check if source and target are still connected
    const visited = new Set<string>();
    const queue = [source];
    visited.add(source);

    let connected = false;
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current === target) {
        connected = true;
        break;
      }

      const neighbors = tempAdjList.get(current) || new Set();
      neighbors.forEach(neighbor => {
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push(neighbor);
        }
      });
    }

    // Restore edges
    this.graph.edges = originalEdges;
    const restoredBuilder = new GraphBuilder(this.graph.directed, this.graph.weighted);
    restoredBuilder['graph'] = this.graph;
    this.adjList = restoredBuilder.getAdjacencyList();

    return !connected;
  }

  /**
   * Calculate local clustering coefficient
   */
  private calculateLocalClusteringCoefficient(nodeId: string): number {
    const neighbors = Array.from(this.adjList.get(nodeId) || []);
    const k = neighbors.length;

    if (k < 2) return 0;

    let triangles = 0;
    const maxTriangles = k * (k - 1) / 2;

    for (let i = 0; i < neighbors.length; i++) {
      for (let j = i + 1; j < neighbors.length; j++) {
        if (this.adjList.get(neighbors[i])?.has(neighbors[j])) {
          triangles++;
        }
      }
    }

    return maxTriangles > 0 ? triangles / maxTriangles : 0;
  }

  /**
   * Generate a random graph with same size (for motif significance testing)
   */
  private generateRandomGraph(): Graph {
    const n = this.graph.nodes.size;
    const m = this.graph.edges.length;
    const nodeIds = Array.from(this.graph.nodes.keys());

    const randomGraph: Graph = {
      nodes: new Map(this.graph.nodes),
      edges: [],
      directed: this.graph.directed,
      weighted: false
    };

    // Generate m random edges
    for (let i = 0; i < m; i++) {
      const source = nodeIds[Math.floor(Math.random() * n)];
      const target = nodeIds[Math.floor(Math.random() * n)];

      if (source !== target) {
        randomGraph.edges.push({ source, target });
      }
    }

    return randomGraph;
  }
}
