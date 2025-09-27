import type { Logger } from 'pino';
import type { CostCollector } from './cost/costCollector.js';
import type { GraphNode, GraphRelationship, NeighborhoodResult, PathConnection } from './utils/mappers.js';
import type { NeighborhoodCache } from './cache/redisCache.js';
import type { QueryContextMeta } from './datasources/neo4jGraphSource.js';

export interface GraphDataSource {
  getNode(nodeId: string): Promise<QueryContextMeta<GraphNode | null>>;
  getNeighborhood(options: NeighborhoodOptions): Promise<QueryContextMeta<NeighborhoodResult>>;
  findPaths(options: PathOptions): Promise<QueryContextMeta<PathConnection>>;
}

export interface NeighborhoodOptions {
  nodeId: string;
  direction: Direction;
  limit: number;
  cursor?: string | null;
  labelFilters?: string[];
  propertyFilters?: PropertyFilter[];
}

export interface PathOptions {
  startId: string;
  direction: Direction;
  maxHops: number;
  limit: number;
  cursor?: string | null;
  labelFilters?: string[];
  relationshipTypes?: string[];
  propertyFilters?: PropertyFilter[];
}

export interface PropertyFilter {
  key: string;
  value: string | number | boolean;
}

export type Direction = 'OUT' | 'IN' | 'BOTH';

export interface GraphContext {
  dataSources: {
    graph: GraphDataSource;
  };
  cache: NeighborhoodCache | null;
  logger: Logger;
  costCollector: CostCollector;
}

export interface CachedNeighborhoodPayload {
  result: NeighborhoodResult;
}
