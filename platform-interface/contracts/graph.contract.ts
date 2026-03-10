/**
 * Knowledge Graph API Contract
 *
 * Cross-domain contract for graph database operations.
 * Enforced by Interface Spine (LAW-ASP).
 *
 * Implementer: knowledge-graph domain
 * Consumers: intelligence-platform, agent-orchestration, ml-platform
 */

export interface GraphAPI {
  // Entity operations
  createEntity(entity: EntityInput): Promise<GraphEntity>;
  getEntity(id: string): Promise<GraphEntity>;
  updateEntity(id: string, updates: Partial<GraphEntity>): Promise<GraphEntity>;
  deleteEntity(id: string): Promise<void>;
  findEntities(query: EntityQuery): Promise<GraphEntity[]>;

  // Relationship operations
  createRelationship(rel: RelationshipInput): Promise<GraphRelationship>;
  getRelationships(entityId: string, options?: RelationshipOptions): Promise<GraphRelationship[]>;
  deleteRelationship(id: string): Promise<void>;

  // Query operations
  query(cypher: string, params?: Record<string, unknown>): Promise<QueryResult>;
  traverse(start: string, pattern: TraversalPattern): Promise<Path[]>;

  // Reasoning operations
  inferRelationships(entityId: string): Promise<InferredRelationship[]>;
  findPatterns(pattern: GraphPattern): Promise<PatternMatch[]>;
}

// Entity Types
export interface EntityInput {
  type: string;
  attributes: Record<string, unknown>;
  labels?: string[];
}

export interface GraphEntity {
  id: string;
  type: string;
  attributes: Record<string, unknown>;
  labels: string[];
  createdAt: string;
  updatedAt: string;
}

export interface EntityQuery {
  types?: string[];
  labels?: string[];
  attributes?: Record<string, unknown>;
  limit?: number;
}

// Relationship Types
export interface RelationshipInput {
  from: string;
  to: string;
  type: string;
  attributes?: Record<string, unknown>;
}

export interface GraphRelationship {
  id: string;
  from: string;
  to: string;
  type: string;
  attributes: Record<string, unknown>;
  createdAt: string;
}

export interface RelationshipOptions {
  direction?: 'in' | 'out' | 'both';
  types?: string[];
  limit?: number;
}

// Query Types
export interface QueryResult {
  records: QueryRecord[];
  summary: QuerySummary;
}

export interface QueryRecord {
  [key: string]: unknown;
}

export interface QuerySummary {
  queryType: 'read' | 'write';
  counters: {
    nodesCreated?: number;
    nodesDeleted?: number;
    relationshipsCreated?: number;
    relationshipsDeleted?: number;
    propertiesSet?: number;
  };
  resultAvailableAfter: number;
  resultConsumedAfter: number;
}

// Traversal Types
export interface TraversalPattern {
  maxDepth?: number;
  relationshipTypes?: string[];
  nodeLabels?: string[];
  direction?: 'in' | 'out' | 'both';
}

export interface Path {
  nodes: GraphEntity[];
  relationships: GraphRelationship[];
  length: number;
}

// Reasoning Types
export interface InferredRelationship {
  from: string;
  to: string;
  type: string;
  confidence: number;
  reasoning: string;
  supportingEvidence: string[];
}

export interface GraphPattern {
  nodes: PatternNode[];
  relationships: PatternRelationship[];
}

export interface PatternNode {
  id?: string;
  type?: string;
  labels?: string[];
  attributes?: Record<string, unknown>;
}

export interface PatternRelationship {
  from: string;
  to: string;
  type?: string;
}

export interface PatternMatch {
  pattern: GraphPattern;
  matches: PatternMatchInstance[];
  confidence: number;
}

export interface PatternMatchInstance {
  nodeBindings: Record<string, string>;
  relationshipBindings: Record<string, string>;
}
