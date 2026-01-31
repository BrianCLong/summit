/**
 * Summit Work Graph - Neo4j Graph Store
 *
 * Persistent graph storage using Neo4j with full ACID transactions,
 * efficient traversal queries, and real-time change detection.
 */

import neo4j, { Driver, Session, Transaction } from 'neo4j-driver';
import type { WorkGraphNode, NodeType } from '../schema/nodes.js';
import type { WorkGraphEdge, EdgeType } from '../schema/edges.js';

// ============================================
// Common Interface
// ============================================

export interface GraphStore {
  getNode<T extends WorkGraphNode>(id: string): Promise<T | null>;
  getNodes<T extends WorkGraphNode>(filter?: Partial<T>): Promise<T[]>;
  createNode<T extends WorkGraphNode>(node: T): Promise<T>;
  updateNode<T extends WorkGraphNode>(id: string, updates: Partial<T>): Promise<T | null>;
  deleteNode(id: string): Promise<boolean>;
  createEdge(edge: WorkGraphEdge): Promise<WorkGraphEdge>;
  getEdges(filter?: { sourceId?: string; targetId?: string; type?: string }): Promise<WorkGraphEdge[]>;
  deleteEdge(id: string): Promise<boolean>;
}

// ============================================
// Types
// ============================================

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
  maxConnectionPoolSize?: number;
}

export interface QueryOptions {
  skip?: number;
  limit?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  nodesByType: Record<string, number>;
  edgesByType: Record<string, number>;
  orphanNodes: number;
  avgDegree: number;
}

export interface ChangeEvent {
  type: 'node_created' | 'node_updated' | 'node_deleted' | 'edge_created' | 'edge_deleted';
  entityType: 'node' | 'edge';
  entityId: string;
  data?: unknown;
  timestamp: Date;
  actor: string;
}

type ChangeListener = (event: ChangeEvent) => void;

// ============================================
// Neo4j Graph Store
// ============================================

export class Neo4jGraphStore {
  private driver: Driver;
  private database: string;
  private changeListeners: ChangeListener[] = [];

  constructor(config: Neo4jConfig) {
    this.driver = neo4j.driver(
      config.uri,
      neo4j.auth.basic(config.username, config.password),
      {
        maxConnectionPoolSize: config.maxConnectionPoolSize ?? 50,
        connectionAcquisitionTimeout: 30000,
      }
    );
    this.database = config.database ?? 'neo4j';
  }

  async connect(): Promise<void> {
    await this.driver.verifyConnectivity();
    await this.ensureIndexes();
  }

  async disconnect(): Promise<void> {
    await this.driver.close();
  }

  // ============================================
  // Node Operations
  // ============================================

  async createNode<T extends WorkGraphNode>(node: T): Promise<T> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeWrite(async (tx) => {
        const query = `
          CREATE (n:${this.getNodeLabel(node.type)} $props)
          SET n.createdAt = datetime($createdAt)
          SET n.updatedAt = datetime($updatedAt)
          RETURN n
        `;
        const params = {
          props: this.serializeNode(node),
          createdAt: node.createdAt.toISOString(),
          updatedAt: node.updatedAt.toISOString(),
        };
        return tx.run(query, params);
      });

      const created = this.deserializeNode(result.records[0].get('n').properties) as T;
      this.emitChange({
        type: 'node_created',
        entityType: 'node',
        entityId: created.id,
        data: created,
        timestamp: new Date(),
        actor: node.createdBy,
      });

