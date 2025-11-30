/**
 * SandboxGraph - Copy-on-Write Delta Overlay Graph
 *
 * Implements an isolated graph for scenario analysis that:
 * - References source graph data without copying
 * - Applies delta operations as an overlay
 * - Supports fast creation from templates
 * - Never mutates production data
 */

import {
  type ScenarioGraph,
  type ScenarioNode,
  type ScenarioEdge,
  type DeltaOperation,
  type DeltaSet,
  generateId,
  ScenarioLimitError,
  InvalidDeltaError,
  ProductionDataGuardError,
} from '../types/index.js';

export interface SourceGraphProvider {
  getNode(id: string): Promise<ScenarioNode | undefined>;
  getEdge(id: string): Promise<ScenarioEdge | undefined>;
  getNodesByLabel(label: string): Promise<ScenarioNode[]>;
  getEdgesByType(type: string): Promise<ScenarioEdge[]>;
  getOutgoingEdges(nodeId: string): Promise<ScenarioEdge[]>;
  getIncomingEdges(nodeId: string): Promise<ScenarioEdge[]>;
  getNeighbors(nodeId: string, depth: number): Promise<{ nodes: ScenarioNode[]; edges: ScenarioEdge[] }>;
}

export interface SandboxGraphConfig {
  maxNodes: number;
  maxEdges: number;
  enableAuditLog: boolean;
  strictMode: boolean;
}

const DEFAULT_CONFIG: SandboxGraphConfig = {
  maxNodes: 10000,
  maxEdges: 50000,
  enableAuditLog: true,
  strictMode: true,
};

export class SandboxGraph {
  private graph: ScenarioGraph;
  private sourceProvider?: SourceGraphProvider;
  private config: SandboxGraphConfig;
  private auditLog: DeltaOperation[] = [];

  constructor(
    scenarioId: string,
    sourceProvider?: SourceGraphProvider,
    config: Partial<SandboxGraphConfig> = {}
  ) {
    this.sourceProvider = sourceProvider;
    this.config = { ...DEFAULT_CONFIG, ...config };

    const now = Date.now();
    this.graph = {
      id: generateId(),
      scenarioId,
      nodes: new Map(),
      edges: new Map(),
      sourceGraphId: undefined,
      sourceNodeIds: new Set(),
      sourceEdgeIds: new Set(),
      deletedNodeIds: new Set(),
      deletedEdgeIds: new Set(),
      outgoing: new Map(),
      incoming: new Map(),
      stats: {
        totalNodes: 0,
        totalEdges: 0,
        addedNodes: 0,
        addedEdges: 0,
        modifiedNodes: 0,
        modifiedEdges: 0,
        deletedNodes: 0,
        deletedEdges: 0,
      },
      createdAt: now,
      updatedAt: now,
    };
  }

  // ============================================================================
  // Graph Creation & Initialization
  // ============================================================================

  /**
   * Create sandbox from a list of node IDs (with optional neighbor expansion)
   */
  async createFromNodes(
    nodeIds: string[],
    options: {
      includeNeighbors?: boolean;
      neighborDepth?: number;
      edgeTypes?: string[];
    } = {}
  ): Promise<void> {
    if (!this.sourceProvider) {
      throw new ProductionDataGuardError('Source provider required for copy-on-write');
    }

    const { includeNeighbors = true, neighborDepth = 2, edgeTypes } = options;
    const collectedNodeIds = new Set<string>(nodeIds);
    const collectedEdgeIds = new Set<string>();

    // Expand to neighbors if requested
    if (includeNeighbors && neighborDepth > 0) {
      for (const nodeId of nodeIds) {
        const { nodes, edges } = await this.sourceProvider.getNeighbors(nodeId, neighborDepth);

        for (const node of nodes) {
          if (this.checkNodeLimit(collectedNodeIds.size + 1)) {
            collectedNodeIds.add(node.id);
          }
        }

        for (const edge of edges) {
          if (!edgeTypes || edgeTypes.includes(edge.type)) {
            if (this.checkEdgeLimit(collectedEdgeIds.size + 1)) {
              collectedEdgeIds.add(edge.id);
            }
          }
        }
      }
    }

    // Also collect direct edges between seed nodes
    for (const nodeId of nodeIds) {
      const outgoing = await this.sourceProvider.getOutgoingEdges(nodeId);
      const incoming = await this.sourceProvider.getIncomingEdges(nodeId);

      for (const edge of [...outgoing, ...incoming]) {
        if (collectedNodeIds.has(edge.sourceId) && collectedNodeIds.has(edge.targetId)) {
          if (!edgeTypes || edgeTypes.includes(edge.type)) {
            collectedEdgeIds.add(edge.id);
          }
        }
      }
    }

    // Store references (not copies) - copy-on-write
    this.graph.sourceNodeIds = collectedNodeIds;
    this.graph.sourceEdgeIds = collectedEdgeIds;

    // Build initial adjacency from source
    await this.rebuildAdjacency();

    // Update stats
    this.updateStats();
  }

