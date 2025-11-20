/**
 * Core Graph Database Types
 * Native property graph data model with temporal and hypergraph support
 */

import { z } from 'zod';

// Node Types
export const NodePropertySchema = z.record(z.unknown());
export type NodeProperty = z.infer<typeof NodePropertySchema>;

export const NodeSchema = z.object({
  id: z.string(),
  labels: z.array(z.string()),
  properties: NodePropertySchema,
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.number().default(1),
  deleted: z.boolean().default(false)
});

export type Node = z.infer<typeof NodeSchema>;

// Edge Types
export const EdgePropertySchema = z.record(z.unknown());
export type EdgeProperty = z.infer<typeof EdgePropertySchema>;

export const EdgeSchema = z.object({
  id: z.string(),
  type: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  properties: EdgePropertySchema,
  weight: z.number().default(1.0),
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.number().default(1),
  deleted: z.boolean().default(false),
  // Temporal support
  validFrom: z.number().optional(),
  validTo: z.number().optional()
});

export type Edge = z.infer<typeof EdgeSchema>;

// Hyperedge for complex n-ary relationships
export const HyperedgeSchema = z.object({
  id: z.string(),
  type: z.string(),
  nodeIds: z.array(z.string()),
  properties: EdgePropertySchema,
  weight: z.number().default(1.0),
  createdAt: z.number(),
  updatedAt: z.number(),
  version: z.number().default(1),
  deleted: z.boolean().default(false)
});

export type Hyperedge = z.infer<typeof HyperedgeSchema>;

// Index-free adjacency structures
export interface AdjacencyList {
  outgoing: Map<string, Set<string>>; // nodeId -> Set of edge IDs
  incoming: Map<string, Set<string>>; // nodeId -> Set of edge IDs
  byType: Map<string, Set<string>>;   // type -> Set of edge IDs
}

// Graph Schema
export const GraphSchemaConstraintSchema = z.object({
  nodeLabel: z.string().optional(),
  edgeType: z.string().optional(),
  propertyKey: z.string(),
  propertyType: z.enum(['string', 'number', 'boolean', 'date', 'array', 'object']),
  required: z.boolean().default(false),
  unique: z.boolean().default(false),
  indexed: z.boolean().default(false)
});

export type GraphSchemaConstraint = z.infer<typeof GraphSchemaConstraintSchema>;

export const GraphSchemaSchema = z.object({
  version: z.number(),
  constraints: z.array(GraphSchemaConstraintSchema),
  indexes: z.array(z.object({
    name: z.string(),
    nodeLabel: z.string().optional(),
    edgeType: z.string().optional(),
    properties: z.array(z.string()),
    type: z.enum(['btree', 'hash', 'fulltext', 'spatial', 'vector'])
  }))
});

export type GraphSchema = z.infer<typeof GraphSchemaSchema>;

// Transaction Types
export const TransactionSchema = z.object({
  id: z.string(),
  startTime: z.number(),
  endTime: z.number().optional(),
  status: z.enum(['active', 'committed', 'aborted']),
  isolationLevel: z.enum(['read_uncommitted', 'read_committed', 'repeatable_read', 'serializable']),
  operations: z.array(z.object({
    type: z.enum(['create_node', 'update_node', 'delete_node', 'create_edge', 'update_edge', 'delete_edge']),
    entityId: z.string(),
    before: z.unknown().optional(),
    after: z.unknown().optional()
  }))
});

export type Transaction = z.infer<typeof TransactionSchema>;

// Partition Types
export const PartitionStrategySchema = z.enum([
  'hash',
  'range',
  'list',
  'composite',
  'edge_cut',
  'vertex_cut'
]);

export type PartitionStrategy = z.infer<typeof PartitionStrategySchema>;

export const PartitionSchema = z.object({
  id: z.string(),
  strategy: PartitionStrategySchema,
  nodeIds: z.set(z.string()),
  edgeIds: z.set(z.string()),
  metadata: z.record(z.unknown())
});

export type Partition = z.infer<typeof PartitionSchema>;

// Storage Configuration
export const StorageConfigSchema = z.object({
  dataDir: z.string(),
  cacheSize: z.number().default(1024 * 1024 * 100), // 100MB default
  enableCompression: z.boolean().default(true),
  enableEncryption: z.boolean().default(false),
  partitionStrategy: PartitionStrategySchema.default('hash'),
  replicationFactor: z.number().default(1),
  writeAheadLog: z.boolean().default(true)
});

export type StorageConfig = z.infer<typeof StorageConfigSchema>;

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

export interface WhereClause {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'IN' | 'CONTAINS' | 'STARTS_WITH' | 'ENDS_WITH' | 'REGEX';
  value: unknown;
  logicalOp?: 'AND' | 'OR' | 'NOT';
}

export interface ReturnClause {
  field: string;
  alias?: string;
  aggregation?: 'COUNT' | 'SUM' | 'AVG' | 'MIN' | 'MAX' | 'COLLECT';
}

export interface OrderByClause {
  field: string;
  direction: 'ASC' | 'DESC';
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
  constructor(message: string, public code: string, public details?: unknown) {
    super(message);
    this.name = 'GraphDatabaseError';
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
