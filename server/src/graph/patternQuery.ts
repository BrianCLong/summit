import { TenantId, EntityType, EdgeType } from './types';

export interface GraphPatternNode {
  alias: string;
  types?: EntityType[];
  attributes?: Record<string, unknown>; // attribute filters (equality)
}

export interface GraphPatternEdge {
  from: string; // node alias
  to: string; // node alias
  types?: EdgeType[];
  directed?: boolean;
  attributes?: Record<string, unknown>;
}

export interface GraphPatternQuery {
  tenantId: TenantId;
  pattern: {
    nodes: GraphPatternNode[];
    edges: GraphPatternEdge[];
  };
  filters?: Record<string, unknown>; // Global filters or advanced constraints
  limit?: number;
}
