/**
 * P36: Data Lineage Tracker
 * Tracks data flow and transformations across the platform
 */

import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';

/**
 * Data source types
 */
export type DataSourceType =
  | 'database'
  | 'api'
  | 'file'
  | 'stream'
  | 'cache'
  | 'external'
  | 'user_input';

/**
 * Transformation types
 */
export type TransformationType =
  | 'extract'
  | 'transform'
  | 'load'
  | 'aggregate'
  | 'filter'
  | 'join'
  | 'enrich'
  | 'anonymize'
  | 'validate';

/**
 * Data node schema
 */
export const DataNodeSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  type: z.enum(['source', 'transformation', 'sink']),
  sourceType: z.enum(['database', 'api', 'file', 'stream', 'cache', 'external', 'user_input']).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type DataNode = z.infer<typeof DataNodeSchema>;

/**
 * Data edge schema
 */
export const DataEdgeSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  targetId: z.string().uuid(),
  transformationType: z.enum([
    'extract', 'transform', 'load', 'aggregate',
    'filter', 'join', 'enrich', 'anonymize', 'validate'
  ]).optional(),
  metadata: z.record(z.unknown()).optional(),
  createdAt: z.date(),
});

export type DataEdge = z.infer<typeof DataEdgeSchema>;

/**
 * Lineage record schema
 */
