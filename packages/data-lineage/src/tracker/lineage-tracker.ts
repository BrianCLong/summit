/**
 * Lineage Tracker - Track data lineage end-to-end with column-level tracking
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import {
  LineageNode,
  LineageEdge,
  ColumnMapping,
  ColumnMetadata,
  LineageEvent,
  LineageScanConfig,
  DiscoveryResult,
  DiscoveryMethod,
  DiscoveryError,
  NodeType,
  EdgeType,
  ColumnTransformation,
} from '../types.js';

export class LineageTracker {
  private nodes: Map<string, LineageNode> = new Map();
  private edges: Map<string, LineageEdge> = new Map();
  private events: LineageEvent[] = [];

  constructor(private pool?: Pool) {}

  /**
   * Register a new node in the lineage graph
   */
  async registerNode(node: Omit<LineageNode, 'id' | 'createdAt' | 'updatedAt'>): Promise<LineageNode> {
    const newNode: LineageNode = {
      id: uuidv4(),
      ...node,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.nodes.set(newNode.id, newNode);

    // Record event
    this.recordEvent({
      id: uuidv4(),
      eventType: 'node-created',
      timestamp: new Date(),
      sourceNode: newNode,
      metadata: {},
    });

    // Persist to database if pool is available
    if (this.pool) {
      await this.persistNode(newNode);
    }

    return newNode;
  }

  /**
   * Update an existing node
   */
  async updateNode(nodeId: string, updates: Partial<LineageNode>): Promise<LineageNode> {
    const existingNode = this.nodes.get(nodeId);
    if (!existingNode) {
      throw new Error(`Node with ID ${nodeId} not found`);
    }

    const updatedNode: LineageNode = {
      ...existingNode,
      ...updates,
      id: nodeId,
      updatedAt: new Date(),
    };

    this.nodes.set(nodeId, updatedNode);

    this.recordEvent({
      id: uuidv4(),
      eventType: 'node-updated',
      timestamp: new Date(),
      sourceNode: updatedNode,
      metadata: { updates },
    });

    if (this.pool) {
      await this.persistNode(updatedNode);
    }

    return updatedNode;
  }

  /**
   * Register a lineage edge/relationship
   */
  async registerEdge(
    edge: Omit<LineageEdge, 'id' | 'createdAt'>
  ): Promise<LineageEdge> {
    // Validate that source and target nodes exist
    if (!this.nodes.has(edge.sourceNodeId)) {
      throw new Error(`Source node ${edge.sourceNodeId} not found`);
    }
    if (!this.nodes.has(edge.targetNodeId)) {
      throw new Error(`Target node ${edge.targetNodeId} not found`);
    }

    const newEdge: LineageEdge = {
      id: uuidv4(),
      ...edge,
      createdAt: new Date(),
    };

    this.edges.set(newEdge.id, newEdge);

    this.recordEvent({
      id: uuidv4(),
      eventType: 'edge-created',
      timestamp: new Date(),
      edge: newEdge,
      metadata: {},
    });

    if (this.pool) {
      await this.persistEdge(newEdge);
    }

    return newEdge;
  }

  /**
   * Track column-level lineage
   */
  async trackColumnLineage(
    sourceNodeId: string,
    targetNodeId: string,
    columnMappings: ColumnMapping[],
    transformation?: ColumnTransformation
  ): Promise<LineageEdge> {
    const sourceNode = this.nodes.get(sourceNodeId);
    const targetNode = this.nodes.get(targetNodeId);

    if (!sourceNode || !targetNode) {
      throw new Error('Source or target node not found');
    }

    // Validate that columns exist in the nodes
    for (const mapping of columnMappings) {
      const sourceColumnsExist = mapping.sourceColumns.every(col =>
        sourceNode.columns.some(c => c.name === col)
      );
      const targetColumnExists = targetNode.columns.some(c => c.name === mapping.targetColumn);

      if (!sourceColumnsExist || !targetColumnExists) {
        throw new Error(`Invalid column mapping: columns not found in nodes`);
      }
    }

    return this.registerEdge({
      sourceNodeId,
      targetNodeId,
      type: 'transformation',
      transformationType: transformation?.type,
      transformationLogic: transformation?.expression,
      confidence: 1.0,
      discoveryMethod: 'manual',
      columnMappings,
      metadata: { columnLevel: true },
    });
  }

  /**
   * Discover lineage automatically from SQL queries
   */
  async discoverFromSQL(
    sql: string,
    targetNodeId: string,
    options: { platform?: string; schema?: string } = {}
  ): Promise<LineageEdge[]> {
    const discoveredEdges: LineageEdge[] = [];

    // Parse SQL to extract table references
    const tableReferences = this.parseTableReferences(sql);
    const columnMappings = this.parseColumnMappings(sql);

    for (const tableRef of tableReferences) {
      // Find or create source node
      let sourceNode = Array.from(this.nodes.values()).find(
        n => n.name === tableRef.table && (!tableRef.schema || n.schema === tableRef.schema)
      );

      if (!sourceNode) {
        // Auto-create source node
        sourceNode = await this.registerNode({
          name: tableRef.table,
          type: 'table',
          schema: tableRef.schema || options.schema,
          database: tableRef.database,
          platform: options.platform || 'postgres',
          owner: undefined,
          tags: ['auto-discovered'],
          metadata: { autoDiscovered: true },
          columns: [],
        });
      }

      // Create edge
      const edge = await this.registerEdge({
        sourceNodeId: sourceNode.id,
        targetNodeId,
        type: 'transformation',
        transformationType: 'select',
        transformationLogic: sql,
        confidence: 0.85,
        discoveryMethod: 'sql-parsing',
        columnMappings,
        metadata: { sql },
      });

      discoveredEdges.push(edge);
    }

    return discoveredEdges;
  }

  /**
   * Scan data sources for lineage
   */
  async scanLineage(config: LineageScanConfig): Promise<DiscoveryResult> {
    const startTime = Date.now();
    const discoveredNodes: LineageNode[] = [];
    const discoveredEdges: LineageEdge[] = [];
    const errors: DiscoveryError[] = [];
    const warnings: string[] = [];

    for (const sourceId of config.sources) {
      try {
        const sourceNode = this.nodes.get(sourceId);
        if (!sourceNode) {
          errors.push({
            source: sourceId,
            error: 'Source node not found',
            severity: 'error',
          });
          continue;
        }

        // Scan based on discovery methods
        if (config.discoveryMethods?.includes('metadata-scanning') && this.pool) {
          const { nodes, edges } = await this.scanMetadata(sourceNode, config);
          discoveredNodes.push(...nodes);
          discoveredEdges.push(...edges);
        }

        if (config.discoveryMethods?.includes('sql-parsing') && this.pool) {
          const { nodes, edges } = await this.scanSQLDependencies(sourceNode, config);
          discoveredNodes.push(...nodes);
          discoveredEdges.push(...edges);
        }
      } catch (error) {
        errors.push({
          source: sourceId,
          error: error instanceof Error ? error.message : String(error),
          severity: 'critical',
        });
      }
    }

    const duration = Date.now() - startTime;

    const result: DiscoveryResult = {
      id: uuidv4(),
      scanConfig: config,
      discoveredNodes,
      discoveredEdges,
      errors,
      warnings,
      statistics: {
        scannedSources: config.sources.length,
        newNodes: discoveredNodes.length,
        updatedNodes: 0,
        newEdges: discoveredEdges.length,
        duration,
      },
      scanDate: new Date(),
    };

    this.recordEvent({
      id: uuidv4(),
      eventType: 'lineage-scanned',
      timestamp: new Date(),
      metadata: { result },
    });

    return result;
  }

  /**
   * Get all upstream nodes (dependencies) for a given node
   */
  getUpstreamNodes(nodeId: string, maxDepth: number = 10): LineageNode[] {
    const visited = new Set<string>();
    const result: LineageNode[] = [];

    const traverse = (currentId: string, depth: number) => {
      if (depth > maxDepth || visited.has(currentId)) {
        return;
      }

      visited.add(currentId);

      // Find edges where current node is the target
      const incomingEdges = Array.from(this.edges.values()).filter(
        e => e.targetNodeId === currentId
      );

      for (const edge of incomingEdges) {
        const sourceNode = this.nodes.get(edge.sourceNodeId);
        if (sourceNode && !visited.has(sourceNode.id)) {
          result.push(sourceNode);
          traverse(sourceNode.id, depth + 1);
        }
      }
    };

    traverse(nodeId, 0);
    return result;
  }

  /**
   * Get all downstream nodes (dependents) for a given node
   */
  getDownstreamNodes(nodeId: string, maxDepth: number = 10): LineageNode[] {
    const visited = new Set<string>();
    const result: LineageNode[] = [];

    const traverse = (currentId: string, depth: number) => {
      if (depth > maxDepth || visited.has(currentId)) {
        return;
      }

      visited.add(currentId);

      // Find edges where current node is the source
      const outgoingEdges = Array.from(this.edges.values()).filter(
        e => e.sourceNodeId === currentId
      );

      for (const edge of outgoingEdges) {
        const targetNode = this.nodes.get(edge.targetNodeId);
        if (targetNode && !visited.has(targetNode.id)) {
          result.push(targetNode);
          traverse(targetNode.id, depth + 1);
        }
      }
    };

    traverse(nodeId, 0);
    return result;
  }

  /**
   * Trace column lineage from source to target
   */
  traceColumnLineage(
    nodeId: string,
    columnName: string,
    direction: 'upstream' | 'downstream' = 'upstream'
  ): Array<{ node: LineageNode; column: string; transformation?: ColumnTransformation }> {
    const result: Array<{ node: LineageNode; column: string; transformation?: ColumnTransformation }> = [];
    const visited = new Set<string>();

    const trace = (currentNodeId: string, currentColumn: string) => {
      const key = `${currentNodeId}:${currentColumn}`;
      if (visited.has(key)) {
        return;
      }
      visited.add(key);

      const edges = Array.from(this.edges.values()).filter(e =>
        direction === 'upstream'
          ? e.targetNodeId === currentNodeId
          : e.sourceNodeId === currentNodeId
      );

      for (const edge of edges) {
        const nodeId = direction === 'upstream' ? edge.sourceNodeId : edge.targetNodeId;
        const node = this.nodes.get(nodeId);

        if (!node) continue;

        // Find column mappings
        for (const mapping of edge.columnMappings) {
          if (direction === 'upstream' && mapping.targetColumn === currentColumn) {
            for (const sourceCol of mapping.sourceColumns) {
              result.push({
                node,
                column: sourceCol,
                transformation: mapping.transformation,
              });
              trace(nodeId, sourceCol);
            }
          } else if (direction === 'downstream' && mapping.sourceColumns.includes(currentColumn)) {
            result.push({
              node,
              column: mapping.targetColumn,
              transformation: mapping.transformation,
            });
            trace(nodeId, mapping.targetColumn);
          }
        }
      }
    };

    trace(nodeId, columnName);
    return result;
  }

  /**
   * Get all nodes
   */
  getNodes(): LineageNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get all edges
   */
  getEdges(): LineageEdge[] {
    return Array.from(this.edges.values());
  }

  /**
   * Get a specific node by ID
   */
  getNode(nodeId: string): LineageNode | undefined {
    return this.nodes.get(nodeId);
  }

  /**
   * Get lineage events
   */
  getEvents(filters?: { eventType?: string; startDate?: Date; endDate?: Date }): LineageEvent[] {
    let events = this.events;

    if (filters?.eventType) {
      events = events.filter(e => e.eventType === filters.eventType);
    }

    if (filters?.startDate) {
      events = events.filter(e => e.timestamp >= filters.startDate!);
    }

    if (filters?.endDate) {
      events = events.filter(e => e.timestamp <= filters.endDate!);
    }

    return events;
  }

  // Private helper methods

  private recordEvent(event: LineageEvent): void {
    this.events.push(event);
    // Keep only last 10000 events in memory
    if (this.events.length > 10000) {
      this.events = this.events.slice(-10000);
    }
  }

  private parseTableReferences(sql: string): Array<{ table: string; schema?: string; database?: string }> {
    const references: Array<{ table: string; schema?: string; database?: string }> = [];

    // Simple regex-based parsing (production would use a proper SQL parser)
    const fromRegex = /FROM\s+(?:(\w+)\.)?(?:(\w+)\.)?(\w+)/gi;
    const joinRegex = /JOIN\s+(?:(\w+)\.)?(?:(\w+)\.)?(\w+)/gi;

    let match;

    while ((match = fromRegex.exec(sql)) !== null) {
      references.push({
        database: match[1],
        schema: match[2] || match[1],
        table: match[3] || match[2] || match[1],
      });
    }

    while ((match = joinRegex.exec(sql)) !== null) {
      references.push({
        database: match[1],
        schema: match[2] || match[1],
        table: match[3] || match[2] || match[1],
      });
    }

    return references;
  }

  private parseColumnMappings(sql: string): ColumnMapping[] {
    // Simplified column mapping extraction
    // Production implementation would use a proper SQL parser
    return [];
  }

  private async scanMetadata(
    node: LineageNode,
    config: LineageScanConfig
  ): Promise<{ nodes: LineageNode[]; edges: LineageEdge[] }> {
    // Implementation would query database metadata
    // For now, return empty results
    return { nodes: [], edges: [] };
  }

  private async scanSQLDependencies(
    node: LineageNode,
    config: LineageScanConfig
  ): Promise<{ nodes: LineageNode[]; edges: LineageEdge[] }> {
    // Implementation would parse stored procedures, views, etc.
    // For now, return empty results
    return { nodes: [], edges: [] };
  }

  private async persistNode(node: LineageNode): Promise<void> {
    if (!this.pool) return;

    const query = `
      INSERT INTO lineage_nodes (id, name, type, platform, schema, database, owner, description, tags, metadata, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        type = EXCLUDED.type,
        platform = EXCLUDED.platform,
        schema = EXCLUDED.schema,
        database = EXCLUDED.database,
        owner = EXCLUDED.owner,
        description = EXCLUDED.description,
        tags = EXCLUDED.tags,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
    `;

    await this.pool.query(query, [
      node.id,
      node.name,
      node.type,
      node.platform,
      node.schema,
      node.database,
      node.owner,
      node.description,
      node.tags,
      JSON.stringify(node.metadata),
      node.createdAt,
      node.updatedAt,
    ]);
  }

  private async persistEdge(edge: LineageEdge): Promise<void> {
    if (!this.pool) return;

    const query = `
      INSERT INTO lineage_edges (id, source_node_id, target_node_id, type, transformation_type, transformation_logic, confidence, discovery_method, column_mappings, metadata, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (id) DO UPDATE SET
        source_node_id = EXCLUDED.source_node_id,
        target_node_id = EXCLUDED.target_node_id,
        type = EXCLUDED.type,
        transformation_type = EXCLUDED.transformation_type,
        transformation_logic = EXCLUDED.transformation_logic,
        confidence = EXCLUDED.confidence,
        discovery_method = EXCLUDED.discovery_method,
        column_mappings = EXCLUDED.column_mappings,
        metadata = EXCLUDED.metadata
    `;

    await this.pool.query(query, [
      edge.id,
      edge.sourceNodeId,
      edge.targetNodeId,
      edge.type,
      edge.transformationType,
      edge.transformationLogic,
      edge.confidence,
      edge.discoveryMethod,
      JSON.stringify(edge.columnMappings),
      JSON.stringify(edge.metadata),
      edge.createdAt,
    ]);
  }
}