      return created;
    } finally {
      await session.close();
    }
  }

  async getNode<T extends WorkGraphNode>(id: string): Promise<T | null> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeRead(async (tx) => {
        const query = `MATCH (n {id: $id}) RETURN n`;
        return tx.run(query, { id });
      });

      if (result.records.length === 0) return null;
      return this.deserializeNode(result.records[0].get('n').properties) as T;
    } finally {
      await session.close();
    }
  }

  async getNodes<T extends WorkGraphNode>(
    filter?: Partial<T>,
    options?: QueryOptions
  ): Promise<T[]> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeRead(async (tx) => {
        let query = 'MATCH (n)';
        const params: Record<string, unknown> = {};

        if (filter) {
          const conditions = Object.entries(filter)
            .filter(([_, v]) => v !== undefined)
            .map(([k, v], i) => {
              params[`p${i}`] = v;
              return `n.${k} = $p${i}`;
            });
          if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
          }
        }

        query += ' RETURN n';

        if (options?.orderBy) {
          query += ` ORDER BY n.${options.orderBy} ${options.orderDirection ?? 'ASC'}`;
        }
        if (options?.skip) {
          query += ` SKIP ${options.skip}`;
        }
        if (options?.limit) {
          query += ` LIMIT ${options.limit}`;
        }

        return tx.run(query, params);
      });

      return result.records.map((r) => this.deserializeNode(r.get('n').properties) as T);
    } finally {
      await session.close();
    }
  }

  async updateNode<T extends WorkGraphNode>(id: string, updates: Partial<T>): Promise<T | null> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeWrite(async (tx) => {
        const setStatements = Object.entries(updates)
          .filter(([k]) => k !== 'id' && k !== 'type' && k !== 'createdAt')
          .map(([k], i) => `n.${k} = $u${i}`)
          .join(', ');

        const params: Record<string, unknown> = { id };
        Object.entries(updates)
          .filter(([k]) => k !== 'id' && k !== 'type' && k !== 'createdAt')
          .forEach(([_, v], i) => {
            params[`u${i}`] = v instanceof Date ? v.toISOString() : v;
          });

        const query = `
          MATCH (n {id: $id})
          SET ${setStatements}, n.updatedAt = datetime()
          RETURN n
        `;
        return tx.run(query, params);
      });

      if (result.records.length === 0) return null;
      const updated = this.deserializeNode(result.records[0].get('n').properties) as T;

      this.emitChange({
        type: 'node_updated',
        entityType: 'node',
        entityId: id,
        data: updates,
        timestamp: new Date(),
        actor: 'system',
      });

      return updated;
    } finally {
      await session.close();
    }
  }

  async deleteNode(id: string): Promise<boolean> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeWrite(async (tx) => {
        const query = `MATCH (n {id: $id}) DETACH DELETE n RETURN count(n) as deleted`;
        return tx.run(query, { id });
      });

      const deleted = result.records[0].get('deleted').toNumber() > 0;
      if (deleted) {
        this.emitChange({
          type: 'node_deleted',
          entityType: 'node',
          entityId: id,
          timestamp: new Date(),
          actor: 'system',
        });
      }
      return deleted;
    } finally {
      await session.close();
    }
  }

  // ============================================
  // Edge Operations
  // ============================================

  async createEdge<T extends WorkGraphEdge>(edge: T): Promise<T> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeWrite(async (tx) => {
        const query = `
          MATCH (source {id: $sourceId})
          MATCH (target {id: $targetId})
          CREATE (source)-[r:${this.getEdgeLabel(edge.type)} $props]->(target)
          SET r.createdAt = datetime($createdAt)
          RETURN r
        `;
        const params = {
          sourceId: edge.sourceId,
          targetId: edge.targetId,
          props: this.serializeEdge(edge),
          createdAt: edge.createdAt.toISOString(),
        };
        return tx.run(query, params);
      });

      const created = this.deserializeEdge(result.records[0].get('r').properties) as T;
      this.emitChange({
        type: 'edge_created',
        entityType: 'edge',
        entityId: created.id,
        data: created,
        timestamp: new Date(),
        actor: edge.createdBy,
      });

      return created;
    } finally {
      await session.close();
    }
  }

  async getEdges(filter?: {
    sourceId?: string;
    targetId?: string;
    type?: EdgeType;
  }): Promise<WorkGraphEdge[]> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeRead(async (tx) => {
        let query = 'MATCH (s)-[r]->(t) WHERE 1=1';
        const params: Record<string, unknown> = {};

        if (filter?.sourceId) {
          query += ' AND s.id = $sourceId';
          params.sourceId = filter.sourceId;
        }
        if (filter?.targetId) {
          query += ' AND t.id = $targetId';
          params.targetId = filter.targetId;
        }
        if (filter?.type) {
          query += ` AND type(r) = $edgeType`;
          params.edgeType = this.getEdgeLabel(filter.type);
        }

        query += ' RETURN r, s.id as sourceId, t.id as targetId';
        return tx.run(query, params);
      });

      return result.records.map((r) => ({
        ...this.deserializeEdge(r.get('r').properties),
        sourceId: r.get('sourceId'),
        targetId: r.get('targetId'),
      })) as WorkGraphEdge[];
    } finally {
      await session.close();
    }
  }

  async getIncomingEdges(nodeId: string): Promise<WorkGraphEdge[]> {
    return this.getEdges({ targetId: nodeId });
  }

  async getOutgoingEdges(nodeId: string): Promise<WorkGraphEdge[]> {
    return this.getEdges({ sourceId: nodeId });
  }

  async deleteEdge(id: string): Promise<boolean> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeWrite(async (tx) => {
        const query = `MATCH ()-[r {id: $id}]->() DELETE r RETURN count(r) as deleted`;
        return tx.run(query, { id });
      });

      const deleted = result.records[0].get('deleted').toNumber() > 0;
      if (deleted) {
        this.emitChange({
          type: 'edge_deleted',
          entityType: 'edge',
          entityId: id,
          timestamp: new Date(),
          actor: 'system',
        });
      }
      return deleted;
    } finally {
      await session.close();
    }
  }

  // ============================================
  // Graph Queries
  // ============================================

  async findPath(
    fromId: string,
    toId: string,
    edgeTypes?: EdgeType[]
  ): Promise<{ nodes: string[]; edges: string[] } | null> {
    const session = this.driver.session({ database: this.database });
    try {
      const edgeFilter = edgeTypes
        ? `:${edgeTypes.map((t) => this.getEdgeLabel(t)).join('|')}`
        : '';

      const result = await session.executeRead(async (tx) => {
        const query = `
          MATCH path = shortestPath((start {id: $fromId})-[${edgeFilter}*]-(end {id: $toId}))
          RETURN [n IN nodes(path) | n.id] as nodeIds,
                 [r IN relationships(path) | r.id] as edgeIds
        `;
        return tx.run(query, { fromId, toId });
      });

      if (result.records.length === 0) return null;
      return {
        nodes: result.records[0].get('nodeIds'),
        edges: result.records[0].get('edgeIds'),
      };
    } finally {
      await session.close();
    }
  }

  async findDependencyChain(nodeId: string, depth: number = 10): Promise<string[]> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeRead(async (tx) => {
        const query = `
          MATCH (start {id: $nodeId})-[:DEPENDS_ON*1..${depth}]->(dep)
          RETURN DISTINCT dep.id as depId
        `;
        return tx.run(query, { nodeId });
      });

      return result.records.map((r) => r.get('depId'));
    } finally {
      await session.close();
    }
  }

  async findBlockedNodes(nodeId: string): Promise<string[]> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeRead(async (tx) => {
        const query = `
          MATCH (blocker {id: $nodeId})<-[:DEPENDS_ON]-(blocked)
          RETURN blocked.id as blockedId
        `;
        return tx.run(query, { nodeId });
      });

      return result.records.map((r) => r.get('blockedId'));
    } finally {
      await session.close();
    }
  }

  async computeCriticalPath(goalNodeId: string): Promise<string[]> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeRead(async (tx) => {
        const query = `
          MATCH path = (leaf)-[:DEPENDS_ON|IMPLEMENTS*]->(goal {id: $goalNodeId})
          WHERE NOT (leaf)<-[:DEPENDS_ON]-()
          WITH path, length(path) as pathLength
          ORDER BY pathLength DESC
          LIMIT 1
          RETURN [n IN nodes(path) | n.id] as criticalPath
        `;
        return tx.run(query, { goalNodeId });
      });

      if (result.records.length === 0) return [];
      return result.records[0].get('criticalPath');
    } finally {
      await session.close();
    }
  }

  // ============================================
  // Statistics
  // ============================================

  async getStats(): Promise<GraphStats> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.executeRead(async (tx) => {
        const query = `
          MATCH (n)
          WITH count(n) as nodeCount, collect(labels(n)[0]) as nodeLabels
          MATCH ()-[r]->()
          WITH nodeCount, nodeLabels, count(r) as edgeCount, collect(type(r)) as edgeTypes
          MATCH (orphan)
          WHERE NOT (orphan)--()
          WITH nodeCount, nodeLabels, edgeCount, edgeTypes, count(orphan) as orphanCount
          RETURN nodeCount, nodeLabels, edgeCount, edgeTypes, orphanCount
        `;
        return tx.run(query);
      });

      const record = result.records[0];
      const nodeLabels = record.get('nodeLabels') as string[];
      const edgeTypes = record.get('edgeTypes') as string[];

      const nodesByType: Record<string, number> = {};
      nodeLabels.forEach((label) => {
        nodesByType[label] = (nodesByType[label] || 0) + 1;
      });

      const edgesByType: Record<string, number> = {};
      edgeTypes.forEach((type) => {
        edgesByType[type] = (edgesByType[type] || 0) + 1;
      });

      const nodeCount = record.get('nodeCount').toNumber();
      const edgeCount = record.get('edgeCount').toNumber();

      return {
        nodeCount,
        edgeCount,
        nodesByType,
        edgesByType,
        orphanNodes: record.get('orphanCount').toNumber(),
        avgDegree: nodeCount > 0 ? (2 * edgeCount) / nodeCount : 0,
      };
    } finally {
      await session.close();
    }
  }

  // ============================================
  // Change Listeners
  // ============================================

  onChange(listener: ChangeListener): () => void {
    this.changeListeners.push(listener);
    return () => {
      const idx = this.changeListeners.indexOf(listener);
      if (idx >= 0) this.changeListeners.splice(idx, 1);
    };
  }

  private emitChange(event: ChangeEvent): void {
    this.changeListeners.forEach((listener) => listener(event));
  }

  // ============================================
  // Private Helpers
  // ============================================

  private async ensureIndexes(): Promise<void> {
    const session = this.driver.session({ database: this.database });
    try {
      const indexes = [
        'CREATE INDEX node_id IF NOT EXISTS FOR (n:Node) ON (n.id)',
        'CREATE INDEX intent_id IF NOT EXISTS FOR (n:Intent) ON (n.id)',
        'CREATE INDEX commitment_id IF NOT EXISTS FOR (n:Commitment) ON (n.id)',
        'CREATE INDEX epic_id IF NOT EXISTS FOR (n:Epic) ON (n.id)',
        'CREATE INDEX ticket_id IF NOT EXISTS FOR (n:Ticket) ON (n.id)',
        'CREATE INDEX ticket_status IF NOT EXISTS FOR (n:Ticket) ON (n.status)',
        'CREATE INDEX agent_id IF NOT EXISTS FOR (n:Agent) ON (n.id)',
        'CREATE INDEX pr_id IF NOT EXISTS FOR (n:PR) ON (n.id)',
      ];

      for (const idx of indexes) {
        await session.run(idx);
      }
    } finally {
      await session.close();
    }
  }

  private getNodeLabel(type: string): string {
    return type.charAt(0).toUpperCase() + type.slice(1);
  }

  private getEdgeLabel(type: string): string {
    return type.toUpperCase().replace(/_/g, '_');
  }

  private serializeNode(node: WorkGraphNode): Record<string, unknown> {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (value instanceof Date) {
        continue; // Handled separately
      } else if (value instanceof Map) {
        serialized[key] = Object.fromEntries(value);
      } else if (typeof value === 'object' && value !== null) {
        serialized[key] = JSON.stringify(value);
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  }

  private serializeEdge(edge: WorkGraphEdge): Record<string, unknown> {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(edge)) {
      if (key === 'sourceId' || key === 'targetId') continue;
      if (value instanceof Date) {
        continue;
      } else if (typeof value === 'object' && value !== null) {
        serialized[key] = JSON.stringify(value);
      } else {
        serialized[key] = value;
      }
    }
    return serialized;
  }

  private deserializeNode(props: Record<string, unknown>): WorkGraphNode {
    const node: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (key === 'createdAt' || key === 'updatedAt') {
        node[key] = new Date(value as string);
      } else if (typeof value === 'string' && value.startsWith('{')) {
        try {
          node[key] = JSON.parse(value);
        } catch {
          node[key] = value;
        }
      } else {
        node[key] = value;
      }
    }
    return node as unknown as WorkGraphNode;
  }

  private deserializeEdge(props: Record<string, unknown>): Partial<WorkGraphEdge> {
    const edge: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (key === 'createdAt') {
        edge[key] = new Date(value as string);
      } else if (typeof value === 'string' && value.startsWith('{')) {
        try {
          edge[key] = JSON.parse(value);
        } catch {
          edge[key] = value;
        }
      } else {
        edge[key] = value;
      }
    }
    return edge as Partial<WorkGraphEdge>;
  }
}

