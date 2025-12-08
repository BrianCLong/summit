export type TenantId = string;
export type EntityId = string;
export type EdgeId = string;
export type EntityType = string;
export type EdgeType = string;
export type EventId = string;

export interface Entity {
  id: EntityId;
  tenantId: TenantId;
  type: EntityType; // "person", "org", "account", "asset", "location", etc.
  label: string; // human-readable primary label
  createdAt: string;
  updatedAt: string;
  attributes: Record<string, unknown>;
  sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
  metadata: Record<string, unknown>;
}

export interface Edge {
  id: EdgeId;
  tenantId: TenantId;
  type: EdgeType; // "owns", "controls", "transfers", "communicates_with", etc.
  fromEntityId: EntityId;
  toEntityId: EntityId;
  directed: boolean;
  weight?: number; // strength, frequency, or value
  createdAt: string;
  updatedAt: string;
  attributes: Record<string, unknown>;
  sensitivity?: 'public' | 'internal' | 'confidential' | 'restricted';
  metadata: Record<string, unknown>;
}

export interface Event {
  id: EventId;
  tenantId: TenantId;
  type: string; // "transaction", "communication", "login", "shipment", etc.
  occurredAt: string;
  entitiesInvolved: EntityId[];
  edgesInvolved?: EdgeId[];
  attributes: Record<string, unknown>;
  metadata: Record<string, unknown>;
}

export interface EntityQuery {
  ids?: EntityId[];
  types?: EntityType[];
  labelContains?: string;
  attributes?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface EdgeQuery {
  ids?: EdgeId[];
  types?: EdgeType[];
  fromEntityId?: EntityId;
  toEntityId?: EntityId;
  directed?: boolean;
  attributes?: Record<string, unknown>;
  limit?: number;
  offset?: number;
}

export interface GraphService {
  getEntity(tenantId: TenantId, id: EntityId): Promise<Entity | null>;
  findEntities(tenantId: TenantId, query: EntityQuery): Promise<Entity[]>;
  getEdges(tenantId: TenantId, query: EdgeQuery): Promise<Edge[]>;
  upsertEntity(tenantId: TenantId, entity: Partial<Entity>): Promise<Entity>;
  upsertEdge(tenantId: TenantId, edge: Partial<Edge>): Promise<Edge>;
  deleteEntity(tenantId: TenantId, id: EntityId): Promise<boolean>;
  deleteEdge(tenantId: TenantId, id: EdgeId): Promise<boolean>;
}

// Analytics Types

export interface GraphScope {
  investigationId?: string;
  collectionId?: string;
  // Could include advanced filters later
}

export interface PathResult {
  nodes: Entity[];
  edges: Edge[];
  cost?: number;
}

export interface Subgraph {
  nodes: Entity[];
  edges: Edge[];
}

export interface CentralityResult {
  entityId: EntityId;
  score: number;
  rank?: number;
}

export interface CommunityResult {
  communityId: string;
  entityIds: EntityId[];
  size: number;
}

export interface AnomalyResult {
  entityId: EntityId;
  score: number;
  kind: 'degree' | 'motif' | 'isolation' | 'other';
  reason: string;
}

export interface GraphAnalyticsService {
  shortestPath(params: {
    tenantId: TenantId;
    from: EntityId;
    to: EntityId;
    maxDepth?: number;
  }): Promise<PathResult | null>;
  kHopNeighborhood(params: {
    tenantId: TenantId;
    seedIds: EntityId[];
    depth: number;
  }): Promise<Subgraph>;
  centrality(params: {
    tenantId: TenantId;
    scope: GraphScope;
    algorithm: 'degree' | 'betweenness' | 'eigenvector';
  }): Promise<CentralityResult[]>;
  communities(params: {
    tenantId: TenantId;
    scope: GraphScope;
  }): Promise<CommunityResult[]>;
  detectAnomalies(params: {
    tenantId: TenantId;
    scope: GraphScope;
    kind?: 'degree' | 'motif';
  }): Promise<AnomalyResult[]>;
}
