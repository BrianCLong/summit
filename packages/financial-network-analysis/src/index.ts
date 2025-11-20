/**
 * Financial Network Analysis Package
 * Entity relationship mapping and money flow visualization
 */

import { Transaction } from '@intelgraph/transaction-monitoring';

export interface NetworkNode {
  id: string;
  label: string;
  type: 'INDIVIDUAL' | 'BUSINESS' | 'ACCOUNT';
  riskScore: number;
  attributes: Record<string, any>;
}

export interface NetworkEdge {
  source: string;
  target: string;
  weight: number;
  transactionCount: number;
  totalAmount: number;
  type: 'TRANSFER' | 'OWNERSHIP' | 'CONTROL';
}

export interface Network {
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  metadata: NetworkMetadata;
}

export interface NetworkMetadata {
  totalNodes: number;
  totalEdges: number;
  density: number;
  clusters: number;
}

export class NetworkAnalyzer {
  async buildNetwork(transactions: Transaction[]): Promise<Network> {
    const nodes = new Map<string, NetworkNode>();
    const edges = new Map<string, NetworkEdge>();

    for (const tx of transactions) {
      // Add sender node
      if (!nodes.has(tx.sender.id)) {
        nodes.set(tx.sender.id, {
          id: tx.sender.id,
          label: tx.sender.name,
          type: tx.sender.type as any,
          riskScore: 0,
          attributes: {},
        });
      }

      // Add receiver node
      if (!nodes.has(tx.receiver.id)) {
        nodes.set(tx.receiver.id, {
          id: tx.receiver.id,
          label: tx.receiver.name,
          type: tx.receiver.type as any,
          riskScore: 0,
          attributes: {},
        });
      }

      // Add/update edge
      const edgeKey = `${tx.sender.id}->${tx.receiver.id}`;
      if (edges.has(edgeKey)) {
        const edge = edges.get(edgeKey)!;
        edge.transactionCount++;
        edge.totalAmount += tx.amount;
        edge.weight = edge.totalAmount;
      } else {
        edges.set(edgeKey, {
          source: tx.sender.id,
          target: tx.receiver.id,
          weight: tx.amount,
          transactionCount: 1,
          totalAmount: tx.amount,
          type: 'TRANSFER',
        });
      }
    }

    const network: Network = {
      nodes: Array.from(nodes.values()),
      edges: Array.from(edges.values()),
      metadata: {
        totalNodes: nodes.size,
        totalEdges: edges.size,
        density: this.calculateDensity(nodes.size, edges.size),
        clusters: 0,
      },
    };

    return network;
  }

  async findMoneyFlowPath(network: Network, fromId: string, toId: string): Promise<string[]> {
    // BFS to find path
    const queue: string[][] = [[fromId]];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const path = queue.shift()!;
      const current = path[path.length - 1];

      if (current === toId) {
        return path;
      }

      if (visited.has(current)) continue;
      visited.add(current);

      const neighbors = network.edges
        .filter(e => e.source === current)
        .map(e => e.target);

      for (const neighbor of neighbors) {
        queue.push([...path, neighbor]);
      }
    }

    return [];
  }

  async identifyIntermediaries(network: Network): Promise<NetworkNode[]> {
    // Find nodes with high betweenness centrality
    const centrality = new Map<string, number>();

    for (const node of network.nodes) {
      const inDegree = network.edges.filter(e => e.target === node.id).length;
      const outDegree = network.edges.filter(e => e.source === node.id).length;
      centrality.set(node.id, inDegree + outDegree);
    }

    return network.nodes
      .filter(n => (centrality.get(n.id) || 0) > 5)
      .sort((a, b) => (centrality.get(b.id) || 0) - (centrality.get(a.id) || 0));
  }

  async detectCommunities(network: Network): Promise<Community[]> {
    // Simplified community detection
    return [];
  }

  async visualizeMoneyFlow(network: Network): Promise<string> {
    // Return visualization data (could be DOT, JSON for D3, etc.)
    return JSON.stringify(network, null, 2);
  }

  private calculateDensity(nodes: number, edges: number): number {
    if (nodes <= 1) return 0;
    const maxEdges = nodes * (nodes - 1) / 2;
    return edges / maxEdges;
  }
}

export interface Community {
  id: string;
  members: string[];
  internalEdges: number;
  externalEdges: number;
}

export class ShellNetworkDetector {
  async detectShellNetwork(network: Network): Promise<ShellNetwork[]> {
    const shells: ShellNetwork[] = [];

    // Identify potential shell company networks
    for (const node of network.nodes) {
      if (node.type === 'BUSINESS') {
        const connections = network.edges.filter(
          e => e.source === node.id || e.target === node.id
        );

        if (connections.length >= 5 && this.hasComplexStructure(node, network)) {
          shells.push({
            centerId: node.id,
            entities: this.getConnectedEntities(node.id, network),
            complexity: connections.length,
            riskScore: 75,
          });
        }
      }
    }

    return shells;
  }

  private hasComplexStructure(node: NetworkNode, network: Network): boolean {
    // Check for circular ownership, offshore entities, etc.
    return true; // Simplified
  }

  private getConnectedEntities(nodeId: string, network: Network): string[] {
    return network.edges
      .filter(e => e.source === nodeId || e.target === nodeId)
      .map(e => e.source === nodeId ? e.target : e.source);
  }
}

export interface ShellNetwork {
  centerId: string;
  entities: string[];
  complexity: number;
  riskScore: number;
}