// ============================================
// In-Memory Graph Store (for testing/demo)
// ============================================

export class InMemoryGraphStore implements GraphStore {
  private nodes: Map<string, WorkGraphNode> = new Map();
  private edges: Map<string, WorkGraphEdge> = new Map();

  async createNode<T>(node: T): Promise<T> {
    this.nodes.set((node as { id: string }).id, node as unknown as WorkGraphNode);
    return node;
  }

  async getNode<T>(id: string): Promise<T | null> {
    return (this.nodes.get(id) as T) ?? null;
  }

  async getNodes<T>(filter?: Partial<T>): Promise<T[]> {
    let results = Array.from(this.nodes.values());
    if (filter) {
      results = results.filter((node) => {
        for (const [key, value] of Object.entries(filter)) {
          if ((node as Record<string, unknown>)[key] !== value) return false;
        }
        return true;
      });
    }
    return results as T[];
  }

  async updateNode<T>(id: string, updates: Partial<T>): Promise<T | null> {
    const node = this.nodes.get(id);
    if (!node) return null;
    const updated = { ...node, ...updates, updatedAt: new Date() };
    this.nodes.set(id, updated as WorkGraphNode);
    return updated as T;
  }

  async deleteNode(id: string): Promise<boolean> {
    return this.nodes.delete(id);
  }

  async createEdge(edge: WorkGraphEdge): Promise<WorkGraphEdge> {
    this.edges.set(edge.id, edge);
    return edge;
  }

  async getEdges(filter?: { sourceId?: string; targetId?: string; type?: string }): Promise<WorkGraphEdge[]> {
    let results = Array.from(this.edges.values());
    if (filter) {
      if (filter.sourceId) results = results.filter((e) => e.sourceId === filter.sourceId);
      if (filter.targetId) results = results.filter((e) => e.targetId === filter.targetId);
      if (filter.type) results = results.filter((e) => e.type === filter.type);
    }
    return results;
  }

  async deleteEdge(id: string): Promise<boolean> {
    return this.edges.delete(id);
  }
}
