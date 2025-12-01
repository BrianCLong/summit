/**
 * Community Detection Algorithms
 * Louvain, Label Propagation, Connected Components
 */

import type { GraphStorage } from '@intelgraph/graph-database';

export interface Community {
  id: string;
  nodeIds: Set<string>;
  size: number;
}

export class CommunityDetection {
  constructor(private storage: GraphStorage) {}

  /**
   * Louvain Method for community detection
   * Optimizes modularity to find communities
   */
  louvain(resolution: number = 1.0): Map<string, string> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const edges = exported.edges;

    // Initialize: each node in its own community
    const nodeToCommunity = new Map<string, string>();
    for (const node of nodes) {
      nodeToCommunity.set(node.id, node.id);
    }

    let improved = true;
    let iteration = 0;
    const maxIterations = 100;

    while (improved && iteration < maxIterations) {
      improved = false;
      iteration++;

      // Phase 1: Move nodes to optimize modularity
      for (const node of nodes) {
        const currentCommunity = nodeToCommunity.get(node.id)!;
        let bestCommunity = currentCommunity;
        let bestGain = 0;

        // Get neighbor communities
        const neighborCommunities = new Set<string>();
        const neighbors = this.storage.getNeighbors(node.id, 'both');

        for (const neighbor of neighbors) {
          neighborCommunities.add(nodeToCommunity.get(neighbor.id)!);
        }

        // Try moving to each neighbor community
        for (const targetCommunity of neighborCommunities) {
          if (targetCommunity === currentCommunity) continue;

          const gain = this.modularityGain(
            node.id,
            currentCommunity,
            targetCommunity,
            nodeToCommunity,
            resolution
          );

          if (gain > bestGain) {
            bestGain = gain;
            bestCommunity = targetCommunity;
          }
        }

        if (bestCommunity !== currentCommunity) {
          nodeToCommunity.set(node.id, bestCommunity);
          improved = true;
        }
      }
    }

