/**
 * Core types for data lineage tracking and analysis
 */

/**
 * Represents a node in the lineage graph (table, view, file, API, etc.)
 */
export interface LineageNode {
  id: string;
  name: string;
  type: NodeType;
  subtype?: string;
  schema?: string;
  database?: string;
  platform: string; // e.g., 'postgres', 's3', 'snowflake', 'api'
  owner?: string;
  description?: string;
  tags: string[];
  metadata: Record<string, any>;
  columns: ColumnMetadata[];
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt?: Date;
}

export type NodeType =
  | 'table'
  | 'view'
  | 'materialized-view'
  | 'file'
  | 'api'
  | 'stream'
  | 'report'
  | 'dashboard'
  | 'ml-model'
  | 'transformation'
  | 'stored-procedure'
  | 'function';

/**
 * Column-level metadata for lineage tracking
 */
export interface ColumnMetadata {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  description?: string;
  semanticType?: string; // e.g., 'PII', 'financial', 'metric'
  businessGlossaryTerm?: string;
  tags: string[];
  classification?: DataClassification;
  transformations: ColumnTransformation[];
  metadata: Record<string, any>;
}

export type DataClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'pii'
  | 'phi'
  | 'pci';

/**
 * Represents an edge/relationship in the lineage graph
 */
export interface LineageEdge {
  id: string;
  sourceNodeId: string;
  targetNodeId: string;
  type: EdgeType;
  transformationType?: TransformationType;
  transformationLogic?: string;
  confidence: number; // 0-1, how confident we are about this lineage
  discoveryMethod: DiscoveryMethod;
  columnMappings: ColumnMapping[];
  metadata: Record<string, any>;
  createdAt: Date;
  lastVerifiedAt?: Date;
}

export type EdgeType =
  | 'direct-copy'
  | 'transformation'
  | 'aggregation'
  | 'join'
  | 'union'
  | 'filter'
  | 'lookup'
  | 'derived';

export type TransformationType =
  | 'select'
  | 'aggregate'
  | 'join'
  | 'union'
  | 'filter'
  | 'pivot'
  | 'unpivot'
  | 'window'
  | 'cast'
  | 'concatenate'
  | 'split'
  | 'custom';

export type DiscoveryMethod =
  | 'manual'
  | 'sql-parsing'
  | 'metadata-scanning'
  | 'api-introspection'
  | 'log-analysis'
  | 'pattern-matching'
  | 'ml-inference';

/**
 * Column-level mapping between source and target
 */
export interface ColumnMapping {
  sourceColumns: string[];
  targetColumn: string;
  transformation?: ColumnTransformation;
  confidence: number;
}

/**
 * Transformation applied to column(s)
 */
export interface ColumnTransformation {
  type: TransformationType;
  expression?: string;
  function?: string;
  parameters?: Record<string, any>;
  description?: string;
}

/**
 * Complete lineage graph structure
 */
export interface LineageGraph {
  id: string;
  name: string;
  description?: string;
  rootNode?: string; // Optional root node ID
  nodes: Map<string, LineageNode>;
  edges: Map<string, LineageEdge>;
  direction: 'upstream' | 'downstream' | 'both';
  depth: number;
  generatedAt: Date;
  metadata: Record<string, any>;
}

/**
 * Impact analysis result
 */
export interface ImpactAnalysis {
  id: string;
  sourceNode: LineageNode;
  changeType: ChangeType;
  changeDescription: string;
  impactScope: ImpactScope;
  affectedNodes: AffectedNode[];
  affectedColumns: AffectedColumn[];
  riskLevel: RiskLevel;
  estimatedImpact: ImpactEstimate;
  recommendations: ImpactRecommendation[];
  analysisDate: Date;
}

export type ChangeType =
  | 'schema-change'
  | 'column-add'
  | 'column-remove'
  | 'column-rename'
  | 'datatype-change'
  | 'transformation-change'
  | 'data-source-change'
  | 'deprecation'
  | 'removal';

export interface ImpactScope {
  totalNodesAffected: number;
  totalColumnsAffected: number;
  downstreamDepth: number;
  criticalSystemsAffected: string[];
  usersAffected?: number;
}

export interface AffectedNode {
  node: LineageNode;
  distance: number; // Hops from source
  impactType: 'direct' | 'indirect';
  severity: RiskLevel;
  breakingChange: boolean;
  migrationRequired: boolean;
  estimatedEffort?: string;
}

export interface AffectedColumn {
  nodeId: string;
  nodeName: string;
  columnName: string;
  impactDescription: string;
  breakingChange: boolean;
  suggestedAction?: string;
}

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'informational';

export interface ImpactEstimate {
  systemsImpacted: number;
  reportsImpacted: number;
  dashboardsImpacted: number;
  mlModelsImpacted: number;
  estimatedDowntime?: string;
  estimatedMigrationEffort?: string;
}

