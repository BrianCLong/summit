/**
 * Graph Clustering Algorithms
 * Triangle counting, clustering coefficient, clique detection
 */

import type { GraphStorage } from '@intelgraph/graph-database';

export interface ClusteringMetrics {
  globalClusteringCoefficient: number;
  localClusteringCoefficients: Map<string, number>;
  averageClusteringCoefficient: number;
  triangleCount: number;
}

export interface Clique {
  nodes: Set<string>;
  size: number;
}

export class GraphClustering {
  constructor(private storage: GraphStorage) {}

  /**
   * Count triangles in the graph
   */
  countTriangles(): number {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    let triangles = 0;

    // For each node
    for (const node of nodes) {
      const neighbors = new Set(
        this.storage.getNeighbors(node.id, 'both').map(n => n.id)
      );

      // Check each pair of neighbors
      const neighborArray = Array.from(neighbors);
      for (let i = 0; i < neighborArray.length; i++) {
        for (let j = i + 1; j < neighborArray.length; j++) {
          const n1 = neighborArray[i];
          const n2 = neighborArray[j];

          // Check if there's an edge between n1 and n2
          const n1Neighbors = new Set(
            this.storage.getNeighbors(n1, 'both').map(n => n.id)
          );

          if (n1Neighbors.has(n2)) {
            triangles++;
          }
        }
      }
    }

    // Each triangle is counted 3 times (once per node)
    return triangles / 3;
  }

  /**
   * Calculate local clustering coefficient for each node
   */
  localClusteringCoefficient(nodeId: string): number {
    const neighbors = this.storage.getNeighbors(nodeId, 'both');
    const k = neighbors.length;

    if (k < 2) return 0;

    // Count edges between neighbors
    let edgeCount = 0;
    const neighborIds = new Set(neighbors.map(n => n.id));

    for (const neighbor of neighbors) {
      const neighborNeighbors = this.storage.getNeighbors(neighbor.id, 'both');

      for (const nn of neighborNeighbors) {
        if (neighborIds.has(nn.id) && nn.id !== neighbor.id) {
          edgeCount++;
        }
      }
    }

    // Each edge counted twice
    edgeCount /= 2;

    // Clustering coefficient = actual edges / possible edges
    const possibleEdges = (k * (k - 1)) / 2;
    return possibleEdges > 0 ? edgeCount / possibleEdges : 0;
  }

  /**
   * Calculate clustering coefficients for all nodes
   */
  allClusteringCoefficients(): Map<string, number> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const coefficients = new Map<string, number>();

    for (const node of nodes) {
      coefficients.set(node.id, this.localClusteringCoefficient(node.id));
    }