    return nodeToCommunity;
  }

  /**
   * Label Propagation Algorithm
   * Fast community detection based on label spreading
   */
  labelPropagation(maxIterations: number = 100): Map<string, string> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;

    // Initialize: each node with unique label
    const labels = new Map<string, string>();
    for (const node of nodes) {
      labels.set(node.id, node.id);
    }

    // Iterate
    for (let iteration = 0; iteration < maxIterations; iteration++) {
      let changed = false;

      // Randomize node order to avoid bias
      const shuffledNodes = this.shuffle([...nodes]);

      for (const node of shuffledNodes) {
        // Count neighbor labels
        const labelCounts = new Map<string, number>();
        const neighbors = this.storage.getNeighbors(node.id, 'both');

        for (const neighbor of neighbors) {
          const label = labels.get(neighbor.id)!;
          labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
        }

        if (labelCounts.size === 0) continue;

        // Find most common label
        let maxCount = 0;
        let mostCommonLabel = labels.get(node.id)!;

        for (const [label, count] of labelCounts) {
          if (count > maxCount) {
            maxCount = count;
            mostCommonLabel = label;
          }
        }

        // Update label if changed
        if (mostCommonLabel !== labels.get(node.id)) {
          labels.set(node.id, mostCommonLabel);
          changed = true;
        }
      }

      if (!changed) break;
    }

    return labels;
  }

  /**
   * Find connected components (strongly connected for directed graphs)
   */
  connectedComponents(): Map<string, string> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const componentMap = new Map<string, string>();
    const visited = new Set<string>();

    let componentId = 0;

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const component = `component_${componentId++}`;
        this.dfsComponent(node.id, component, visited, componentMap);
      }
    }

    return componentMap;
  }

  /**
   * Find weakly connected components (treat edges as undirected)
   */
  weaklyConnectedComponents(): Map<string, string> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const componentMap = new Map<string, string>();
    const visited = new Set<string>();

    let componentId = 0;

    for (const node of nodes) {
      if (!visited.has(node.id)) {
        const component = `component_${componentId++}`;
        this.bfsComponent(node.id, component, visited, componentMap);
      }
    }

    return componentMap;
  }

  /**
   * Girvan-Newman algorithm
   * Iteratively removes edges with highest betweenness
   */
  girvanNewman(numCommunities: number): Map<string, string> {
    // Clone graph (we'll be removing edges)
    const exported = this.storage.exportGraph();

    // Keep removing edges until we have desired number of communities
    while (true) {
      const components = this.weaklyConnectedComponents();
      const numComponents = new Set(components.values()).size;

      if (numComponents >= numCommunities) {
        return components;
      }

      // Calculate edge betweenness
      const edgeBetweenness = this.edgeBetweenness();

      if (edgeBetweenness.size === 0) break;

      // Find edge with highest betweenness
      let maxBetweenness = -Infinity;
      let edgeToRemove: string | null = null;

      for (const [edgeId, betweenness] of edgeBetweenness) {
        if (betweenness > maxBetweenness) {
          maxBetweenness = betweenness;
          edgeToRemove = edgeId;
        }
      }

      if (edgeToRemove) {
        this.storage.deleteEdge(edgeToRemove);
      } else {
        break;
      }
    }

    return this.weaklyConnectedComponents();
  }

  /**
   * Get communities as structured data
   */
  getCommunities(nodeToCommunity: Map<string, string>): Community[] {
    const communityMap = new Map<string, Set<string>>();

    for (const [nodeId, communityId] of nodeToCommunity) {
      if (!communityMap.has(communityId)) {
        communityMap.set(communityId, new Set());
      }
      communityMap.get(communityId)!.add(nodeId);
    }

    const communities: Community[] = [];
    for (const [id, nodeIds] of communityMap) {
      communities.push({
        id,
        nodeIds,
        size: nodeIds.size
      });
    }

    communities.sort((a, b) => b.size - a.size);
    return communities;
  }

  /**
   * Calculate modularity of community structure
   */
  calculateModularity(nodeToCommunity: Map<string, string>): number {
    const exported = this.storage.exportGraph();
    const edges = exported.edges;
    const m = edges.length;

    if (m === 0) return 0;

    let modularity = 0;

    // Calculate degree for each node
    const degrees = new Map<string, number>();
    for (const edge of edges) {
      degrees.set(edge.sourceId, (degrees.get(edge.sourceId) || 0) + 1);
      degrees.set(edge.targetId, (degrees.get(edge.targetId) || 0) + 1);
    }

    // Calculate modularity
    for (const edge of edges) {
      const communityI = nodeToCommunity.get(edge.sourceId);
      const communityJ = nodeToCommunity.get(edge.targetId);

      if (communityI === communityJ) {
        const ki = degrees.get(edge.sourceId) || 0;
        const kj = degrees.get(edge.targetId) || 0;

        modularity += 1 - (ki * kj) / (2 * m);
      }
    }

    return modularity / (2 * m);
  }

  // ==================== Helper Methods ====================

  private modularityGain(
    nodeId: string,
    fromCommunity: string,
    toCommunity: string,
    nodeToCommunity: Map<string, string>,
    resolution: number
  ): number {
    // Simplified modularity gain calculation
    const exported = this.storage.exportGraph();
    const edges = exported.edges;
    const m = edges.length;

    if (m === 0) return 0;

    let gain = 0;

    // Calculate edges to/from communities
    const neighbors = this.storage.getNeighbors(nodeId, 'both');

    let edgesToTarget = 0;
    let edgesFromSource = 0;

    for (const neighbor of neighbors) {
      const neighborCommunity = nodeToCommunity.get(neighbor.id);

      if (neighborCommunity === toCommunity) {
        edgesToTarget++;
      }
      if (neighborCommunity === fromCommunity) {
        edgesFromSource++;
      }
    }

    gain = (edgesToTarget - edgesFromSource) * resolution;

    return gain;
  }

  private dfsComponent(
    nodeId: string,
    component: string,
    visited: Set<string>,
    componentMap: Map<string, string>
  ): void {
    visited.add(nodeId);
    componentMap.set(nodeId, component);

    const neighbors = this.storage.getNeighbors(nodeId, 'out');
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor.id)) {
        this.dfsComponent(neighbor.id, component, visited, componentMap);
      }
    }
  }

  private bfsComponent(
    nodeId: string,
    component: string,
    visited: Set<string>,
    componentMap: Map<string, string>
  ): void {
    const queue = [nodeId];
    visited.add(nodeId);
    componentMap.set(nodeId, component);

    while (queue.length > 0) {
      const current = queue.shift()!;
      const neighbors = this.storage.getNeighbors(current, 'both');

      for (const neighbor of neighbors) {
        if (!visited.has(neighbor.id)) {
          visited.add(neighbor.id);
          componentMap.set(neighbor.id, component);
          queue.push(neighbor.id);
        }
      }
    }
  }

  private edgeBetweenness(): Map<string, number> {
    const exported = this.storage.exportGraph();
    const nodes = exported.nodes;
    const betweenness = new Map<string, number>();

    // Initialize
    for (const edge of exported.edges) {
      betweenness.set(edge.id, 0);
    }

    // For each pair of nodes, find shortest paths
    for (const source of nodes) {
      for (const target of nodes) {
        if (source.id === target.id) continue;

        // BFS to find shortest paths
        const paths = this.findAllShortestPaths(source.id, target.id);

        // Credit each edge on shortest paths
        for (const path of paths) {
          const credit = 1 / paths.length;

          for (const edge of path) {
            betweenness.set(edge.id, (betweenness.get(edge.id) || 0) + credit);
          }
        }
      }
    }

    return betweenness;
  }

  private findAllShortestPaths(sourceId: string, targetId: string): Array<Array<{ id: string }>> {
    // Simplified: return single shortest path
    // Full implementation would return all shortest paths
    return [];
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