export interface ImpactRecommendation {
  priority: 'high' | 'medium' | 'low';
  category: string;
  action: string;
  rationale: string;
  estimatedEffort?: string;
}

/**
 * Lineage tracking event
 */
export interface LineageEvent {
  id: string;
  eventType: LineageEventType;
  timestamp: Date;
  sourceNode?: LineageNode;
  targetNode?: LineageNode;
  edge?: LineageEdge;
  user?: string;
  metadata: Record<string, any>;
}

export type LineageEventType =
  | 'node-created'
  | 'node-updated'
  | 'node-deleted'
  | 'edge-created'
  | 'edge-updated'
  | 'edge-deleted'
  | 'lineage-scanned'
  | 'impact-analyzed';

/**
 * Dependency graph for a specific node
 */
export interface DependencyGraph {
  rootNode: LineageNode;
  upstream: {
    nodes: LineageNode[];
    edges: LineageEdge[];
    depth: number;
  };
  downstream: {
    nodes: LineageNode[];
    edges: LineageEdge[];
    depth: number;
  };
  criticalPath: LineageNode[];
}

/**
 * Source-to-target mapping
 */
export interface SourceTargetMapping {
  id: string;
  sourceSystems: DataSource[];
  targetSystem: DataTarget;
  mappings: FieldMapping[];
  transformationRules: TransformationRule[];
  validationRules: ValidationRule[];
  status: 'active' | 'deprecated' | 'draft';
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataSource {
  id: string;
  name: string;
  type: string;
  connectionString?: string;
  schema?: string;
  table?: string;
  metadata: Record<string, any>;
}

export interface DataTarget {
  id: string;
  name: string;
  type: string;
  connectionString?: string;
  schema?: string;
  table?: string;
  metadata: Record<string, any>;
}

export interface FieldMapping {
  sourceFields: string[];
  targetField: string;
  transformation?: TransformationRule;
  required: boolean;
  defaultValue?: any;
}

export interface TransformationRule {
  id: string;
  name: string;
  type: TransformationType;
  expression: string;
  language: 'sql' | 'python' | 'javascript' | 'spark' | 'custom';
  parameters: Record<string, any>;
  description?: string;
}

export interface ValidationRule {
  id: string;
  name: string;
  field: string;
  condition: string;
  errorMessage: string;
  severity: 'error' | 'warning' | 'info';
}

/**
 * Lineage scan configuration
 */
export interface LineageScanConfig {
  sources: string[]; // Node IDs to scan from
  maxDepth?: number;
  direction: 'upstream' | 'downstream' | 'both';
  includeColumnLineage?: boolean;
  discoveryMethods?: DiscoveryMethod[];
  filters?: LineageFilter;
  parallelScans?: boolean;
}

export interface LineageFilter {
  nodeTypes?: NodeType[];
  platforms?: string[];
  tags?: string[];
  excludePatterns?: string[];
  minConfidence?: number;
}

/**
 * Lineage statistics and metrics
 */
export interface LineageMetrics {
  totalNodes: number;
  totalEdges: number;
  nodesByType: Record<NodeType, number>;
  edgesByType: Record<EdgeType, number>;
  averageDepth: number;
  maxDepth: number;
  orphanedNodes: number;
  circularDependencies: number;
  confidenceDistribution: {
    high: number; // > 0.8
    medium: number; // 0.5-0.8
    low: number; // < 0.5
  };
  lastScanDate?: Date;
  coverage: number; // Percentage of data assets tracked
}

/**
 * Automated lineage discovery result
 */
export interface DiscoveryResult {
  id: string;
  scanConfig: LineageScanConfig;
  discoveredNodes: LineageNode[];
  discoveredEdges: LineageEdge[];
  errors: DiscoveryError[];
  warnings: string[];
  statistics: {
    scannedSources: number;
    newNodes: number;
    updatedNodes: number;
    newEdges: number;
    duration: number; // milliseconds
  };
  scanDate: Date;
}

export interface DiscoveryError {
  source: string;
  error: string;
  severity: 'critical' | 'error' | 'warning';
  metadata?: Record<string, any>;
}

/**
 * Lineage search query
 */
export interface LineageSearchQuery {
  nodeId?: string;
  nodeName?: string;
  nodeType?: NodeType;
  platform?: string;
  tags?: string[];
  columnName?: string;
  owner?: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

/**
 * Lineage path between two nodes
 */
export interface LineagePath {
  sourceNode: LineageNode;
  targetNode: LineageNode;
  path: Array<{
    node: LineageNode;
    edge?: LineageEdge;
  }>;
  length: number;
  confidence: number;
  transformations: ColumnTransformation[];
}
