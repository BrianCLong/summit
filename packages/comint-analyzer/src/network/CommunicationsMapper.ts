/**
 * Communications Mapper - Social network analysis from communications
 * TRAINING/SIMULATION ONLY
 */

import { v4 as uuid } from 'uuid';

export interface CommunicationNode {
  id: string;
  identifier: string;
  identifierType: string;
  aliases: string[];

  // Metrics
  degree: number;          // Total connections
  inDegree: number;        // Incoming connections
  outDegree: number;       // Outgoing connections
  betweenness: number;     // Centrality measure
  pageRank: number;

  // Activity
  firstSeen: Date;
  lastSeen: Date;
  communicationCount: number;

  // Metadata
  attributes: Record<string, unknown>;
  isSimulated: boolean;
}

export interface CommunicationEdge {
  id: string;
  source: string;
  target: string;
  weight: number;          // Communication frequency

  // Communication details
  firstContact: Date;
  lastContact: Date;
  totalCount: number;
  totalDuration: number;   // seconds

  // Types
  types: Array<'voice' | 'sms' | 'email' | 'data'>;
  direction: 'both' | 'source_to_target' | 'target_to_source';

  isSimulated: boolean;
}

export interface ContactChain {
  rootNode: string;
  hops: number;
  nodes: CommunicationNode[];
  edges: CommunicationEdge[];
  chainScore: number;
}

export interface NetworkMetrics {
  nodeCount: number;
  edgeCount: number;
  density: number;
  averageDegree: number;
  clusteringCoefficient: number;
  components: number;
  diameter: number;
}

export class CommunicationsMapper {
  private nodes: Map<string, CommunicationNode> = new Map();
  private edges: Map<string, CommunicationEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();

  /**
   * Add a communication event to the graph
   */
  addCommunication(event: {
    source: string;
    sourceType: string;
    target: string;
    targetType: string;
    timestamp: Date;
    type: 'voice' | 'sms' | 'email' | 'data';
    duration?: number;
  }): void {
    // Ensure nodes exist
    this.ensureNode(event.source, event.sourceType);
    this.ensureNode(event.target, event.targetType);

    // Update or create edge
    const edgeKey = this.getEdgeKey(event.source, event.target);
    let edge = this.edges.get(edgeKey);

    if (!edge) {
      edge = {
        id: uuid(),
        source: event.source,
        target: event.target,
        weight: 0,
        firstContact: event.timestamp,
        lastContact: event.timestamp,
        totalCount: 0,
        totalDuration: 0,
        types: [],
        direction: 'source_to_target',
        isSimulated: true
      };
      this.edges.set(edgeKey, edge);

      // Update adjacency list
      if (!this.adjacencyList.has(event.source)) {
        this.adjacencyList.set(event.source, new Set());
      }
      if (!this.adjacencyList.has(event.target)) {
        this.adjacencyList.set(event.target, new Set());
      }
      this.adjacencyList.get(event.source)!.add(event.target);
      this.adjacencyList.get(event.target)!.add(event.source);
    }

    // Update edge metrics
    edge.lastContact = event.timestamp;
    edge.totalCount++;
    edge.weight = Math.log(edge.totalCount + 1);
    if (event.duration) edge.totalDuration += event.duration;
    if (!edge.types.includes(event.type)) edge.types.push(event.type);

    // Update node metrics
    const sourceNode = this.nodes.get(event.source)!;
    const targetNode = this.nodes.get(event.target)!;

    sourceNode.outDegree++;
    sourceNode.communicationCount++;
    sourceNode.lastSeen = event.timestamp;

    targetNode.inDegree++;
    targetNode.communicationCount++;
    targetNode.lastSeen = event.timestamp;
  }

  private ensureNode(identifier: string, identifierType: string): void {
    if (!this.nodes.has(identifier)) {
      this.nodes.set(identifier, {
        id: uuid(),
        identifier,
        identifierType,
        aliases: [],
        degree: 0,
        inDegree: 0,
        outDegree: 0,
        betweenness: 0,
        pageRank: 1 / (this.nodes.size + 1),
        firstSeen: new Date(),
        lastSeen: new Date(),
        communicationCount: 0,
        attributes: {},
        isSimulated: true
      });
    }
  }

