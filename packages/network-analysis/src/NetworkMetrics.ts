/**
 * Network-level metrics and statistics
 */

import type { Graph, NetworkMetrics } from './types.js';
import { GraphBuilder } from './GraphBuilder.js';

export class NetworkMetricsCalculator {
  private graph: Graph;
  private adjList: Map<string, Set<string>>;

  constructor(graph: Graph) {
    this.graph = graph;
    const builder = new GraphBuilder(graph.directed, graph.weighted);
    builder['graph'] = graph;
    this.adjList = builder.getAdjacencyList();
  }

  /**
   * Calculate all network metrics
   */
  calculateAll(): NetworkMetrics {
    return {
      density: this.calculateDensity(),
      averagePathLength: this.calculateAveragePathLength(),
      clusteringCoefficient: this.calculateClusteringCoefficient(),
      assortativity: this.calculateAssortativity(),
      diameter: this.calculateDiameter(),
      numberOfComponents: this.countComponents(),
      degreeDistribution: this.calculateDegreeDistribution()
    };
  }

  /**
   * Calculate network density
   */
  calculateDensity(): number {
    const n = this.graph.nodes.size;
    const m = this.graph.edges.length;

    if (n <= 1) return 0;

    const maxEdges = this.graph.directed ? n * (n - 1) : n * (n - 1) / 2;
    return m / maxEdges;
  }

  /**
   * Calculate average shortest path length
   */
  calculateAveragePathLength(): number {
    let totalDistance = 0;
    let pathCount = 0;

    this.graph.nodes.forEach((_, source) => {
      const distances = this.bfs(source);

      distances.forEach((dist, target) => {
        if (source !== target && dist < Infinity) {
          totalDistance += dist;
          pathCount++;
        }
      });
    });

    return pathCount > 0 ? totalDistance / pathCount : 0;
  }

  /**
   * Calculate global clustering coefficient
   */
  calculateClusteringCoefficient(): number {
    let totalCoefficient = 0;
    let nodeCount = 0;

    this.graph.nodes.forEach((_, nodeId) => {
      const localCoefficient = this.calculateLocalClusteringCoefficient(nodeId);
      if (!isNaN(localCoefficient)) {
        totalCoefficient += localCoefficient;
        nodeCount++;
      }
    });

    return nodeCount > 0 ? totalCoefficient / nodeCount : 0;
  }

  /**
   * Calculate local clustering coefficient for a node
   */
  private calculateLocalClusteringCoefficient(nodeId: string): number {
    const neighbors = Array.from(this.adjList.get(nodeId) || []);
    const k = neighbors.length;

    if (k < 2) return 0;

    let triangles = 0;
    const maxTriangles = k * (k - 1) / 2;

    // Count triangles
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
   * Calculate degree assortativity coefficient
   */
  calculateAssortativity(): number {
    const degrees = new Map<string, number>();
    this.graph.nodes.forEach((_, nodeId) => {
      degrees.set(nodeId, (this.adjList.get(nodeId) || new Set()).size);
    });

    let numerator = 0;
    let denominator1 = 0;
    let denominator2 = 0;
    const m = this.graph.edges.length;

    this.graph.edges.forEach(edge => {
      const k_i = degrees.get(edge.source) || 0;
      const k_j = degrees.get(edge.target) || 0;

      numerator += k_i * k_j;
      denominator1 += k_i + k_j;
      denominator2 += k_i * k_i + k_j * k_j;
    });

    if (m === 0) return 0;

    numerator /= m;
    denominator1 = (denominator1 / (2 * m)) ** 2;
    denominator2 /= (2 * m);

    const variance = denominator2 - denominator1;
    return variance > 0 ? (numerator - denominator1) / variance : 0;
  }

  /**
   * Calculate network diameter
   */
  calculateDiameter(): number {
    let maxDistance = 0;

    this.graph.nodes.forEach((_, source) => {
      const distances = this.bfs(source);

      distances.forEach((dist, target) => {
        if (dist < Infinity && dist > maxDistance) {
          maxDistance = dist;
        }
      });
    });

    return maxDistance;
  }

  /**
   * Count connected components
   */
  countComponents(): number {
    const visited = new Set<string>();
    let components = 0;

    this.graph.nodes.forEach((_, nodeId) => {
      if (!visited.has(nodeId)) {
        this.dfsComponent(nodeId, visited);
        components++;
      }
    });

    return components;
  }

  /**
   * DFS to mark component
   */
  private dfsComponent(nodeId: string, visited: Set<string>): void {
    visited.add(nodeId);
    const neighbors = this.adjList.get(nodeId) || new Set();

    neighbors.forEach(neighbor => {
      if (!visited.has(neighbor)) {
        this.dfsComponent(neighbor, visited);
      }
    });
  }

  /**
   * Calculate degree distribution
   */
  calculateDegreeDistribution(): Map<number, number> {
    const distribution = new Map<number, number>();

    this.graph.nodes.forEach((_, nodeId) => {
      const degree = (this.adjList.get(nodeId) || new Set()).size;
      distribution.set(degree, (distribution.get(degree) || 0) + 1);
    });

    return distribution;
  }

  /**
   * BFS for shortest paths
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

  /**
   * Check if network has small-world properties
   */
  isSmallWorld(): boolean {
    const avgPathLength = this.calculateAveragePathLength();
    const clusteringCoeff = this.calculateClusteringCoefficient();
    const n = this.graph.nodes.size;

    // Compare to random network
    const randomAvgPathLength = Math.log(n) / Math.log(this.calculateDensity() * n);
    const randomClustering = this.calculateDensity();

    // Small-world: similar path length to random, higher clustering
    return avgPathLength <= randomAvgPathLength * 2 && clusteringCoeff > randomClustering * 3;
  }

  /**
   * Check if network has scale-free properties
   */
  isScaleFree(): boolean {
    const degreeDistribution = this.calculateDegreeDistribution();
    const degrees = Array.from(degreeDistribution.keys()).sort((a, b) => a - b);
    const counts = degrees.map(d => degreeDistribution.get(d) || 0);

    // Check if distribution follows power law (roughly)
    // Simple heuristic: check if log-log plot is approximately linear
    if (degrees.length < 10) return false;

    const logDegrees = degrees.filter(d => d > 0).map(d => Math.log(d));
    const logCounts = degrees.filter(d => d > 0).map((d, i) => Math.log(counts[i]));

    // Calculate correlation coefficient
    const correlation = this.calculateCorrelation(logDegrees, logCounts);
    return correlation < -0.8; // Negative correlation indicates power law
  }

  /**
   * Calculate Pearson correlation coefficient
   */
  private calculateCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n !== y.length || n === 0) return 0;

    const meanX = x.reduce((a, b) => a + b, 0) / n;
    const meanY = y.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denomX = 0;
    let denomY = 0;

    for (let i = 0; i < n; i++) {
      const dx = x[i] - meanX;
      const dy = y[i] - meanY;
      numerator += dx * dy;
      denomX += dx * dx;
      denomY += dy * dy;
    }

    const denom = Math.sqrt(denomX * denomY);
    return denom > 0 ? numerator / denom : 0;
  }
}
