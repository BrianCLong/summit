/**
 * Summit Data Lineage Platform
 *
 * Enterprise data lineage tracking with end-to-end mapping, column-level tracking, and impact analysis
 */

export * from './types.js';
export { LineageTracker } from './tracker/lineage-tracker.js';
export { GraphBuilder } from './visualizer/graph-builder.js';
export { ImpactAnalyzer } from './impact/impact-analyzer.js';

// Main orchestrator class
import { Pool } from 'pg';
import { LineageTracker } from './tracker/lineage-tracker.js';
import { GraphBuilder } from './visualizer/graph-builder.js';
import { ImpactAnalyzer } from './impact/impact-analyzer.js';
import {
  LineageNode,
  LineageEdge,
  LineageGraph,
  ImpactAnalysis,
  DependencyGraph,
  LineagePath,
  LineageMetrics,
  LineageScanConfig,
  DiscoveryResult,
  ColumnMapping,
  ColumnTransformation,
  ChangeType,
  SourceTargetMapping,
  LineageSearchQuery,
} from './types.js';

export interface LineageEngineConfig {
  pool?: Pool;
  enableAutoDiscovery?: boolean;
  defaultScanDepth?: number;
  criticalSystems?: string[];
}

/**
 * Main LineageEngine class that orchestrates all lineage operations
 */
export class LineageEngine {
  private tracker: LineageTracker;
  private graphBuilder: GraphBuilder;
  private impactAnalyzer: ImpactAnalyzer;
  private config: LineageEngineConfig;

  constructor(config: LineageEngineConfig = {}) {
    this.config = {
      enableAutoDiscovery: true,
      defaultScanDepth: 10,
      ...config,
    };

    this.tracker = new LineageTracker(config.pool);
    this.graphBuilder = new GraphBuilder();
    this.impactAnalyzer = new ImpactAnalyzer();
  }

  // ============================================================================
  // Node and Edge Management
  // ============================================================================

