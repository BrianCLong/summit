/**
 * Amplification network identification
 * Detects coordinated amplification and influence networks
 */

export interface AmplificationNetwork {
  networkId: string;
  centralNodes: string[];
  amplifiers: string[];
  targets: string[];
  amplificationFactor: number;
  reach: number;
  coordination: number;
}

export interface NetworkNode {
  nodeId: string;
  type: 'source' | 'amplifier' | 'target' | 'bridge';
  connections: string[];
  activity: NodeActivity;
}

export interface NodeActivity {
  posts: number;
  shares: number;
  likes: number;
  followers: number;
  engagement: number;
}

export class AmplificationDetector {
  async detectAmplificationNetworks(nodes: NetworkNode[]): Promise<AmplificationNetwork[]> {
    const networks: AmplificationNetwork[] = [];

    // Build adjacency graph
    const graph = this.buildGraph(nodes);

    // Identify central nodes (potential influencers)
    const centralNodes = this.identifyCentralNodes(nodes, graph);

    // For each central node, find its amplification network
    for (const centralId of centralNodes) {
      const network = this.traceAmplificationNetwork(centralId, nodes, graph);

      if (network.amplifiers.length >= 3) {
        networks.push(network);
      }
    }

    return networks;
  }

  async analyzeAmplificationChains(
    network: AmplificationNetwork,
    nodes: NetworkNode[]
  ): Promise<AmplificationChain[]> {
    const chains: AmplificationChain[] = [];

    for (const centralId of network.centralNodes) {
      const chain = this.traceChain(centralId, nodes);
      chains.push(chain);
    }

    return chains;
  }

  private buildGraph(nodes: NetworkNode[]): Map<string, Set<string>> {
    const graph = new Map<string, Set<string>>();

    for (const node of nodes) {
      if (!graph.has(node.nodeId)) {
        graph.set(node.nodeId, new Set());
      }

      for (const connection of node.connections) {
        graph.get(node.nodeId)!.add(connection);
      }
    }

    return graph;
  }

  private identifyCentralNodes(
    nodes: NetworkNode[],
    graph: Map<string, Set<string>>
  ): string[] {
    const centralNodes: string[] = [];

    // Calculate centrality metrics
    const centralities = new Map<string, number>();

    for (const node of nodes) {
      const centrality = this.calculateCentrality(node.nodeId, graph);
      centralities.set(node.nodeId, centrality);
    }

    // Get top 20% as central nodes
    const sortedNodes = Array.from(centralities.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.ceil(nodes.length * 0.2));

    for (const [nodeId] of sortedNodes) {
      centralNodes.push(nodeId);
    }

    return centralNodes;
  }

  private calculateCentrality(nodeId: string, graph: Map<string, Set<string>>): number {
    // Simple degree centrality (number of connections)
    const connections = graph.get(nodeId) || new Set();
    return connections.size;
  }

  private traceAmplificationNetwork(
    centralId: string,
    nodes: NetworkNode[],
    graph: Map<string, Set<string>>
  ): AmplificationNetwork {
    const amplifiers: string[] = [];
    const targets = new Set<string>();
    const visited = new Set<string>();

    // BFS to find amplification network
    const queue = [centralId];
    visited.add(centralId);

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const connections = graph.get(currentId) || new Set();

      for (const connectedId of connections) {
        if (visited.has(connectedId)) continue;

        visited.add(connectedId);
        const node = nodes.find(n => n.nodeId === connectedId);

        if (!node) continue;

        // Classify node
        if (this.isAmplifier(node)) {
          amplifiers.push(connectedId);
          queue.push(connectedId); // Continue tracing from amplifiers
        } else {
          targets.add(connectedId);
        }
      }
    }

    const amplificationFactor = this.calculateAmplificationFactor(
      centralId,
      amplifiers,
      nodes
    );

    const reach = this.calculateReach(centralId, amplifiers, nodes);

    const coordination = this.calculateCoordination(
      [centralId, ...amplifiers],
      graph
    );

    return {
      networkId: this.generateNetworkId(centralId),
      centralNodes: [centralId],
      amplifiers,
      targets: Array.from(targets),
      amplificationFactor,
      reach,
      coordination,
    };
  }

  private isAmplifier(node: NetworkNode): boolean {
    // Amplifiers have high share/repost activity relative to original posts
    const shareRatio = node.activity.shares / Math.max(node.activity.posts, 1);
    return shareRatio > 2;
  }

  private calculateAmplificationFactor(
    centralId: string,
    amplifiers: string[],
    nodes: NetworkNode[]
  ): number {
    const centralNode = nodes.find(n => n.nodeId === centralId);
    if (!centralNode) return 0;

    let totalAmplification = 0;

    for (const amplifierId of amplifiers) {
      const amplifier = nodes.find(n => n.nodeId === amplifierId);
      if (amplifier) {
        totalAmplification += amplifier.activity.followers;
      }
    }

    const originalReach = centralNode.activity.followers;
    return totalAmplification / Math.max(originalReach, 1);
  }

  private calculateReach(
    centralId: string,
    amplifiers: string[],
    nodes: NetworkNode[]
  ): number {
    const centralNode = nodes.find(n => n.nodeId === centralId);
    let totalReach = centralNode?.activity.followers || 0;

    for (const amplifierId of amplifiers) {
      const amplifier = nodes.find(n => n.nodeId === amplifierId);
      if (amplifier) {
        totalReach += amplifier.activity.followers;
      }
    }

    return totalReach;
  }

  private calculateCoordination(
    nodeIds: string[],
    graph: Map<string, Set<string>>
  ): number {
    if (nodeIds.length < 2) return 0;

    let connections = 0;
    const maxPossible = (nodeIds.length * (nodeIds.length - 1)) / 2;

    for (let i = 0; i < nodeIds.length; i++) {
      const nodeConnections = graph.get(nodeIds[i]) || new Set();

      for (let j = i + 1; j < nodeIds.length; j++) {
        if (nodeConnections.has(nodeIds[j])) {
          connections++;
        }
      }
    }

    return connections / maxPossible;
  }

  private traceChain(centralId: string, nodes: NetworkNode[]): AmplificationChain {
    // Simplified chain tracing
    const chain: ChainLink[] = [];

    const centralNode = nodes.find(n => n.nodeId === centralId);
    if (centralNode) {
      chain.push({
        nodeId: centralId,
        level: 0,
        reach: centralNode.activity.followers,
        engagement: centralNode.activity.engagement,
      });

      // Add first-level amplifiers
      for (const connection of centralNode.connections) {
        const amplifier = nodes.find(n => n.nodeId === connection);
        if (amplifier && this.isAmplifier(amplifier)) {
          chain.push({
            nodeId: connection,
            level: 1,
            reach: amplifier.activity.followers,
            engagement: amplifier.activity.engagement,
          });
        }
      }
    }

    return {
      chainId: this.generateChainId(centralId),
      origin: centralId,
      links: chain,
      totalReach: chain.reduce((sum, link) => sum + link.reach, 0),
      depth: Math.max(...chain.map(link => link.level)) + 1,
    };
  }

  private generateNetworkId(centralId: string): string {
    return `ampnet_${centralId}_${Date.now().toString(36)}`;
  }

  private generateChainId(centralId: string): string {
    return `chain_${centralId}_${Date.now().toString(36)}`;
  }
}

export interface AmplificationChain {
  chainId: string;
  origin: string;
  links: ChainLink[];
  totalReach: number;
  depth: number;
}

export interface ChainLink {
  nodeId: string;
  level: number;
  reach: number;
  engagement: number;
}
