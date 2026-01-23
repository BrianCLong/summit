/**
 * Summit Work Graph - Neo4j Graph Store
 */

import neo4j, { Driver, Session, Integer } from 'neo4j-driver';
import type { WorkGraphNode } from '../schema/nodes.js';
import type { WorkGraphEdge, EdgeType } from '../schema/edges.js';

export interface Neo4jConfig {
  uri: string;
  username: string;
  password: string;
  database?: string;
}

export interface QueryOptions {
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDirection?: 'ASC' | 'DESC';
}

export interface PathResult {
  nodes: WorkGraphNode[];
  edges: WorkGraphEdge[];
  totalWeight: number;
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  nodesByType: Record<string, number>;
  edgesByType: Record<string, number>;
}

export type ChangeListener = (change: GraphChange) => void | Promise<void>;

export interface GraphChange {
  type: 'node_created' | 'node_updated' | 'node_deleted' | 'edge_created' | 'edge_deleted';
  nodeType?: string;
  edgeType?: string;
  id: string;
  data?: unknown;
  previousData?: unknown;
}

export class Neo4jGraphStore {
  private driver: Driver;
  private database: string;
  private changeListeners: Map<string, ChangeListener> = new Map();

  constructor(config: Neo4jConfig) {
    this.driver = neo4j.driver(config.uri, neo4j.auth.basic(config.username, config.password));
    this.database = config.database || 'neo4j';
  }