    return coefficients;
  }

  /**
   * Calculate global clustering coefficient
   */
  globalClusteringCoefficient(): number {
    const triangles = this.countTriangles();
    const triplets = this.countTriplets();

    return triplets > 0 ? (3 * triangles) / triplets : 0;
  }

  /**
   * Calculate average clustering coefficient
   */
  averageClusteringCoefficient(): number {
    const coefficients = this.allClusteringCoefficients();
    const values = Array.from(coefficients.values());

    if (values.length === 0) return 0;

    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }

  /**
   * Get complete clustering metrics
   */
  getClusteringMetrics(): ClusteringMetrics {
    return {
      triangleCount: this.countTriangles(),
      localClusteringCoefficients: this.allClusteringCoefficients(),
      globalClusteringCoefficient: this.globalClusteringCoefficient(),
      averageClusteringCoefficient: this.averageClusteringCoefficient()
    };
  }

  /**
   * Find all maximal cliques
   * Bron-Kerbosch algorithm
   */
  findMaximalCliques(): Clique[] {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const cliques: Clique[] = [];

    const R = new Set<string>();
    const P = new Set(nodes.map(n => n.id));
    const X = new Set<string>();

    this.bronKerbosch(R, P, X, cliques);

    return cliques.sort((a, b) => b.size - a.size);
  }

  /**
   * Find k-cliques (cliques of specific size)
   */
  findKCliques(k: number): Clique[] {
    const allCliques = this.findMaximalCliques();
    return allCliques.filter(clique => clique.size >= k);
  }

  /**
   * Find maximum clique
   */
  findMaximumClique(): Clique | null {
    const cliques = this.findMaximalCliques();
    return cliques.length > 0 ? cliques[0] : null;
  }

  /**
   * Graph coloring (greedy algorithm)
   * Assigns colors to nodes such that no adjacent nodes share a color
   */
  graphColoring(): Map<string, number> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const colors = new Map<string, number>();

    // Sort nodes by degree (descending)
    const sortedNodes = nodes.sort((a, b) => {
      const degreeA = this.storage.getDegree(a.id, 'both');
      const degreeB = this.storage.getDegree(b.id, 'both');
      return degreeB - degreeA;
    });

    for (const node of sortedNodes) {
      // Get colors of neighbors
      const neighbors = this.storage.getNeighbors(node.id, 'both');
      const neighborColors = new Set(
        neighbors.map(n => colors.get(n.id)).filter(c => c !== undefined)
      );

      // Find smallest available color
      let color = 0;
      while (neighborColors.has(color)) {
        color++;
      }

      colors.set(node.id, color);
    }

    return colors;
  }

  /**
   * Calculate chromatic number (minimum number of colors needed)
   */
  chromaticNumber(): number {
    const colors = this.graphColoring();
    const colorSet = new Set(colors.values());
    return colorSet.size;
  }

  /**
   * Find k-core (maximal subgraph where all nodes have degree >= k)
   */
  kCore(k: number): Set<string> {
    const exported = this.storage.exportGraph();
    let remaining = new Set(exported.nodes.map(n => n.id));

    let changed = true;
    while (changed) {
      changed = false;
      const toRemove: string[] = [];

      for (const nodeId of remaining) {
        // Count neighbors in remaining set
        const neighbors = this.storage.getNeighbors(nodeId, 'both');
        const neighborCount = neighbors.filter(n => remaining.has(n.id)).length;

        if (neighborCount < k) {
          toRemove.push(nodeId);
          changed = true;
        }
      }

      for (const nodeId of toRemove) {
        remaining.delete(nodeId);
      }
    }

    return remaining;
  }

  /**
   * Calculate core numbers for all nodes
   */
  coreNumbers(): Map<string, number> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const coreNumbers = new Map<string, number>();

    // Initialize
    for (const node of nodes) {
      coreNumbers.set(node.id, 0);
    }

    // Find maximum possible k
    const maxDegree = Math.max(
      ...nodes.map(n => this.storage.getDegree(n.id, 'both'))
    );

    // Compute k-cores for increasing k
    for (let k = 1; k <= maxDegree; k++) {
      const core = this.kCore(k);

      for (const nodeId of core) {
        coreNumbers.set(nodeId, k);
      }

      if (core.size === 0) break;
    }

    return coreNumbers;
  }

  // ==================== Helper Methods ====================

  private countTriplets(): number {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    let triplets = 0;

    for (const node of nodes) {
      const degree = this.storage.getDegree(node.id, 'both');
      if (degree >= 2) {
        triplets += (degree * (degree - 1)) / 2;
      }
    }

    return triplets;
  }

  private bronKerbosch(
    R: Set<string>,
    P: Set<string>,
    X: Set<string>,
    cliques: Clique[]
  ): void {
    if (P.size === 0 && X.size === 0) {
      // Found maximal clique
      if (R.size > 0) {
        cliques.push({
          nodes: new Set(R),
          size: R.size
        });
      }
      return;
    }

    // Choose pivot
    const pivot = this.choosePivot(P, X);
    const pivotNeighbors = pivot ? this.getNeighborSet(pivot) : new Set<string>();

    // Iterate over P \ N(pivot)
    const candidates = new Set(
      Array.from(P).filter(v => !pivotNeighbors.has(v))
    );

    for (const v of candidates) {
      const vNeighbors = this.getNeighborSet(v);

      const newR = new Set([...R, v]);
      const newP = new Set(Array.from(P).filter(x => vNeighbors.has(x)));
      const newX = new Set(Array.from(X).filter(x => vNeighbors.has(x)));

      this.bronKerbosch(newR, newP, newX, cliques);

      P.delete(v);
      X.add(v);
    }
  }

  private choosePivot(P: Set<string>, X: Set<string>): string | null {
    const union = new Set([...P, ...X]);

    let maxDegree = -1;
    let pivot: string | null = null;

    for (const node of union) {
      const neighbors = this.getNeighborSet(node);
      const degree = Array.from(P).filter(v => neighbors.has(v)).length;

      if (degree > maxDegree) {
        maxDegree = degree;
        pivot = node;
      }
    }

    return pivot;
  }

  private getNeighborSet(nodeId: string): Set<string> {
    const neighbors = this.storage.getNeighbors(nodeId, 'both');
    return new Set(neighbors.map(n => n.id));
  }
}
