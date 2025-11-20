/**
 * Core types for knowledge graph infrastructure
 */

export interface GraphNode {
  id: string;
  type: string;
  properties: Record<string, any>;
  labels?: string[];
  metadata?: GraphMetadata;
}

export interface GraphEdge {
  id?: string;
  from: string;
  to: string;
  type: string;
  properties?: Record<string, any>;
  weight?: number;
  directed?: boolean;
  metadata?: GraphMetadata;
}

export interface GraphMetadata {
  createdAt?: Date;
  updatedAt?: Date;
  createdBy?: string;
  updatedBy?: string;
  version?: number;
  confidence?: number;
  source?: string;
  provenance?: string[];
}

export interface GraphQuery {
  match?: string | GraphPattern;
  where?: Record<string, any>;
  return?: string[];
  orderBy?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  limit?: number;
  skip?: number;
}

export interface GraphPattern {
  nodes?: Array<{
    variable: string;
    labels?: string[];
    properties?: Record<string, any>;
  }>;
  relationships?: Array<{
    from: string;
    to: string;
    type?: string;
    direction?: 'out' | 'in' | 'both';
    properties?: Record<string, any>;
  }>;
}

export interface GraphDatabaseConfig {
  type: 'neo4j' | 'janusgraph' | 'memory';
  uri?: string;
  auth?: {
    username: string;
    password: string;
  };
  database?: string;
  maxConnectionPoolSize?: number;
  connectionTimeout?: number;
  encrypted?: boolean;
}

export interface TripleStoreConfig {
  backend: 'memory' | 'redis' | 'postgres';
  namespace?: string;
  prefixes?: Record<string, string>;
}

export interface Triple {
  subject: string;
  predicate: string;
  object: string | number | boolean;
  graph?: string;
}

export interface GraphPartition {
  id: string;
  nodes: Set<string>;
  edges: Set<string>;
  metadata: {
    size: number;
    density: number;
    createdAt: Date;
  };
}

export interface GraphVersion {
  version: number;
  timestamp: Date;
  changes: GraphChange[];
  snapshot?: string;
  author?: string;
  message?: string;
}

export interface GraphChange {
  type: 'node_added' | 'node_updated' | 'node_deleted' | 'edge_added' | 'edge_updated' | 'edge_deleted';
  target: string;
  before?: any;
  after?: any;
  timestamp: Date;
}

export interface GraphIndex {
  name: string;
  type: 'fulltext' | 'spatial' | 'composite' | 'range';
  fields: string[];
  options?: Record<string, any>;
}

export interface GraphTraversalOptions {
  direction?: 'out' | 'in' | 'both';
  maxDepth?: number;
  relationshipTypes?: string[];
  uniqueness?: 'node' | 'edge' | 'none';
  filter?: (node: GraphNode, edge: GraphEdge) => boolean;
}

export interface TemporalQuery {
  timestamp?: Date;
  startTime?: Date;
  endTime?: Date;
  version?: number;
}

export interface GraphStatistics {
  nodeCount: number;
  edgeCount: number;
  nodeTypes: Record<string, number>;
  edgeTypes: Record<string, number>;
  avgDegree: number;
  density: number;
  clusteringCoefficient?: number;
  diameter?: number;
}

export type GraphFormat = 'cypher' | 'sparql' | 'gremlin' | 'graphql';

export interface QueryResult<T = any> {
  data: T[];
  metadata: {
    count: number;
    executionTime: number;
    cached: boolean;
  };
}

export interface GraphBackup {
  id: string;
  timestamp: Date;
  format: 'full' | 'incremental';
  size: number;
  location: string;
  checksum: string;
}