  /**
   * Create sandbox from a template (pre-defined graph subset)
   */
  async createFromTemplate(template: {
    nodes: ScenarioNode[];
    edges: ScenarioEdge[];
  }): Promise<void> {
    const now = Date.now();

    // Validate limits
    if (!this.checkNodeLimit(template.nodes.length)) {
      throw new ScenarioLimitError('nodes', template.nodes.length, this.config.maxNodes);
    }
    if (!this.checkEdgeLimit(template.edges.length)) {
      throw new ScenarioLimitError('edges', template.edges.length, this.config.maxEdges);
    }

    // Copy nodes (these are scenario-owned, not source references)
    for (const node of template.nodes) {
      const scenarioNode: ScenarioNode = {
        ...node,
        isOriginal: false,
        modifiedInScenario: false,
        createdAt: node.createdAt || now,
        updatedAt: now,
      };
      this.graph.nodes.set(node.id, scenarioNode);
    }

    // Copy edges
    for (const edge of template.edges) {
      // Validate endpoints exist
      const sourceExists = this.graph.nodes.has(edge.sourceId);
      const targetExists = this.graph.nodes.has(edge.targetId);

      if (!sourceExists || !targetExists) {
        if (this.config.strictMode) {
          throw new InvalidDeltaError(
            `Edge ${edge.id} references non-existent node`,
            { sourceId: edge.sourceId, targetId: edge.targetId }
          );
        }
        continue;
      }

      const scenarioEdge: ScenarioEdge = {
        ...edge,
        isOriginal: false,
        modifiedInScenario: false,
        createdAt: edge.createdAt || now,
        updatedAt: now,
      };
      this.graph.edges.set(edge.id, scenarioEdge);
    }

    // Build adjacency
    this.buildLocalAdjacency();
    this.updateStats();
  }