  private getEdgeKey(source: string, target: string): string {
    return [source, target].sort().join('::');
  }

  /**
   * Find contact chain from a root node
   */
  findContactChain(rootId: string, maxHops: number = 3): ContactChain | null {
    const node = this.nodes.get(rootId);
    if (!node) return null;

    const visitedNodes = new Map<string, CommunicationNode>();
    const chainEdges: CommunicationEdge[] = [];
    const queue: Array<{ id: string; hop: number }> = [{ id: rootId, hop: 0 }];

    while (queue.length > 0) {
      const { id, hop } = queue.shift()!;

      if (visitedNodes.has(id) || hop > maxHops) continue;

      const currentNode = this.nodes.get(id);
      if (currentNode) {
        visitedNodes.set(id, currentNode);

        if (hop < maxHops) {
          const neighbors = this.adjacencyList.get(id) || new Set();
          for (const neighborId of neighbors) {
            if (!visitedNodes.has(neighborId)) {
              queue.push({ id: neighborId, hop: hop + 1 });

              const edgeKey = this.getEdgeKey(id, neighborId);
              const edge = this.edges.get(edgeKey);
              if (edge && !chainEdges.find(e => e.id === edge.id)) {
                chainEdges.push(edge);
              }
            }
          }
        }
      }
    }

    return {
      rootNode: rootId,
      hops: maxHops,
      nodes: Array.from(visitedNodes.values()),
      edges: chainEdges,
      chainScore: this.calculateChainScore(Array.from(visitedNodes.keys()))
    };
  }

  /**
   * Calculate network metrics
   */
  calculateMetrics(): NetworkMetrics {
    const nodeCount = this.nodes.size;
    const edgeCount = this.edges.size;

    // Density
    const maxEdges = nodeCount * (nodeCount - 1) / 2;
    const density = maxEdges > 0 ? edgeCount / maxEdges : 0;

    // Average degree
    let totalDegree = 0;
    for (const node of this.nodes.values()) {
      const neighbors = this.adjacencyList.get(node.identifier);
      node.degree = neighbors?.size || 0;
      totalDegree += node.degree;
    }
    const averageDegree = nodeCount > 0 ? totalDegree / nodeCount : 0;

    // Connected components (simplified)
    const components = this.countComponents();

    return {
      nodeCount,
      edgeCount,
      density,
      averageDegree,
      clusteringCoefficient: this.calculateClusteringCoefficient(),
      components,
      diameter: this.estimateDiameter()
    };
  }

  /**
   * Calculate PageRank for all nodes
   */
  calculatePageRank(iterations: number = 20, damping: number = 0.85): void {
    const nodeCount = this.nodes.size;
    if (nodeCount === 0) return;

    // Initialize
    for (const node of this.nodes.values()) {
      node.pageRank = 1 / nodeCount;
    }

    // Iterate
    for (let i = 0; i < iterations; i++) {
      const newRanks = new Map<string, number>();

      for (const node of this.nodes.values()) {
        let rank = (1 - damping) / nodeCount;

        const neighbors = this.adjacencyList.get(node.identifier) || new Set();
        for (const neighborId of neighbors) {
          const neighbor = this.nodes.get(neighborId);
          if (neighbor) {
            const neighborDegree = this.adjacencyList.get(neighborId)?.size || 1;
            rank += damping * (neighbor.pageRank / neighborDegree);
          }
        }

        newRanks.set(node.identifier, rank);
      }

      // Update ranks
      for (const [id, rank] of newRanks) {
        const node = this.nodes.get(id);
        if (node) node.pageRank = rank;
      }
    }
  }

  /**
   * Find key communicators (high centrality nodes)
   */
  findKeyCommunicators(limit: number = 10): CommunicationNode[] {
    this.calculatePageRank();

    return Array.from(this.nodes.values())
      .sort((a, b) => b.pageRank - a.pageRank)
      .slice(0, limit);
  }