export const LineageRecordSchema = z.object({
  id: z.string().uuid(),
  entityId: z.string(),
  entityType: z.string(),
  operation: z.string(),
  timestamp: z.date(),
  source: DataNodeSchema.optional(),
  transformations: z.array(z.object({
    type: z.string(),
    description: z.string().optional(),
    inputFields: z.array(z.string()).optional(),
    outputFields: z.array(z.string()).optional(),
  })).optional(),
  upstream: z.array(z.string()).optional(),
  downstream: z.array(z.string()).optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type LineageRecord = z.infer<typeof LineageRecordSchema>;

/**
 * Lineage graph
 */
export class LineageGraph {
  private nodes: Map<string, DataNode> = new Map();
  private edges: Map<string, DataEdge> = new Map();
  private nodesByName: Map<string, string> = new Map();

  /**
   * Add a data node
   */
  addNode(
    name: string,
    type: 'source' | 'transformation' | 'sink',
    options: {
      sourceType?: DataSourceType;
      metadata?: Record<string, unknown>;
    } = {}
  ): DataNode {
    const existingId = this.nodesByName.get(name);
    if (existingId) {
      return this.nodes.get(existingId)!;
    }

    const node: DataNode = {
      id: uuidv4(),
      name,
      type,
      sourceType: options.sourceType,
      metadata: options.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.nodes.set(node.id, node);
    this.nodesByName.set(name, node.id);
    return node;
  }

  /**
   * Add an edge between nodes
   */
  addEdge(
    sourceName: string,
    targetName: string,
    options: {
      transformationType?: TransformationType;
      metadata?: Record<string, unknown>;
    } = {}
  ): DataEdge {
    const sourceId = this.nodesByName.get(sourceName);
    const targetId = this.nodesByName.get(targetName);

    if (!sourceId || !targetId) {
      throw new Error(`Node not found: ${!sourceId ? sourceName : targetName}`);
    }

    const edge: DataEdge = {
      id: uuidv4(),
      sourceId,
      targetId,
      transformationType: options.transformationType,
      metadata: options.metadata,
      createdAt: new Date(),
    };

    this.edges.set(edge.id, edge);
    return edge;
  }

  /**
   * Get upstream nodes (data sources)
   */
  getUpstream(nodeName: string): DataNode[] {
    const nodeId = this.nodesByName.get(nodeName);
    if (!nodeId) return [];

    const upstreamIds = new Set<string>();
    const queue = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      for (const edge of this.edges.values()) {
        if (edge.targetId === currentId && !visited.has(edge.sourceId)) {
          upstreamIds.add(edge.sourceId);
          queue.push(edge.sourceId);
        }
      }
    }

    return Array.from(upstreamIds).map(id => this.nodes.get(id)!);
  }

  /**
   * Get downstream nodes (data consumers)
   */
  getDownstream(nodeName: string): DataNode[] {
    const nodeId = this.nodesByName.get(nodeName);
    if (!nodeId) return [];

    const downstreamIds = new Set<string>();
    const queue = [nodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      if (visited.has(currentId)) continue;
      visited.add(currentId);

      for (const edge of this.edges.values()) {
        if (edge.sourceId === currentId && !visited.has(edge.targetId)) {
          downstreamIds.add(edge.targetId);
          queue.push(edge.targetId);
        }
      }
    }

    return Array.from(downstreamIds).map(id => this.nodes.get(id)!);
  }

  /**
   * Get full lineage path
   */
  getLineagePath(fromName: string, toName: string): DataNode[] {
    const fromId = this.nodesByName.get(fromName);
    const toId = this.nodesByName.get(toName);
    if (!fromId || !toId) return [];

    const path: string[] = [];
    const visited = new Set<string>();
    const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];

    while (queue.length > 0) {
      const { id: currentId, path: currentPath } = queue.shift()!;

      if (currentId === toId) {
        return currentPath.map(id => this.nodes.get(id)!);
      }

      if (visited.has(currentId)) continue;
      visited.add(currentId);

      for (const edge of this.edges.values()) {
        if (edge.sourceId === currentId && !visited.has(edge.targetId)) {
          queue.push({
            id: edge.targetId,
            path: [...currentPath, edge.targetId],
          });
        }
      }
    }

    return [];
  }

  /**
   * Export graph to JSON
   */
  toJSON(): { nodes: DataNode[]; edges: DataEdge[] } {
    return {
      nodes: Array.from(this.nodes.values()),
      edges: Array.from(this.edges.values()),
    };
  }

  /**
   * Import graph from JSON
   */
  static fromJSON(data: { nodes: DataNode[]; edges: DataEdge[] }): LineageGraph {
    const graph = new LineageGraph();

    for (const node of data.nodes) {
      graph.nodes.set(node.id, node);
      graph.nodesByName.set(node.name, node.id);
    }

    for (const edge of data.edges) {
      graph.edges.set(edge.id, edge);
    }

    return graph;
  }
}

/**
 * Lineage tracker for recording data operations
 */
export class LineageTracker {
  private records: LineageRecord[] = [];
  private graph: LineageGraph = new LineageGraph();

  /**
   * Record a data operation
   */
  record(params: {
    entityId: string;
    entityType: string;
    operation: string;
    source?: {
      name: string;
      type: DataSourceType;
    };
    transformations?: Array<{
      type: TransformationType;
      description?: string;
      inputFields?: string[];
      outputFields?: string[];
    }>;
    upstream?: string[];
    downstream?: string[];
    metadata?: Record<string, unknown>;
  }): LineageRecord {
    const record: LineageRecord = {
      id: uuidv4(),
      entityId: params.entityId,
      entityType: params.entityType,
      operation: params.operation,
      timestamp: new Date(),
      source: params.source ? {
        id: uuidv4(),
        name: params.source.name,
        type: 'source',
        sourceType: params.source.type,
        createdAt: new Date(),
        updatedAt: new Date(),
      } : undefined,
      transformations: params.transformations,
      upstream: params.upstream,
      downstream: params.downstream,
      metadata: params.metadata,
    };

    this.records.push(record);

    // Update graph
    if (params.source) {
      this.graph.addNode(params.source.name, 'source', {
        sourceType: params.source.type,
      });
    }

    return record;
  }

  /**
   * Get lineage for an entity
   */
  getEntityLineage(entityId: string): LineageRecord[] {
    return this.records.filter(r => r.entityId === entityId);
  }

  /**
   * Get all records
   */
  getRecords(): LineageRecord[] {
    return [...this.records];
  }

  /**
   * Get the lineage graph
   */
  getGraph(): LineageGraph {
    return this.graph;
  }

  /**
   * Clear all records
   */
  clear(): void {
    this.records = [];
    this.graph = new LineageGraph();
  }
}

// Singleton tracker
let defaultTracker: LineageTracker | null = null;

/**
 * Get default lineage tracker
 */
export function getLineageTracker(): LineageTracker {
  if (!defaultTracker) {
    defaultTracker = new LineageTracker();
  }
  return defaultTracker;
}
