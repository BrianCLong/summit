/**
 * Label Propagation Algorithm for community detection
 */

import type { Graph, Community, CommunityStructure } from '@intelgraph/network-analysis';

export class LabelPropagation {
  private graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  /**
   * Detect communities using label propagation
   */
  detectCommunities(maxIterations = 100): CommunityStructure {
    // Initialize: each node gets its own label
    const labels = new Map<string, string>();
    const nodeIds = Array.from(this.graph.nodes.keys());

    nodeIds.forEach(id => {
      labels.set(id, id);
    });

    // Iterate until convergence or max iterations
    let changed = true;
    let iteration = 0;

    while (changed && iteration < maxIterations) {
      changed = false;
      iteration++;

      // Randomize node order for asynchronous update
      const shuffledNodes = this.shuffleArray([...nodeIds]);

      for (const nodeId of shuffledNodes) {
        const neighborLabels = this.getNeighborLabels(nodeId, labels);

        if (neighborLabels.size > 0) {
          const mostFrequentLabel = this.getMostFrequentLabel(neighborLabels);

          if (mostFrequentLabel !== labels.get(nodeId)) {
            labels.set(nodeId, mostFrequentLabel);
            changed = true;
          }
        }
      }
    }

    // Build communities from labels
    const communities = this.buildCommunitiesFromLabels(labels);
    const modularity = this.calculateModularity(communities, labels);
    const coverage = this.calculateCoverage(communities, labels);

    return {
      communities: Array.from(communities.values()),
      algorithm: 'label_propagation',
      modularity,
      coverage
    };
  }

  /**
   * Get labels of neighboring nodes
   */
  private getNeighborLabels(nodeId: string, labels: Map<string, string>): Map<string, number> {
    const neighborLabels = new Map<string, number>();

    this.graph.edges.forEach(edge => {
      let neighbor: string | null = null;
      let weight = edge.weight || 1;

      if (edge.source === nodeId) {
        neighbor = edge.target;
      } else if (!this.graph.directed && edge.target === nodeId) {
        neighbor = edge.source;
      }

      if (neighbor) {
        const label = labels.get(neighbor);
        if (label) {
          neighborLabels.set(label, (neighborLabels.get(label) || 0) + weight);
        }
      }
    });

    return neighborLabels;
  }

  /**
   * Get the most frequent label from neighbors
   */
  private getMostFrequentLabel(labelCounts: Map<string, number>): string {
    let maxCount = 0;
    let maxLabel = '';
    const candidates: string[] = [];

    labelCounts.forEach((count, label) => {
      if (count > maxCount) {
        maxCount = count;
        maxLabel = label;
        candidates.length = 0;
        candidates.push(label);
      } else if (count === maxCount) {
        candidates.push(label);
      }
    });

    // Break ties randomly
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  /**
   * Build community structure from node labels
   */
  private buildCommunitiesFromLabels(labels: Map<string, string>): Map<string, Community> {
    const communities = new Map<string, Community>();

    labels.forEach((label, nodeId) => {
      if (!communities.has(label)) {
        communities.set(label, {
          id: label,
          members: new Set(),
          modularity: 0,
          density: 0
        });
      }
      communities.get(label)!.members.add(nodeId);
    });

    // Calculate density for each community
    communities.forEach(community => {
      community.density = this.calculateCommunityDensity(community);
    });

    return communities;
  }

  /**
   * Calculate density of a community
   */
  private calculateCommunityDensity(community: Community): number {
    const n = community.members.size;
    if (n <= 1) return 0;

    let internalEdges = 0;
    const maxEdges = this.graph.directed ? n * (n - 1) : n * (n - 1) / 2;

    this.graph.edges.forEach(edge => {
      if (community.members.has(edge.source) && community.members.has(edge.target)) {
        internalEdges++;
      }
    });

    return maxEdges > 0 ? internalEdges / maxEdges : 0;
  }

  /**
   * Calculate modularity
   */
  private calculateModularity(
    communities: Map<string, Community>,
    labels: Map<string, string>
  ): number {
    const m = this.getTotalEdgeWeight();
    if (m === 0) return 0;

    let q = 0;

    this.graph.edges.forEach(edge => {
      const label_i = labels.get(edge.source);
      const label_j = labels.get(edge.target);

      if (label_i === label_j) {
        const k_i = this.getNodeDegree(edge.source);
        const k_j = this.getNodeDegree(edge.target);
        const weight = edge.weight || 1;

        q += weight - (k_i * k_j) / (2 * m);
      }
    });

    return q / (2 * m);
  }

  /**
   * Calculate coverage
   */
  private calculateCoverage(
    communities: Map<string, Community>,
    labels: Map<string, string>
  ): number {
    let internalEdges = 0;
    let totalEdges = this.graph.edges.length;

    this.graph.edges.forEach(edge => {
      const label_i = labels.get(edge.source);
      const label_j = labels.get(edge.target);

      if (label_i === label_j) {
        internalEdges++;
      }
    });

    return totalEdges > 0 ? internalEdges / totalEdges : 0;
  }

  /**
   * Get total edge weight
   */
  private getTotalEdgeWeight(): number {
    let total = 0;
    this.graph.edges.forEach(edge => {
      total += edge.weight || 1;
    });
    return this.graph.directed ? total : total / 2;
  }

  /**
   * Get node degree
   */
  private getNodeDegree(nodeId: string): number {
    let degree = 0;

    this.graph.edges.forEach(edge => {
      if (edge.source === nodeId || (!this.graph.directed && edge.target === nodeId)) {
        degree += edge.weight || 1;
      }
    });

    return degree;
  }

  /**
   * Shuffle array (Fisher-Yates algorithm)
   */
  private shuffleArray<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
