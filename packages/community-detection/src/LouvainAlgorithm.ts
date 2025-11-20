/**
 * Louvain algorithm for community detection (modularity optimization)
 */

import type { Graph, Community, CommunityStructure } from '@intelgraph/network-analysis';

export class LouvainAlgorithm {
  private graph: Graph;
  private m: number; // Total edge weight

  constructor(graph: Graph) {
    this.graph = graph;
    this.m = this.calculateTotalEdgeWeight();
  }

  /**
   * Detect communities using the Louvain algorithm
   */
  detectCommunities(resolution = 1.0): CommunityStructure {
    let communities = this.initializeCommunities();
    let improved = true;
    let level = 0;

    while (improved) {
      improved = false;
      const { newCommunities, modularityGain } = this.optimizeModularity(communities, resolution);

      if (modularityGain > 1e-10) {
        communities = newCommunities;
        improved = true;
        level++;

        // Aggregate graph for next level
        this.graph = this.aggregateGraph(communities);
        this.m = this.calculateTotalEdgeWeight();
      }
    }

    const modularity = this.calculateModularity(communities);
    const coverage = this.calculateCoverage(communities);

    return {
      communities: Array.from(communities.values()),
      algorithm: 'louvain',
      modularity,
      coverage
    };
  }

  /**
   * Initialize each node as its own community
   */
  private initializeCommunities(): Map<string, Community> {
    const communities = new Map<string, Community>();

    this.graph.nodes.forEach((node, nodeId) => {
      communities.set(nodeId, {
        id: nodeId,
        members: new Set([nodeId]),
        modularity: 0,
        density: 0
      });
    });

    return communities;
  }

  /**
   * Optimize modularity by moving nodes between communities
   */
  private optimizeModularity(
    communities: Map<string, Community>,
    resolution: number
  ): { newCommunities: Map<string, Community>; modularityGain: number } {
    const nodeToCommunity = new Map<string, string>();
    communities.forEach((community, id) => {
      community.members.forEach(member => {
        nodeToCommunity.set(member, id);
      });
    });

    let totalGain = 0;
    let improved = true;

    while (improved) {
      improved = false;

      this.graph.nodes.forEach((_, nodeId) => {
        const currentCommunity = nodeToCommunity.get(nodeId)!;
        let bestCommunity = currentCommunity;
        let bestGain = 0;

        // Try moving node to neighboring communities
        const neighborCommunities = this.getNeighborCommunities(nodeId, nodeToCommunity);

        neighborCommunities.forEach(neighborCommunity => {
          if (neighborCommunity !== currentCommunity) {
            const gain = this.modularityGain(
              nodeId,
              currentCommunity,
              neighborCommunity,
              nodeToCommunity,
              resolution
            );

            if (gain > bestGain) {
              bestGain = gain;
              bestCommunity = neighborCommunity;
            }
          }
        });

        // Move node if improvement found
        if (bestCommunity !== currentCommunity && bestGain > 0) {
          nodeToCommunity.set(nodeId, bestCommunity);
          totalGain += bestGain;
          improved = true;
        }
      });
    }

    // Rebuild communities from node assignments
    const newCommunities = new Map<string, Community>();
    nodeToCommunity.forEach((communityId, nodeId) => {
      if (!newCommunities.has(communityId)) {
        newCommunities.set(communityId, {
          id: communityId,
          members: new Set(),
          modularity: 0,
          density: 0
        });
      }
      newCommunities.get(communityId)!.members.add(nodeId);
    });

    return { newCommunities, modularityGain: totalGain };
  }

  /**
   * Calculate modularity gain from moving a node
   */
  private modularityGain(
    nodeId: string,
    fromCommunity: string,
    toCommunity: string,
    nodeToCommunity: Map<string, string>,
    resolution: number
  ): number {
    const k_i = this.getNodeDegree(nodeId);
    const k_i_in_from = this.getEdgeWeightToCommunity(nodeId, fromCommunity, nodeToCommunity);
    const k_i_in_to = this.getEdgeWeightToCommunity(nodeId, toCommunity, nodeToCommunity);

    const sigma_tot_from = this.getCommunityTotalDegree(fromCommunity, nodeToCommunity);
    const sigma_tot_to = this.getCommunityTotalDegree(toCommunity, nodeToCommunity);

    const delta_q_from = (k_i_in_from - resolution * k_i * sigma_tot_from / (2 * this.m)) / this.m;
    const delta_q_to = (k_i_in_to - resolution * k_i * sigma_tot_to / (2 * this.m)) / this.m;

    return delta_q_to - delta_q_from;
  }