  /**
   * Register a new data asset in the lineage system
   */
  async registerNode(
    node: Omit<LineageNode, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<LineageNode> {
    return this.tracker.registerNode(node);
  }

  /**
   * Update an existing node
   */
  async updateNode(nodeId: string, updates: Partial<LineageNode>): Promise<LineageNode> {
    return this.tracker.updateNode(nodeId, updates);
  }

  /**
   * Register a lineage relationship between nodes
   */
  async registerEdge(
    edge: Omit<LineageEdge, 'id' | 'createdAt'>
  ): Promise<LineageEdge> {
    return this.tracker.registerEdge(edge);
  }

  /**
   * Track column-level lineage between nodes
   */
  async trackColumnLineage(
    sourceNodeId: string,
    targetNodeId: string,
    columnMappings: ColumnMapping[],
    transformation?: ColumnTransformation
  ): Promise<LineageEdge> {
    return this.tracker.trackColumnLineage(
      sourceNodeId,
      targetNodeId,
      columnMappings,
      transformation
    );
  }

  // ============================================================================
  // Lineage Discovery
  // ============================================================================

  /**
   * Automatically discover lineage from SQL queries
   */
  async discoverFromSQL(
    sql: string,
    targetNodeId: string,
    options: { platform?: string; schema?: string } = {}
  ): Promise<LineageEdge[]> {
    return this.tracker.discoverFromSQL(sql, targetNodeId, options);
  }

  /**
   * Scan data sources for lineage relationships
   */
  async scanLineage(config: LineageScanConfig): Promise<DiscoveryResult> {
    return this.tracker.scanLineage(config);
  }

  /**
   * Auto-discover lineage for all registered nodes
   */
  async autoDiscoverLineage(options: {
    platforms?: string[];
    maxDepth?: number;
  } = {}): Promise<DiscoveryResult> {
    const nodes = this.tracker.getNodes();
    const sourceIds = nodes.map(n => n.id);

    return this.scanLineage({
      sources: sourceIds,
      maxDepth: options.maxDepth || this.config.defaultScanDepth,
      direction: 'both',
      includeColumnLineage: true,
      discoveryMethods: ['metadata-scanning', 'sql-parsing'],
    });
  }

  // ============================================================================
  // Graph Building and Visualization
  // ============================================================================

  /**
   * Build a complete lineage graph
   */
  buildGraph(options: {
    name?: string;
    description?: string;
    rootNode?: string;
    direction?: 'upstream' | 'downstream' | 'both';
    maxDepth?: number;
  } = {}): LineageGraph {
    const nodes = this.tracker.getNodes();
    const edges = this.tracker.getEdges();

    return this.graphBuilder.buildGraph(nodes, edges, options);
  }

  /**
   * Build a subgraph focused on a specific node
   */
  buildSubgraph(
    focusNodeId: string,
    options: {
      direction?: 'upstream' | 'downstream' | 'both';
      maxDepth?: number;
      includeNodeTypes?: string[];
      excludeNodeTypes?: string[];
    } = {}
  ): LineageGraph {
    const nodes = this.tracker.getNodes();
    const edges = this.tracker.getEdges();

    return this.graphBuilder.buildSubgraph(nodes, edges, focusNodeId, options as any);
  }

  /**
   * Build a dependency graph for a specific node
   */
  buildDependencyGraph(nodeId: string, maxDepth?: number): DependencyGraph {
    const nodes = this.tracker.getNodes();
    const edges = this.tracker.getEdges();

    return this.graphBuilder.buildDependencyGraph(nodes, edges, nodeId, maxDepth);
  }

  /**
   * Find all paths between two nodes
   */
  findPaths(sourceNodeId: string, targetNodeId: string, maxPaths?: number): LineagePath[] {
    const nodes = this.tracker.getNodes();
    const edges = this.tracker.getEdges();

    return this.graphBuilder.findPaths(nodes, edges, sourceNodeId, targetNodeId, maxPaths);
  }

  /**
   * Export lineage graph in various formats
   */
  exportGraph(
    graph: LineageGraph,
    format: 'json' | 'dot' | 'cytoscape' | 'd3'
  ): string | object {
    return this.graphBuilder.exportGraph(graph, format);
  }

  /**
   * Calculate metrics for the lineage graph
   */
  calculateMetrics(graph?: LineageGraph): LineageMetrics {
    const targetGraph = graph || this.buildGraph();
    return this.graphBuilder.calculateMetrics(targetGraph);
  }

  // ============================================================================
  // Impact Analysis
  // ============================================================================

  /**
   * Analyze the impact of a change to a node
   */
  analyzeImpact(
    nodeId: string,
    changeType: ChangeType,
    changeDescription: string,
    options: {
      maxDepth?: number;
      includeIndirect?: boolean;
    } = {}
  ): ImpactAnalysis {
    const node = this.tracker.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const nodes = this.tracker.getNodes();
    const edges = this.tracker.getEdges();

    return this.impactAnalyzer.analyzeImpact(
      node,
      changeType,
      changeDescription,
      nodes,
      edges,
      {
        ...options,
        criticalSystems: this.config.criticalSystems,
      }
    );
  }

  /**
   * Analyze the impact of schema changes
   */
  analyzeSchemaChange(
    nodeId: string,
    schemaChanges: {
      addedColumns?: string[];
      removedColumns?: string[];
      renamedColumns?: Array<{ old: string; new: string }>;
      typeChanges?: Array<{ column: string; oldType: string; newType: string }>;
    }
  ): ImpactAnalysis {
    const node = this.tracker.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const nodes = this.tracker.getNodes();
    const edges = this.tracker.getEdges();

    return this.impactAnalyzer.analyzeSchemaChange(node, schemaChanges, nodes, edges);
  }

  /**
   * Analyze the impact of removing a node
   */
  analyzeNodeRemoval(nodeId: string, replacementNodeId?: string): ImpactAnalysis {
    const node = this.tracker.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const nodes = this.tracker.getNodes();
    const edges = this.tracker.getEdges();

    const replacementNode = replacementNodeId
      ? this.tracker.getNode(replacementNodeId)
      : undefined;

    return this.impactAnalyzer.analyzeNodeRemoval(node, nodes, edges, replacementNode);
  }

  /**
   * Compare two versions of a node
   */
  compareNodeVersions(oldVersion: LineageNode, newVersion: LineageNode) {
    return this.impactAnalyzer.compareNodeVersions(oldVersion, newVersion);
  }

  /**
   * Estimate the blast radius of a change
   */
  estimateBlastRadius(nodeId: string, maxDepth?: number) {
    const node = this.tracker.getNode(nodeId);
    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const nodes = this.tracker.getNodes();
    const edges = this.tracker.getEdges();

    return this.impactAnalyzer.estimateBlastRadius(node, nodes, edges, maxDepth);
  }

  // ============================================================================
  // Lineage Queries and Navigation
  // ============================================================================

  /**
   * Get all upstream dependencies for a node
   */
  getUpstreamNodes(nodeId: string, maxDepth?: number): LineageNode[] {
    return this.tracker.getUpstreamNodes(
      nodeId,
      maxDepth || this.config.defaultScanDepth
    );
  }

  /**
   * Get all downstream dependents for a node
   */
  getDownstreamNodes(nodeId: string, maxDepth?: number): LineageNode[] {
    return this.tracker.getDownstreamNodes(
      nodeId,
      maxDepth || this.config.defaultScanDepth
    );
  }

  /**
   * Trace column lineage from source to target
   */
  traceColumnLineage(
    nodeId: string,
    columnName: string,
    direction: 'upstream' | 'downstream' = 'upstream'
  ) {
    return this.tracker.traceColumnLineage(nodeId, columnName, direction);
  }

  /**
   * Search for nodes matching criteria
   */
  searchNodes(query: LineageSearchQuery): LineageNode[] {
    const allNodes = this.tracker.getNodes();

    return allNodes.filter(node => {
      if (query.nodeId && node.id !== query.nodeId) return false;
      if (query.nodeName && !node.name.toLowerCase().includes(query.nodeName.toLowerCase()))
        return false;
      if (query.nodeType && node.type !== query.nodeType) return false;
      if (query.platform && node.platform !== query.platform) return false;
      if (query.owner && node.owner !== query.owner) return false;
      if (query.tags && !query.tags.some(tag => node.tags.includes(tag))) return false;
      if (query.columnName && !node.columns.some(col => col.name === query.columnName))
        return false;
      if (query.dateRange) {
        if (node.createdAt < query.dateRange.start || node.createdAt > query.dateRange.end)
          return false;
      }

      return true;
    });
  }

  /**
   * Get a specific node by ID
   */
  getNode(nodeId: string): LineageNode | undefined {
    return this.tracker.getNode(nodeId);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): LineageNode[] {
    return this.tracker.getNodes();
  }

  /**
   * Get all edges
   */
  getAllEdges(): LineageEdge[] {
    return this.tracker.getEdges();
  }

  // ============================================================================
  // Source-to-Target Mapping
  // ============================================================================

  /**
   * Create a source-to-target mapping
   */
  async createMapping(mapping: SourceTargetMapping): Promise<SourceTargetMapping> {
    // Create nodes for source and target if they don't exist
    // This is a simplified implementation
    return mapping;
  }

  /**
   * Validate a source-to-target mapping
   */
  validateMapping(mapping: SourceTargetMapping): {
    valid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate sources exist
    for (const source of mapping.sourceSystems) {
      const nodes = this.searchNodes({ nodeName: source.name });
      if (nodes.length === 0) {
        warnings.push(`Source system "${source.name}" not found in lineage graph`);
      }
    }

    // Validate target exists
    const targetNodes = this.searchNodes({ nodeName: mapping.targetSystem.name });
    if (targetNodes.length === 0) {
      warnings.push(`Target system "${mapping.targetSystem.name}" not found in lineage graph`);
    }

    // Validate field mappings
    for (const fieldMapping of mapping.mappings) {
      if (fieldMapping.required && !fieldMapping.defaultValue) {
        if (fieldMapping.sourceFields.length === 0) {
          errors.push(`Required field "${fieldMapping.targetField}" has no source fields`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  // ============================================================================
  // Utility Methods
  // ============================================================================

  /**
   * Get lineage events
   */
  getEvents(filters?: { eventType?: string; startDate?: Date; endDate?: Date }) {
    return this.tracker.getEvents(filters);
  }

  /**
   * Detect circular dependencies
   */
  detectCircularDependencies(): string[][] {
    const nodes = this.tracker.getNodes();
    const edges = this.tracker.getEdges();

    return this.graphBuilder.detectCircularDependencies(nodes, edges);
  }

  /**
   * Get lineage summary statistics
   */
  getSummary(): {
    totalNodes: number;
    totalEdges: number;
    nodesByType: Record<string, number>;
    edgesByType: Record<string, number>;
  } {
    const nodes = this.tracker.getNodes();
    const edges = this.tracker.getEdges();

    const nodesByType: Record<string, number> = {};
    for (const node of nodes) {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
    }

    const edgesByType: Record<string, number> = {};
    for (const edge of edges) {
      edgesByType[edge.type] = (edgesByType[edge.type] || 0) + 1;
    }

    return {
      totalNodes: nodes.length,
      totalEdges: edges.length,
      nodesByType,
      edgesByType,
    };
  }

  // ============================================================================
  // Component Access
  // ============================================================================

  /**
   * Get the tracker instance for advanced operations
   */
  getTracker(): LineageTracker {
    return this.tracker;
  }

  /**
   * Get the graph builder instance for advanced operations
   */
  getGraphBuilder(): GraphBuilder {
    return this.graphBuilder;
  }

  /**
   * Get the impact analyzer instance for advanced operations
   */
  getImpactAnalyzer(): ImpactAnalyzer {
    return this.impactAnalyzer;
  }
}
