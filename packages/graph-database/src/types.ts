/**
 * Core Graph Database Types
 * Native property graph data model with temporal and hypergraph support
 */

// Simple ID generator (no external dependency)
export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

// Node Types
export type NodeProperty = Record<string, unknown>;

export interface Node {
  id: string;
  labels: string[];
  properties: NodeProperty;
  createdAt: number;
  updatedAt: number;
  version: number;
  deleted: boolean;
}

// Edge Types
export type EdgeProperty = Record<string, unknown>;

export interface Edge {
  id: string;
  type: string;
  sourceId: string;
  targetId: string;
  properties: EdgeProperty;
  weight: number;
  createdAt: number;
  updatedAt: number;
  version: number;
  deleted: boolean;
  validFrom?: number;
  validTo?: number;
}

// Hyperedge for complex n-ary relationships
export interface Hyperedge {
  id: string;
  type: string;
  nodeIds: string[];
  properties: EdgeProperty;
  weight: number;
  createdAt: number;
  updatedAt: number;
  version: number;
  deleted: boolean;
}

// Index-free adjacency structures
export interface AdjacencyList {
  outgoing: Map<string, Set<string>>;
  incoming: Map<string, Set<string>>;
  byType: Map<string, Set<string>>;
}

// Graph Schema
export type PropertyType = 'string' | 'number' | 'boolean' | 'date' | 'array' | 'object';
export type IndexType = 'btree' | 'hash' | 'fulltext' | 'spatial' | 'vector';

export interface GraphSchemaConstraint {
  nodeLabel?: string;
  edgeType?: string;
  propertyKey: string;
  propertyType: PropertyType;
  required: boolean;
  unique: boolean;
  indexed: boolean;
}

export interface GraphIndex {
  name: string;
  nodeLabel?: string;
  edgeType?: string;
  properties: string[];
  type: IndexType;
}

export interface GraphSchema {
  version: number;
  constraints: GraphSchemaConstraint[];
  indexes: GraphIndex[];
}

// Transaction Types
export type TransactionStatus = 'active' | 'committed' | 'aborted';
export type IsolationLevel = 'read_uncommitted' | 'read_committed' | 'repeatable_read' | 'serializable';
export type OperationType = 'create_node' | 'update_node' | 'delete_node' | 'create_edge' | 'update_edge' | 'delete_edge';

export interface TransactionOperation {
  type: OperationType;
  entityId: string;
  before?: unknown;
  after?: unknown;
}

export interface Transaction {
  id: string;
  startTime: number;
  endTime?: number;
  status: TransactionStatus;
  isolationLevel: IsolationLevel;
  operations: TransactionOperation[];
}

// Partition Types
export type PartitionStrategy = 'hash' | 'range' | 'list' | 'composite' | 'edge_cut' | 'vertex_cut';

export interface Partition {
  id: string;
  strategy: PartitionStrategy;
  nodeIds: Set<string>;
  edgeIds: Set<string>;
  metadata: Record<string, unknown>;
}

// Storage Configuration
export interface StorageConfig {
  dataDir: string;
  cacheSize: number;
  enableCompression: boolean;
  enableEncryption: boolean;
  partitionStrategy: PartitionStrategy;
  replicationFactor: number;
  writeAheadLog: boolean;
}

// Query Types
export interface GraphQuery {
  match?: MatchPattern[];
  where?: WhereClause[];
  return?: ReturnClause[];
  orderBy?: OrderByClause[];
  limit?: number;
  skip?: number;
}

export interface MatchPattern {
  node?: {
    id?: string;
    labels?: string[];
    properties?: Record<string, unknown>;
  };
  edge?: {
    type?: string;
    direction?: 'out' | 'in' | 'both';
    properties?: Record<string, unknown>;
    minHops?: number;
    maxHops?: number;
  };
  target?: {
    id?: string;
    labels?: string[];
    properties?: Record<string, unknown>;
  };
}

export type ComparisonOperator = '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX';
export type LogicalOperator = 'AND' | 'OR' | 'NOT';
export type AggregationType = 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COLLECT';
export type SortDirection = 'ASC' | 'DESC';

export interface WhereClause {
  field: string;
  operator: ComparisonOperator;
  value: unknown;
  logicalOp?: LogicalOperator;
}

export interface ReturnClause {
  field: string;
  alias?: string;
  aggregation?: AggregationType;
}

export interface OrderByClause {
  field: string;
  direction: SortDirection;
}

// Path Types
export interface Path {
  nodes: Node[];
  edges: Edge[];
  length: number;
  weight: number;
}

// Graph Statistics
export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  labelCounts: Map<string, number>;
  typeCounts: Map<string, number>;
  avgDegree: number;
  density: number;
  diameter?: number;
  avgPathLength?: number;
  clusteringCoefficient?: number;
}

// Error Types
export class GraphDatabaseError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code: string, details?: unknown) {
    super(message);
    this.name = 'GraphDatabaseError';
    this.code = code;
    this.details = details;
  }
}

export class TransactionError extends GraphDatabaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'TRANSACTION_ERROR', details);
    this.name = 'TransactionError';
  }
}

export class ConstraintViolationError extends GraphDatabaseError {
  constructor(message: string, details?: unknown) {
    super(message, 'CONSTRAINT_VIOLATION', details);
    this.name = 'ConstraintViolationError';
  }
}

// Simple LRU Cache implementation (no external dependency)
export class SimpleLRUCache<K, V> {
  private cache: Map<K, V>;
  private maxSize: number;

  constructor(options: { max: number }) {
    this.cache = new Map();
    this.maxSize = options.max;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest (first) entry
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}
