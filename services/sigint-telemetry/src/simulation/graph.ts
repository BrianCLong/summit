/**
 * Infrastructure Graph Model
 *
 * Models synthetic infrastructure as a graph for attack path simulation.
 * Nodes represent assets, identities, and services.
 * Edges represent trust, reachability, and permissions.
 */

import { v4 as uuidv4 } from 'uuid';

/** Node types in the infrastructure graph */
export type NodeType =
  | 'identity'
  | 'endpoint'
  | 'server'
  | 'database'
  | 'storage'
  | 'network_segment'
  | 'cloud_account'
  | 'application';

/** Edge types representing relationships */
export type EdgeType =
  | 'can_authenticate'
  | 'can_access'
  | 'has_permission'
  | 'network_reachable'
  | 'trusts'
  | 'member_of'
  | 'owns';

/** Graph node */
export interface GraphNode {
  id: string;
  type: NodeType;
  name: string;
  properties: Record<string, unknown>;
  /** Security controls applied to this node */
  controls: string[];
  /** Is this node compromised in simulation */
  compromised: boolean;
}

/** Graph edge */
export interface GraphEdge {
  id: string;
  type: EdgeType;
  sourceId: string;
  targetId: string;
  properties: Record<string, unknown>;
  /** Weight/cost for path finding */
  weight: number;
}

/** Infrastructure graph */
export class InfrastructureGraph {
  private nodes: Map<string, GraphNode> = new Map();
  private edges: Map<string, GraphEdge> = new Map();
  private adjacencyList: Map<string, Set<string>> = new Map();

  /** Add a node to the graph */
  addNode(node: Omit<GraphNode, 'id' | 'compromised'>): GraphNode {
    const fullNode: GraphNode = {
      ...node,
      id: uuidv4(),
      compromised: false,
    };
    this.nodes.set(fullNode.id, fullNode);
    this.adjacencyList.set(fullNode.id, new Set());
    return fullNode;
  }

  /** Add an edge between nodes */
  addEdge(edge: Omit<GraphEdge, 'id'>): GraphEdge {
    if (!this.nodes.has(edge.sourceId) || !this.nodes.has(edge.targetId)) {
      throw new Error('Source or target node not found');
    }

    const fullEdge: GraphEdge = {
      ...edge,
      id: uuidv4(),
    };
    this.edges.set(fullEdge.id, fullEdge);
    this.adjacencyList.get(edge.sourceId)?.add(edge.targetId);
    return fullEdge;
  }

  /** Get a node by ID */
  getNode(id: string): GraphNode | undefined {
    return this.nodes.get(id);
  }

  /** Get all nodes */
  getNodes(): GraphNode[] {
    return Array.from(this.nodes.values());
  }

  /** Get nodes by type */
  getNodesByType(type: NodeType): GraphNode[] {
    return this.getNodes().filter((n) => n.type === type);
  }

  /** Get edges from a node */
  getOutgoingEdges(nodeId: string): GraphEdge[] {
    return Array.from(this.edges.values()).filter((e) => e.sourceId === nodeId);
  }

  /** Get edges to a node */
  getIncomingEdges(nodeId: string): GraphEdge[] {
    return Array.from(this.edges.values()).filter((e) => e.targetId === nodeId);
  }

  /** Find neighbors of a node */
  getNeighbors(nodeId: string): GraphNode[] {
    const neighborIds = this.adjacencyList.get(nodeId) ?? new Set();
    return Array.from(neighborIds)
      .map((id) => this.nodes.get(id))
      .filter((n): n is GraphNode => n !== undefined);
  }