  async connect(): Promise<void> {
    await this.driver.verifyConnectivity();
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  private getSession(): Session {
    return this.driver.session({ database: this.database });
  }

  async createNode<T extends WorkGraphNode>(node: T): Promise<T> {
    const session = this.getSession();
    try {
      const result = await session.run(
        \`CREATE (n:Node:\${node.type.charAt(0).toUpperCase() + node.type.slice(1)} \$props) RETURN n\`,
        { props: this.serializeNode(node) }
      );
      const created = this.deserializeNode<T>(result.records[0].get('n').properties);
      await this.notifyChange({ type: 'node_created', nodeType: node.type, id: created.id, data: created });
      return created;
    } finally {
      await session.close();
    }
  }

  async getNode<T extends WorkGraphNode>(id: string): Promise<T | null> {
    const session = this.getSession();
    try {
      const result = await session.run('MATCH (n:Node {id: \$id}) RETURN n', { id });
      if (result.records.length === 0) return null;
      return this.deserializeNode<T>(result.records[0].get('n').properties);
    } finally {
      await session.close();
    }
  }

  async getNodes<T extends WorkGraphNode>(filter?: Partial<T>, options?: QueryOptions): Promise<T[]> {
    const session = this.getSession();
    try {
      let query = 'MATCH (n:Node)';
      const params: Record<string, unknown> = {};

      if (filter && Object.keys(filter).length > 0) {
        const conditions = Object.entries(filter).map(([key, value], i) => {
          params[\`p\${i}\`] = value;
          return \`n.\${key} = \$p\${i}\`;
        }).join(' AND ');
        query += \` WHERE \${conditions}\`;
      }

      query += ' RETURN n';
      if (options?.orderBy) query += \` ORDER BY n.\${options.orderBy} \${options.orderDirection || 'ASC'}\`;
      if (options?.limit) query += \` LIMIT \${options.limit}\`;
      if (options?.offset) query += \` SKIP \${options.offset}\`;

      const result = await session.run(query, params);
      return result.records.map((r) => this.deserializeNode<T>(r.get('n').properties));
    } finally {
      await session.close();
    }
  }

  async updateNode<T extends WorkGraphNode>(id: string, updates: Partial<T>): Promise<T | null> {
    const session = this.getSession();
    try {
      const existing = await this.getNode<T>(id);
      if (!existing) return null;
      const result = await session.run(
        'MATCH (n:Node {id: \$id}) SET n += \$updates RETURN n',
        { id, updates: { ...updates, updatedAt: new Date().toISOString() } }
      );
      const updated = this.deserializeNode<T>(result.records[0].get('n').properties);
      await this.notifyChange({ type: 'node_updated', nodeType: updated.type, id, data: updated, previousData: existing });
      return updated;
    } finally {
      await session.close();
    }
  }

  async deleteNode(id: string): Promise<boolean> {
    const session = this.getSession();
    try {
      const existing = await this.getNode(id);
      if (!existing) return false;
      await session.run('MATCH (n:Node {id: \$id}) DETACH DELETE n', { id });
      await this.notifyChange({ type: 'node_deleted', nodeType: existing.type, id, previousData: existing });
      return true;
    } finally {
      await session.close();
    }
  }

  async createEdge(edge: WorkGraphEdge): Promise<WorkGraphEdge> {
    const session = this.getSession();
    try {
      await session.run(
        \`MATCH (s:Node {id: \$sourceId}) MATCH (t:Node {id: \$targetId})
         CREATE (s)-[r:\${edge.type.toUpperCase()} \$props]->(t) RETURN r\`,
        { sourceId: edge.sourceId, targetId: edge.targetId, props: this.serializeEdge(edge) }
      );
      await this.notifyChange({ type: 'edge_created', edgeType: edge.type, id: edge.id, data: edge });
      return edge;
    } finally {
      await session.close();
    }
  }

  async getEdges(filter?: { sourceId?: string; targetId?: string; type?: EdgeType }): Promise<WorkGraphEdge[]> {
    const session = this.getSession();
    try {
      let query = 'MATCH (s:Node)-[r]->(t:Node)';
      const conditions: string[] = [];
      const params: Record<string, unknown> = {};

      if (filter?.sourceId) { conditions.push('s.id = \$sourceId'); params.sourceId = filter.sourceId; }
      if (filter?.targetId) { conditions.push('t.id = \$targetId'); params.targetId = filter.targetId; }
      if (filter?.type) { conditions.push('type(r) = \$edgeType'); params.edgeType = filter.type.toUpperCase(); }

      if (conditions.length > 0) query += \` WHERE \${conditions.join(' AND ')}\`;
      query += ' RETURN r, s.id as sourceId, t.id as targetId';

      const result = await session.run(query, params);
      return result.records.map((record) => ({
        ...this.deserializeEdge(record.get('r').properties),
        sourceId: record.get('sourceId'),
        targetId: record.get('targetId'),
        type: record.get('r').type.toLowerCase() as EdgeType,
      }));
    } finally {
      await session.close();
    }
  }

  async deleteEdge(id: string): Promise<boolean> {
    const session = this.getSession();
    try {
      const result = await session.run('MATCH ()-[r {id: \$id}]->() DELETE r RETURN count(r) as deleted', { id });
      const deleted = result.records[0].get('deleted').toNumber() > 0;
      if (deleted) await this.notifyChange({ type: 'edge_deleted', id });
      return deleted;
    } finally {
      await session.close();
    }
  }

  async getStats(): Promise<GraphStats> {
    const session = this.getSession();
    try {
      const nodeResult = await session.run('MATCH (n:Node) RETURN n.type as type, count(*) as count');
      const edgeResult = await session.run('MATCH ()-[r]->() RETURN type(r) as type, count(*) as count');

      const nodesByType: Record<string, number> = {};
      let nodeCount = 0;
      for (const record of nodeResult.records) {
        const count = Integer.isInteger(record.get('count')) ? (record.get('count') as Integer).toNumber() : record.get('count') as number;
        nodesByType[record.get('type')] = count;
        nodeCount += count;
      }

      const edgesByType: Record<string, number> = {};
      let edgeCount = 0;
      for (const record of edgeResult.records) {
        const count = Integer.isInteger(record.get('count')) ? (record.get('count') as Integer).toNumber() : record.get('count') as number;
        edgesByType[record.get('type').toLowerCase()] = count;
        edgeCount += count;
      }

      return { nodeCount, edgeCount, nodesByType, edgesByType };
    } finally {
      await session.close();
    }
  }

  addChangeListener(id: string, listener: ChangeListener): void { this.changeListeners.set(id, listener); }
  removeChangeListener(id: string): boolean { return this.changeListeners.delete(id); }

  private async notifyChange(change: GraphChange): Promise<void> {
    for (const listener of this.changeListeners.values()) {
      try { await listener(change); } catch (error) { console.error('Change listener error:', error); }
    }
  }

  private serializeNode(node: WorkGraphNode): Record<string, unknown> {
    const serialized: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(node)) {
      if (value instanceof Date) serialized[key] = value.toISOString();
      else if (Array.isArray(value) || (typeof value === 'object' && value !== null)) serialized[key] = JSON.stringify(value);
      else serialized[key] = value;
    }
    return serialized;
  }

  private deserializeNode<T>(props: Record<string, unknown>): T {
    const node: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(props)) {
      if (key.endsWith('At') || key.endsWith('Date')) node[key] = value ? new Date(value as string) : undefined;
      else if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
        try { node[key] = JSON.parse(value); } catch { node[key] = value; }
      } else if (Integer.isInteger(value)) node[key] = (value as Integer).toNumber();
      else node[key] = value;
    }
    return node as T;
  }

  private serializeEdge(edge: WorkGraphEdge): Record<string, unknown> {
    return {
      id: edge.id,
      weight: edge.weight,
      createdAt: edge.createdAt.toISOString(),
      createdBy: edge.createdBy,
      metadata: edge.metadata ? JSON.stringify(edge.metadata) : undefined,
    };
  }

  private deserializeEdge(props: Record<string, unknown>): Partial<WorkGraphEdge> {
    const weight = Integer.isInteger(props.weight) ? (props.weight as Integer).toNumber() : props.weight as number;
    return {
      id: props.id as string,
      weight: weight || 1,
      createdAt: new Date(props.createdAt as string),
      createdBy: props.createdBy as string,
      metadata: props.metadata ? JSON.parse(props.metadata as string) : undefined,
    };
  }
}

export class InMemoryGraphStore {
  private nodes: Map<string, WorkGraphNode> = new Map();
  private edges: Map<string, WorkGraphEdge> = new Map();
  private changeListeners: Map<string, ChangeListener> = new Map();

  async createNode<T extends WorkGraphNode>(node: T): Promise<T> {
    this.nodes.set(node.id, node);
    await this.notifyChange({ type: 'node_created', nodeType: node.type, id: node.id, data: node });
    return node;
  }

  async getNode<T extends WorkGraphNode>(id: string): Promise<T | null> {
    return (this.nodes.get(id) as T) || null;
  }

  async getNodes<T extends WorkGraphNode>(filter?: Partial<T>): Promise<T[]> {
    let results = Array.from(this.nodes.values()) as T[];
    if (filter) {
      results = results.filter((node) =>
        Object.entries(filter).every(([key, value]) => (node as Record<string, unknown>)[key] === value)
      );
    }
    return results;
  }

  async updateNode<T extends WorkGraphNode>(id: string, updates: Partial<T>): Promise<T | null> {
    const existing = this.nodes.get(id);
    if (!existing) return null;
    const updated = { ...existing, ...updates, updatedAt: new Date() } as T;
    this.nodes.set(id, updated);
    await this.notifyChange({ type: 'node_updated', nodeType: updated.type, id, data: updated, previousData: existing });
    return updated;
  }

  async deleteNode(id: string): Promise<boolean> {
    const existing = this.nodes.get(id);
    if (!existing) return false;
    for (const [edgeId, edge] of this.edges) {
      if (edge.sourceId === id || edge.targetId === id) this.edges.delete(edgeId);
    }
    this.nodes.delete(id);
    await this.notifyChange({ type: 'node_deleted', nodeType: existing.type, id, previousData: existing });
    return true;
  }

  async createEdge(edge: WorkGraphEdge): Promise<WorkGraphEdge> {
    this.edges.set(edge.id, edge);
    await this.notifyChange({ type: 'edge_created', edgeType: edge.type, id: edge.id, data: edge });
    return edge;
  }

  async getEdges(filter?: { sourceId?: string; targetId?: string; type?: EdgeType }): Promise<WorkGraphEdge[]> {
    let results = Array.from(this.edges.values());
    if (filter) {
      if (filter.sourceId) results = results.filter((e) => e.sourceId === filter.sourceId);
      if (filter.targetId) results = results.filter((e) => e.targetId === filter.targetId);
      if (filter.type) results = results.filter((e) => e.type === filter.type);
    }
    return results;
  }

  async deleteEdge(id: string): Promise<boolean> {
    const existed = this.edges.delete(id);
    if (existed) await this.notifyChange({ type: 'edge_deleted', id });
    return existed;
  }

  addChangeListener(id: string, listener: ChangeListener): void { this.changeListeners.set(id, listener); }
  removeChangeListener(id: string): boolean { return this.changeListeners.delete(id); }

  private async notifyChange(change: GraphChange): Promise<void> {
    for (const listener of this.changeListeners.values()) {
      try { await listener(change); } catch (error) { console.error('Change listener error:', error); }
    }
  }

  getStats(): GraphStats {
    const nodesByType: Record<string, number> = {};
    for (const node of this.nodes.values()) nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    const edgesByType: Record<string, number> = {};
    for (const edge of this.edges.values()) edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
    return { nodeCount: this.nodes.size, edgeCount: this.edges.size, nodesByType, edgesByType };
  }
}