  /**
   * Clone an existing sandbox graph
   */
  clone(newScenarioId: string): SandboxGraph {
    const cloned = new SandboxGraph(newScenarioId, this.sourceProvider, this.config);

    // Deep copy the graph state
    cloned.graph = {
      ...this.graph,
      id: generateId(),
      scenarioId: newScenarioId,
      nodes: new Map(this.graph.nodes),
      edges: new Map(this.graph.edges),
      sourceNodeIds: new Set(this.graph.sourceNodeIds),
      sourceEdgeIds: new Set(this.graph.sourceEdgeIds),
      deletedNodeIds: new Set(this.graph.deletedNodeIds),
      deletedEdgeIds: new Set(this.graph.deletedEdgeIds),
      outgoing: new Map(),
      incoming: new Map(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    // Rebuild adjacency
    cloned.buildLocalAdjacency();
    cloned.updateStats();

    return cloned;
  }

  // ============================================================================
  // Node Operations (Copy-on-Write)
  // ============================================================================

  /**
   * Get a node (from local overlay or source)
   */
  async getNode(id: string): Promise<ScenarioNode | undefined> {
    // Check if deleted in scenario
    if (this.graph.deletedNodeIds.has(id)) {
      return undefined;
    }

    // Check local overlay first
    const localNode = this.graph.nodes.get(id);
    if (localNode) {
      return localNode;
    }

    // Check if it's a source reference
    if (this.graph.sourceNodeIds.has(id) && this.sourceProvider) {
      return await this.sourceProvider.getNode(id);
    }

    return undefined;
  }

  /**
   * Add a new node to the scenario
   */
  addNode(labels: string[], properties: Record<string, unknown> = {}): ScenarioNode {
    if (!this.checkNodeLimit(this.getTotalNodeCount() + 1)) {
      throw new ScenarioLimitError('nodes', this.getTotalNodeCount() + 1, this.config.maxNodes);
    }

    const now = Date.now();
    const node: ScenarioNode = {
      id: generateId(),
      labels,
      properties,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
      isOriginal: false,
      modifiedInScenario: true,
    };

    this.graph.nodes.set(node.id, node);
    this.graph.outgoing.set(node.id, new Set());
    this.graph.incoming.set(node.id, new Set());

    this.graph.stats.addedNodes++;
    this.graph.stats.totalNodes++;
    this.graph.updatedAt = now;

    this.logOperation({
      id: generateId(),
      type: 'add_node',
      targetId: node.id,
      targetType: 'node',
      after: node,
      timestamp: now,
      reversible: true,
    });

    return node;
  }

  /**
   * Update a node (copy-on-write from source if needed)
   */
  async updateNode(
    id: string,
    properties: Record<string, unknown>,
    merge: boolean = true
  ): Promise<ScenarioNode | undefined> {
    const existingNode = await this.getNode(id);
    if (!existingNode) {
      return undefined;
    }

    const now = Date.now();
    const before = { ...existingNode };

    // Copy-on-write: if node is from source, copy it locally first
    let localNode = this.graph.nodes.get(id);
    if (!localNode) {
      localNode = {
        ...existingNode,
        isOriginal: true,
        sourceNodeId: id,
        modifiedInScenario: true,
      };
      this.graph.nodes.set(id, localNode);
      this.graph.stats.modifiedNodes++;
    }

    // Apply update
    localNode.properties = merge
      ? { ...localNode.properties, ...properties }
      : properties;
    localNode.updatedAt = now;
    localNode.version++;
    localNode.modifiedInScenario = true;

    this.graph.updatedAt = now;

    this.logOperation({
      id: generateId(),
      type: 'update_node',
      targetId: id,
      targetType: 'node',
      before,
      after: localNode,
      timestamp: now,
      reversible: true,
    });

    return localNode;
  }

  /**
   * Remove a node from the scenario
   */
  async removeNode(id: string, cascade: boolean = true): Promise<boolean> {
    const node = await this.getNode(id);
    if (!node) {
      return false;
    }

    const now = Date.now();

    // If cascade, remove connected edges
    if (cascade) {
      const connectedEdges = await this.getAllEdges(id);
      for (const edge of connectedEdges) {
        await this.removeEdge(edge.id);
      }
    }

    // Mark as deleted
    if (this.graph.nodes.has(id)) {
      this.graph.nodes.delete(id);
    }
    if (this.graph.sourceNodeIds.has(id)) {
      this.graph.deletedNodeIds.add(id);
    }

    // Clean up adjacency
    this.graph.outgoing.delete(id);
    this.graph.incoming.delete(id);

    this.graph.stats.deletedNodes++;
    this.graph.stats.totalNodes--;
    this.graph.updatedAt = now;

    this.logOperation({
      id: generateId(),
      type: 'remove_node',
      targetId: id,
      targetType: 'node',
      before: node,
      timestamp: now,
      reversible: true,
    });

    return true;
  }

  // ============================================================================
  // Edge Operations (Copy-on-Write)
  // ============================================================================

  /**
   * Get an edge (from local overlay or source)
   */
  async getEdge(id: string): Promise<ScenarioEdge | undefined> {
    if (this.graph.deletedEdgeIds.has(id)) {
      return undefined;
    }

    const localEdge = this.graph.edges.get(id);
    if (localEdge) {
      return localEdge;
    }

    if (this.graph.sourceEdgeIds.has(id) && this.sourceProvider) {
      return await this.sourceProvider.getEdge(id);
    }

    return undefined;
  }

  /**
   * Add a new edge to the scenario
   */
  async addEdge(
    sourceId: string,
    targetId: string,
    type: string,
    properties: Record<string, unknown> = {},
    weight: number = 1.0
  ): Promise<ScenarioEdge | undefined> {
    // Validate endpoints exist
    const sourceNode = await this.getNode(sourceId);
    const targetNode = await this.getNode(targetId);

    if (!sourceNode || !targetNode) {
      if (this.config.strictMode) {
        throw new InvalidDeltaError(
          'Edge endpoints must exist in scenario',
          { sourceId, targetId }
        );
      }
      return undefined;
    }

    if (!this.checkEdgeLimit(this.getTotalEdgeCount() + 1)) {
      throw new ScenarioLimitError('edges', this.getTotalEdgeCount() + 1, this.config.maxEdges);
    }

    const now = Date.now();
    const edge: ScenarioEdge = {
      id: generateId(),
      type,
      sourceId,
      targetId,
      properties,
      weight,
      createdAt: now,
      updatedAt: now,
      version: 1,
      deleted: false,
      isOriginal: false,
      modifiedInScenario: true,
    };

    this.graph.edges.set(edge.id, edge);

    // Update adjacency
    if (!this.graph.outgoing.has(sourceId)) {
      this.graph.outgoing.set(sourceId, new Set());
    }
    this.graph.outgoing.get(sourceId)!.add(edge.id);

    if (!this.graph.incoming.has(targetId)) {
      this.graph.incoming.set(targetId, new Set());
    }
    this.graph.incoming.get(targetId)!.add(edge.id);

    this.graph.stats.addedEdges++;
    this.graph.stats.totalEdges++;
    this.graph.updatedAt = now;

    this.logOperation({
      id: generateId(),
      type: 'add_edge',
      targetId: edge.id,
      targetType: 'edge',
      after: edge,
      timestamp: now,
      reversible: true,
    });

    return edge;
  }

  /**
   * Update an edge (copy-on-write)
   */
  async updateEdge(
    id: string,
    properties?: Record<string, unknown>,
    weight?: number
  ): Promise<ScenarioEdge | undefined> {
    const existingEdge = await this.getEdge(id);
    if (!existingEdge) {
      return undefined;
    }

    const now = Date.now();
    const before = { ...existingEdge };

    // Copy-on-write
    let localEdge = this.graph.edges.get(id);
    if (!localEdge) {
      localEdge = {
        ...existingEdge,
        isOriginal: true,
        sourceEdgeId: id,
        modifiedInScenario: true,
      };
      this.graph.edges.set(id, localEdge);
      this.graph.stats.modifiedEdges++;
    }

    // Apply updates
    if (properties) {
      localEdge.properties = { ...localEdge.properties, ...properties };
    }
    if (weight !== undefined) {
      localEdge.weight = weight;
    }
    localEdge.updatedAt = now;
    localEdge.version++;
    localEdge.modifiedInScenario = true;

    this.graph.updatedAt = now;

    this.logOperation({
      id: generateId(),
      type: 'update_edge',
      targetId: id,
      targetType: 'edge',
      before,
      after: localEdge,
      timestamp: now,
      reversible: true,
    });

    return localEdge;
  }

  /**
   * Remove an edge from the scenario
   */
  async removeEdge(id: string): Promise<boolean> {
    const edge = await this.getEdge(id);
    if (!edge) {
      return false;
    }

    const now = Date.now();

    // Remove from local storage
    if (this.graph.edges.has(id)) {
      this.graph.edges.delete(id);
    }
    if (this.graph.sourceEdgeIds.has(id)) {
      this.graph.deletedEdgeIds.add(id);
    }

    // Update adjacency
    this.graph.outgoing.get(edge.sourceId)?.delete(id);
    this.graph.incoming.get(edge.targetId)?.delete(id);

    this.graph.stats.deletedEdges++;
    this.graph.stats.totalEdges--;
    this.graph.updatedAt = now;

    this.logOperation({
      id: generateId(),
      type: 'remove_edge',
      targetId: id,
      targetType: 'edge',
      before: edge,
      timestamp: now,
      reversible: true,
    });

    return true;
  }

  // ============================================================================
  // Graph Traversal
  // ============================================================================

  /**
   * Get all outgoing edges for a node
   */
  async getOutgoingEdges(nodeId: string): Promise<ScenarioEdge[]> {
    const edges: ScenarioEdge[] = [];

    // Local edges
    const localEdgeIds = this.graph.outgoing.get(nodeId) || new Set();
    for (const edgeId of localEdgeIds) {
      const edge = await this.getEdge(edgeId);
      if (edge) {
        edges.push(edge);
      }
    }

    // Source edges (if node is from source and not modified locally)
    if (this.graph.sourceNodeIds.has(nodeId) && this.sourceProvider) {
      const sourceEdges = await this.sourceProvider.getOutgoingEdges(nodeId);
      for (const edge of sourceEdges) {
        if (!this.graph.deletedEdgeIds.has(edge.id) && !this.graph.edges.has(edge.id)) {
          edges.push(edge);
        }
      }
    }

    return edges;
  }

  /**
   * Get all incoming edges for a node
   */
  async getIncomingEdges(nodeId: string): Promise<ScenarioEdge[]> {
    const edges: ScenarioEdge[] = [];

    const localEdgeIds = this.graph.incoming.get(nodeId) || new Set();
    for (const edgeId of localEdgeIds) {
      const edge = await this.getEdge(edgeId);
      if (edge) {
        edges.push(edge);
      }
    }

    if (this.graph.sourceNodeIds.has(nodeId) && this.sourceProvider) {
      const sourceEdges = await this.sourceProvider.getIncomingEdges(nodeId);
      for (const edge of sourceEdges) {
        if (!this.graph.deletedEdgeIds.has(edge.id) && !this.graph.edges.has(edge.id)) {
          edges.push(edge);
        }
      }
    }

    return edges;
  }

  /**
   * Get all edges connected to a node
   */
  async getAllEdges(nodeId: string): Promise<ScenarioEdge[]> {
    const outgoing = await this.getOutgoingEdges(nodeId);
    const incoming = await this.getIncomingEdges(nodeId);
    const edgeMap = new Map<string, ScenarioEdge>();

    for (const edge of [...outgoing, ...incoming]) {
      edgeMap.set(edge.id, edge);
    }

    return Array.from(edgeMap.values());
  }

  /**
   * Get neighbors of a node
   */
  async getNeighbors(
    nodeId: string,
    direction: 'out' | 'in' | 'both' = 'both'
  ): Promise<ScenarioNode[]> {
    const neighborIds = new Set<string>();

    if (direction === 'out' || direction === 'both') {
      const outgoing = await this.getOutgoingEdges(nodeId);
      for (const edge of outgoing) {
        neighborIds.add(edge.targetId);
      }
    }

    if (direction === 'in' || direction === 'both') {
      const incoming = await this.getIncomingEdges(nodeId);
      for (const edge of incoming) {
        neighborIds.add(edge.sourceId);
      }
    }

    const neighbors: ScenarioNode[] = [];
    for (const id of neighborIds) {
      const node = await this.getNode(id);
      if (node) {
        neighbors.push(node);
      }
    }

    return neighbors;
  }

  /**
   * Get degree of a node
   */
  async getDegree(nodeId: string, direction: 'out' | 'in' | 'both' = 'both'): Promise<number> {
    let degree = 0;

    if (direction === 'out' || direction === 'both') {
      const outgoing = await this.getOutgoingEdges(nodeId);
      degree += outgoing.length;
    }

    if (direction === 'in' || direction === 'both') {
      const incoming = await this.getIncomingEdges(nodeId);
      degree += incoming.length;
    }

    return degree;
  }

  // ============================================================================
  // Bulk Operations
  // ============================================================================

  /**
   * Get all nodes in the scenario
   */
  async getAllNodes(): Promise<ScenarioNode[]> {
    const nodes: ScenarioNode[] = [];
    const seenIds = new Set<string>();

    // Local nodes
    for (const node of this.graph.nodes.values()) {
      if (!node.deleted) {
        nodes.push(node);
        seenIds.add(node.id);
      }
    }

    // Source nodes (not deleted, not already local)
    if (this.sourceProvider) {
      for (const nodeId of this.graph.sourceNodeIds) {
        if (!this.graph.deletedNodeIds.has(nodeId) && !seenIds.has(nodeId)) {
          const node = await this.sourceProvider.getNode(nodeId);
          if (node) {
            nodes.push(node);
          }
        }
      }
    }

    return nodes;
  }

  /**
   * Get all edges in the scenario
   */
  async getAllEdgesInGraph(): Promise<ScenarioEdge[]> {
    const edges: ScenarioEdge[] = [];
    const seenIds = new Set<string>();

    // Local edges
    for (const edge of this.graph.edges.values()) {
      if (!edge.deleted) {
        edges.push(edge);
        seenIds.add(edge.id);
      }
    }

    // Source edges
    if (this.sourceProvider) {
      for (const edgeId of this.graph.sourceEdgeIds) {
        if (!this.graph.deletedEdgeIds.has(edgeId) && !seenIds.has(edgeId)) {
          const edge = await this.sourceProvider.getEdge(edgeId);
          if (edge) {
            edges.push(edge);
          }
        }
      }
    }

    return edges;
  }

  /**
   * Export the complete scenario graph (materialized)
   */
  async exportGraph(): Promise<{ nodes: ScenarioNode[]; edges: ScenarioEdge[] }> {
    return {
      nodes: await this.getAllNodes(),
      edges: await this.getAllEdgesInGraph(),
    };
  }

  // ============================================================================
  // Delta Management
  // ============================================================================

  /**
   * Apply a delta set to the graph
   */
  async applyDeltaSet(deltaSet: DeltaSet): Promise<void> {
    for (const operation of deltaSet.operations) {
      await this.applyDeltaOperation(operation);
    }
    deltaSet.applied = true;
    deltaSet.appliedAt = Date.now();
  }

  /**
   * Apply a single delta operation
   */
  async applyDeltaOperation(operation: DeltaOperation): Promise<void> {
    const { type, targetId, after } = operation;

    switch (type) {
      case 'add_node': {
        const data = after as { labels: string[]; properties: Record<string, unknown> };
        this.addNode(data.labels, data.properties);
        break;
      }

      case 'remove_node': {
        await this.removeNode(targetId, true);
        break;
      }

      case 'update_node': {
        const data = after as { properties: Record<string, unknown> };
        await this.updateNode(targetId, data.properties);
        break;
      }

      case 'add_edge': {
        const data = after as ScenarioEdge;
        await this.addEdge(data.sourceId, data.targetId, data.type, data.properties, data.weight);
        break;
      }

      case 'remove_edge': {
        await this.removeEdge(targetId);
        break;
      }

      case 'update_edge': {
        const data = after as { properties?: Record<string, unknown>; weight?: number };
        await this.updateEdge(targetId, data.properties, data.weight);
        break;
      }

      case 'adjust_timing': {
        const data = after as { field: string; delayMs: number };
        const targetType = operation.targetType;

        if (targetType === 'node') {
          const node = await this.getNode(targetId);
          if (node) {
            const currentValue = (node.properties[data.field] as number) || 0;
            await this.updateNode(targetId, {
              [data.field]: currentValue + data.delayMs,
            });
          }
        } else if (targetType === 'edge') {
          const edge = await this.getEdge(targetId);
          if (edge) {
            const currentValue = (edge.properties[data.field] as number) || 0;
            await this.updateEdge(targetId, {
              [data.field]: currentValue + data.delayMs,
            });
          }
        }
        break;
      }

      default:
        // Rule and parameter operations are handled externally
        break;
    }
  }

  /**
   * Rollback a delta set
   */
  async rollbackDeltaSet(deltaSet: DeltaSet): Promise<void> {
    // Apply operations in reverse order
    const operations = [...deltaSet.operations].reverse();

    for (const operation of operations) {
      if (!operation.reversible) {
        throw new InvalidDeltaError('Cannot rollback irreversible operation', operation);
      }
      await this.rollbackDeltaOperation(operation);
    }

    deltaSet.applied = false;
    deltaSet.appliedAt = undefined;
  }

  /**
   * Rollback a single delta operation
   */
  private async rollbackDeltaOperation(operation: DeltaOperation): Promise<void> {
    const { type, targetId, before } = operation;

    switch (type) {
      case 'add_node':
        await this.removeNode(targetId, true);
        break;

      case 'remove_node': {
        const data = before as ScenarioNode;
        // Re-add with original data
        const node = this.addNode(data.labels, data.properties);
        // Override ID to match original
        this.graph.nodes.delete(node.id);
        this.graph.nodes.set(targetId, { ...node, id: targetId });
        break;
      }

      case 'update_node': {
        const data = before as ScenarioNode;
        await this.updateNode(targetId, data.properties, false);
        break;
      }

      case 'add_edge':
        await this.removeEdge(targetId);
        break;

      case 'remove_edge': {
        const data = before as ScenarioEdge;
        await this.addEdge(data.sourceId, data.targetId, data.type, data.properties, data.weight);
        break;
      }

      case 'update_edge': {
        const data = before as ScenarioEdge;
        await this.updateEdge(targetId, data.properties, data.weight);
        break;
      }

      default:
        break;
    }
  }

  // ============================================================================
  // Internal Helpers
  // ============================================================================

  private checkNodeLimit(count: number): boolean {
    return count <= this.config.maxNodes;
  }

  private checkEdgeLimit(count: number): boolean {
    return count <= this.config.maxEdges;
  }

  private getTotalNodeCount(): number {
    return (
      this.graph.nodes.size +
      this.graph.sourceNodeIds.size -
      this.graph.deletedNodeIds.size
    );
  }

  private getTotalEdgeCount(): number {
    return (
      this.graph.edges.size +
      this.graph.sourceEdgeIds.size -
      this.graph.deletedEdgeIds.size
    );
  }

  private async rebuildAdjacency(): Promise<void> {
    this.graph.outgoing.clear();
    this.graph.incoming.clear();

    // Initialize for all nodes
    for (const nodeId of this.graph.sourceNodeIds) {
      if (!this.graph.deletedNodeIds.has(nodeId)) {
        this.graph.outgoing.set(nodeId, new Set());
        this.graph.incoming.set(nodeId, new Set());
      }
    }

    for (const [nodeId] of this.graph.nodes) {
      if (!this.graph.outgoing.has(nodeId)) {
        this.graph.outgoing.set(nodeId, new Set());
      }
      if (!this.graph.incoming.has(nodeId)) {
        this.graph.incoming.set(nodeId, new Set());
      }
    }

    // Build from edges
    if (this.sourceProvider) {
      for (const edgeId of this.graph.sourceEdgeIds) {
        if (!this.graph.deletedEdgeIds.has(edgeId)) {
          const edge = await this.sourceProvider.getEdge(edgeId);
          if (edge) {
            this.graph.outgoing.get(edge.sourceId)?.add(edge.id);
            this.graph.incoming.get(edge.targetId)?.add(edge.id);
          }
        }
      }
    }

    for (const edge of this.graph.edges.values()) {
      if (!edge.deleted) {
        this.graph.outgoing.get(edge.sourceId)?.add(edge.id);
        this.graph.incoming.get(edge.targetId)?.add(edge.id);
      }
    }
  }

  private buildLocalAdjacency(): void {
    this.graph.outgoing.clear();
    this.graph.incoming.clear();

    for (const [nodeId] of this.graph.nodes) {
      this.graph.outgoing.set(nodeId, new Set());
      this.graph.incoming.set(nodeId, new Set());
    }

    for (const edge of this.graph.edges.values()) {
      if (!edge.deleted) {
        this.graph.outgoing.get(edge.sourceId)?.add(edge.id);
        this.graph.incoming.get(edge.targetId)?.add(edge.id);
      }
    }
  }

  private updateStats(): void {
    this.graph.stats.totalNodes = this.getTotalNodeCount();
    this.graph.stats.totalEdges = this.getTotalEdgeCount();
  }

  private logOperation(operation: DeltaOperation): void {
    if (this.config.enableAuditLog) {
      this.auditLog.push(operation);
    }
  }

  // ============================================================================
  // Getters
  // ============================================================================

  getGraphId(): string {
    return this.graph.id;
  }

  getScenarioId(): string {
    return this.graph.scenarioId;
  }

  getStats(): ScenarioGraph['stats'] {
    return { ...this.graph.stats };
  }

  getAuditLog(): DeltaOperation[] {
    return [...this.auditLog];
  }

  getGraphSnapshot(): ScenarioGraph {
    return { ...this.graph };
  }
}