  /** Mark a node as compromised */
  compromiseNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (node) {
      node.compromised = true;
    }
  }

  /** Reset compromise state */
  resetCompromise(): void {
    for (const node of this.nodes.values()) {
      node.compromised = false;
    }
  }

  /** Find shortest path between nodes using BFS */
  findPath(sourceId: string, targetId: string): GraphNode[] | null {
    if (!this.nodes.has(sourceId) || !this.nodes.has(targetId)) {
      return null;
    }

    const visited = new Set<string>();
    const parent = new Map<string, string>();
    const queue: string[] = [sourceId];

    visited.add(sourceId);

    while (queue.length > 0) {
      const current = queue.shift()!;

      if (current === targetId) {
        // Reconstruct path
        const path: GraphNode[] = [];
        let node: string | undefined = targetId;
        while (node !== undefined) {
          path.unshift(this.nodes.get(node)!);
          node = parent.get(node);
        }
        return path;
      }

      for (const neighborId of this.adjacencyList.get(current) ?? []) {
        if (!visited.has(neighborId)) {
          visited.add(neighborId);
          parent.set(neighborId, current);
          queue.push(neighborId);
        }
      }
    }

    return null;
  }

  /** Find all attack paths from compromised nodes to target */
  findAttackPaths(targetId: string): GraphNode[][] {
    const compromisedNodes = this.getNodes().filter((n) => n.compromised);
    const paths: GraphNode[][] = [];

    for (const node of compromisedNodes) {
      const path = this.findPath(node.id, targetId);
      if (path) {
        paths.push(path);
      }
    }

    return paths;
  }

  /** Calculate blast radius from a compromised node */
  calculateBlastRadius(nodeId: string): Set<string> {
    const visited = new Set<string>();
    const queue: string[] = [nodeId];

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (visited.has(current)) continue;
      visited.add(current);

      for (const neighborId of this.adjacencyList.get(current) ?? []) {
        if (!visited.has(neighborId)) {
          queue.push(neighborId);
        }
      }
    }

    return visited;
  }

  /** Get graph statistics */
  getStats(): {
    nodeCount: number;
    edgeCount: number;
    nodesByType: Record<string, number>;
    compromisedCount: number;
  } {
    const nodesByType: Record<string, number> = {};
    let compromisedCount = 0;

    for (const node of this.nodes.values()) {
      nodesByType[node.type] = (nodesByType[node.type] ?? 0) + 1;
      if (node.compromised) compromisedCount++;
    }

    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      nodesByType,
      compromisedCount,
    };
  }
}

/** Create a sample synthetic infrastructure graph */
export function createSampleInfrastructure(): InfrastructureGraph {
  const graph = new InfrastructureGraph();

  // Create identities
  const admin = graph.addNode({
    type: 'identity',
    name: 'admin@synthetic.example',
    properties: { role: 'admin', mfa: true },
    controls: ['mfa', 'conditional_access'],
  });

  const user = graph.addNode({
    type: 'identity',
    name: 'user@synthetic.example',
    properties: { role: 'user', mfa: true },
    controls: ['mfa'],
  });

  // Create endpoints
  const workstation = graph.addNode({
    type: 'endpoint',
    name: 'WS-001',
    properties: { os: 'Windows 11', managed: true },
    controls: ['edr', 'disk_encryption'],
  });

  // Create servers
  const webServer = graph.addNode({
    type: 'server',
    name: 'web-prod-01',
    properties: { os: 'Linux', service: 'nginx' },
    controls: ['hids', 'patching'],
  });

  const dbServer = graph.addNode({
    type: 'database',
    name: 'db-prod-01',
    properties: { engine: 'PostgreSQL', encrypted: true },
    controls: ['encryption', 'access_control'],
  });

  // Create cloud resources
  const cloudAccount = graph.addNode({
    type: 'cloud_account',
    name: 'prod-account',
    properties: { provider: 'aws', mfa: true },
    controls: ['cloudtrail', 'guardduty'],
  });

  const storage = graph.addNode({
    type: 'storage',
    name: 's3-data-bucket',
    properties: { encrypted: true, versioned: true },
    controls: ['encryption', 'access_logging'],
  });

  // Create edges (relationships)
  graph.addEdge({
    type: 'can_authenticate',
    sourceId: admin.id,
    targetId: workstation.id,
    properties: {},
    weight: 1,
  });

  graph.addEdge({
    type: 'can_access',
    sourceId: workstation.id,
    targetId: webServer.id,
    properties: { protocol: 'ssh' },
    weight: 1,
  });

  graph.addEdge({
    type: 'network_reachable',
    sourceId: webServer.id,
    targetId: dbServer.id,
    properties: { port: 5432 },
    weight: 1,
  });

  graph.addEdge({
    type: 'has_permission',
    sourceId: admin.id,
    targetId: cloudAccount.id,
    properties: { role: 'admin' },
    weight: 1,
  });

  graph.addEdge({
    type: 'can_access',
    sourceId: cloudAccount.id,
    targetId: storage.id,
    properties: {},
    weight: 1,
  });

  return graph;
}
