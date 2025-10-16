import { Pool } from 'pg';
import neo4j from 'neo4j-driver';

export interface Entity {
  id: string;
  type: string;
  name: string;
  attributes: Record<string, any>;
  sources: Source[];
  degree: number;
  confidence?: number;
  createdAt: Date;
  updatedAt: Date;
  retentionTier: string;
  purpose: string;
  region: string;
}

export interface Indicator {
  id: string;
  iocType: string;
  value: string;
  confidence?: number;
  sources: Source[];
  relatedEntities: Entity[];
  firstSeen?: Date;
  lastSeen?: Date;
  tags: string[];
}

export interface Source {
  id: string;
  system: string;
  collectedAt: Date;
  provenance: Record<string, any>;
  reliability?: number;
}

export interface PathStep {
  from: string;
  to: string;
  relType: string;
  score?: number;
  properties?: Record<string, any>;
}

export interface GraphInsight {
  type: string;
  score: number;
  entities: Entity[];
  description?: string;
  evidence: any[];
}

export interface EntitySearchResult {
  entities: Entity[];
  totalCount: number;
  hasMore: boolean;
  nextCursor?: string | null;
}

export interface EntityGraph {
  nodes: EntityNode[];
  edges: EntityEdge[];
  stats: GraphStats;
}

export interface EntityNode {
  id: string;
  label: string;
  type: string;
  weight: number;
  properties?: Record<string, any>;
}

export interface EntityEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  properties?: Record<string, any>;
}

export interface GraphStats {
  nodeCount: number;
  edgeCount: number;
  density: number;
  clustering: number;
}

export interface HealthStatus {
  status: string;
  timestamp: Date;
  version: string;
  components: Record<string, any>;
  metrics: Record<string, any>;
}

export interface User {
  id: string;
  tenant: string;
  roles: string[];
  scopes: string[];
  residency: string;
  email?: string;
}

export interface OPAClient {
  evaluate(policy: string, input: any): Promise<any>;
}

export interface ResolverContext {
  user?: User;
  pg: Pool;
  neo4j: neo4j.Driver;
  opa: OPAClient;
  requestId: string;
}

export interface EntityFilter {
  types?: string[];
  purposes?: string[];
  regions?: string[];
  sources?: string[];
  retentionTiers?: string[];
  dateRange?: {
    from: Date;
    to: Date;
  };
  minConfidence?: number;
}

export interface PaginationInput {
  limit: number;
  offset: number;
}