  /**
   * Detect communities using label propagation
   */
  detectCommunities(): Map<string, string[]> {
    const labels = new Map<string, string>();

    // Initialize each node with its own label
    for (const id of this.nodes.keys()) {
      labels.set(id, id);
    }

    // Iterate until convergence
    let changed = true;
    let iterations = 0;
    const maxIterations = 50;

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const [id] of this.nodes) {
        const neighbors = this.adjacencyList.get(id) || new Set();
        if (neighbors.size === 0) continue;

        // Count neighbor labels
        const labelCounts = new Map<string, number>();
        for (const neighborId of neighbors) {
          const label = labels.get(neighborId)!;
          labelCounts.set(label, (labelCounts.get(label) || 0) + 1);
        }

        // Find most frequent label
        let maxCount = 0;
        let maxLabel = labels.get(id)!;
        for (const [label, count] of labelCounts) {
          if (count > maxCount) {
            maxCount = count;
            maxLabel = label;
          }
        }

        if (maxLabel !== labels.get(id)) {
          labels.set(id, maxLabel);
          changed = true;
        }
      }
    }

    // Group by community
    const communities = new Map<string, string[]>();
    for (const [id, label] of labels) {
      if (!communities.has(label)) {
        communities.set(label, []);
      }
      communities.get(label)!.push(id);
    }

    return communities;
  }

  private countComponents(): number {
    const visited = new Set<string>();
    let components = 0;

    for (const id of this.nodes.keys()) {
      if (!visited.has(id)) {
        components++;
        this.dfs(id, visited);
      }
    }

    return components;
  }

  private dfs(start: string, visited: Set<string>): void {
    const stack = [start];

    while (stack.length > 0) {
      const id = stack.pop()!;
      if (visited.has(id)) continue;

      visited.add(id);
      const neighbors = this.adjacencyList.get(id) || new Set();
      for (const neighbor of neighbors) {
        if (!visited.has(neighbor)) {
          stack.push(neighbor);
        }
      }
    }
  }

  private calculateClusteringCoefficient(): number {
    let totalCoeff = 0;
    let count = 0;

    for (const [id] of this.nodes) {
      const neighbors = Array.from(this.adjacencyList.get(id) || []);
      const k = neighbors.length;

      if (k < 2) continue;

      let triangles = 0;
      for (let i = 0; i < k; i++) {
        for (let j = i + 1; j < k; j++) {
          if (this.adjacencyList.get(neighbors[i])?.has(neighbors[j])) {
            triangles++;
          }
        }
      }

      const possibleTriangles = k * (k - 1) / 2;
      totalCoeff += triangles / possibleTriangles;
      count++;
    }

    return count > 0 ? totalCoeff / count : 0;
  }

  private estimateDiameter(): number {
    // Simplified: sample a few BFS traversals
    let maxDistance = 0;
    const sampleNodes = Array.from(this.nodes.keys()).slice(0, 5);

    for (const start of sampleNodes) {
      const distances = this.bfsDistances(start);
      for (const d of distances.values()) {
        if (d > maxDistance && d < Infinity) {
          maxDistance = d;
        }
      }
    }

    return maxDistance;
  }

  private bfsDistances(start: string): Map<string, number> {
    const distances = new Map<string, number>();
    const queue: Array<{ id: string; dist: number }> = [{ id: start, dist: 0 }];

    while (queue.length > 0) {
      const { id, dist } = queue.shift()!;
      if (distances.has(id)) continue;

      distances.set(id, dist);

      const neighbors = this.adjacencyList.get(id) || new Set();
      for (const neighbor of neighbors) {
        if (!distances.has(neighbor)) {
          queue.push({ id: neighbor, dist: dist + 1 });
        }
      }
    }

    return distances;
  }

  private calculateChainScore(nodeIds: string[]): number {
    let score = 0;
    for (const id of nodeIds) {
      const node = this.nodes.get(id);
      if (node) {
        score += node.pageRank + node.communicationCount * 0.01;
      }
    }
    return score;
  }

  getNodes(): CommunicationNode[] {
    return Array.from(this.nodes.values());
  }

  getEdges(): CommunicationEdge[] {
    return Array.from(this.edges.values());
  }

  getNode(identifier: string): CommunicationNode | undefined {
    return this.nodes.get(identifier);
  }

  clear(): void {
    this.nodes.clear();
    this.edges.clear();
    this.adjacencyList.clear();
  }
}