  /**
   * Get communities neighboring a node
   */
  private getNeighborCommunities(
    nodeId: string,
    nodeToCommunity: Map<string, string>
  ): Set<string> {
    const communities = new Set<string>();

    this.graph.edges.forEach(edge => {
      if (edge.source === nodeId) {
        const community = nodeToCommunity.get(edge.target);
        if (community) communities.add(community);
      } else if (!this.graph.directed && edge.target === nodeId) {
        const community = nodeToCommunity.get(edge.source);
        if (community) communities.add(community);
      }
    });

    return communities;
  }

  /**
   * Get node degree (sum of edge weights)
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
   * Get total edge weight from node to community
   */
  private getEdgeWeightToCommunity(
    nodeId: string,
    communityId: string,
    nodeToCommunity: Map<string, string>
  ): number {
    let weight = 0;

    this.graph.edges.forEach(edge => {
      if (edge.source === nodeId && nodeToCommunity.get(edge.target) === communityId) {
        weight += edge.weight || 1;
      } else if (!this.graph.directed && edge.target === nodeId && nodeToCommunity.get(edge.source) === communityId) {
        weight += edge.weight || 1;
      }
    });

    return weight;
  }

  /**
   * Get total degree of a community
   */
  private getCommunityTotalDegree(
    communityId: string,
    nodeToCommunity: Map<string, string>
  ): number {
    let degree = 0;

    nodeToCommunity.forEach((community, nodeId) => {
      if (community === communityId) {
        degree += this.getNodeDegree(nodeId);
      }
    });

    return degree;
  }

  /**
   * Calculate total edge weight in graph
   */
  private calculateTotalEdgeWeight(): number {
    let total = 0;

    this.graph.edges.forEach(edge => {
      total += edge.weight || 1;
    });

    return this.graph.directed ? total : total / 2;
  }

  /**
   * Calculate modularity of community structure
   */
  private calculateModularity(communities: Map<string, Community>): number {
    const nodeToCommunity = new Map<string, string>();
    communities.forEach((community, id) => {
      community.members.forEach(member => {
        nodeToCommunity.set(member, id);
      });
    });

    let q = 0;

    this.graph.edges.forEach(edge => {
      const comm_i = nodeToCommunity.get(edge.source);
      const comm_j = nodeToCommunity.get(edge.target);

      if (comm_i === comm_j) {
        const k_i = this.getNodeDegree(edge.source);
        const k_j = this.getNodeDegree(edge.target);
        const weight = edge.weight || 1;

        q += weight - (k_i * k_j) / (2 * this.m);
      }
    });

    return q / (2 * this.m);
  }

  /**
   * Calculate coverage (fraction of edges within communities)
   */
  private calculateCoverage(communities: Map<string, Community>): number {
    const nodeToCommunity = new Map<string, string>();
    communities.forEach((community, id) => {
      community.members.forEach(member => {
        nodeToCommunity.set(member, id);
      });
    });

    let internalEdges = 0;
    let totalEdges = 0;

    this.graph.edges.forEach(edge => {
      const comm_i = nodeToCommunity.get(edge.source);
      const comm_j = nodeToCommunity.get(edge.target);

      if (comm_i === comm_j) {
        internalEdges++;
      }
      totalEdges++;
    });

    return totalEdges > 0 ? internalEdges / totalEdges : 0;
  }

  /**
   * Aggregate graph by merging nodes in same community
   */
  private aggregateGraph(communities: Map<string, Community>): Graph {
    const newGraph: Graph = {
      nodes: new Map(),
      edges: [],
      directed: this.graph.directed,
      weighted: this.graph.weighted
    };

    // Create nodes for communities
    communities.forEach((community, id) => {
      newGraph.nodes.set(id, {
        id,
        attributes: { members: Array.from(community.members) }
      });
    });

    // Create edges between communities
    const nodeToCommunity = new Map<string, string>();
    communities.forEach((community, id) => {
      community.members.forEach(member => {
        nodeToCommunity.set(member, id);
      });
    });

    const communityEdges = new Map<string, number>();

    this.graph.edges.forEach(edge => {
      const comm_i = nodeToCommunity.get(edge.source);
      const comm_j = nodeToCommunity.get(edge.target);

      if (comm_i && comm_j) {
        const edgeKey = `${comm_i}-${comm_j}`;
        const weight = edge.weight || 1;
        communityEdges.set(edgeKey, (communityEdges.get(edgeKey) || 0) + weight);
      }
    });

    communityEdges.forEach((weight, key) => {
      const [source, target] = key.split('-');
      newGraph.edges.push({ source, target, weight });
    });

    return newGraph;
  }
}
