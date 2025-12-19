export type QueryIntent = 'read' | 'write' | 'path_finding' | 'neighborhood' | 'aggregation' | 'centrality' | 'community_detection' | 'pattern_match' | 'unknown';

export interface TraversalStrategy {
  name: string;
  type: 'bfs' | 'dfs' | 'shortest_path' | 'all_simple_paths' | 'apoc_subgraph' | 'native_expansion' | 'gds';
  maxDepth?: number;
  limit?: number;
  algorithmConfig?: Record<string, any>;
}

export interface OptimizationRule {
  name: string;
  type: 'index_hint' | 'query_rewrite' | 'parameter_tuning' | 'cache_strategy' | 'traversal_optimization';
  description: string;
  impact: 'low' | 'medium' | 'high';
  applied: boolean;
  reason?: string;
}

export interface CacheStrategy {
  enabled: boolean;
  ttl: number;
  keyPattern: string;
  invalidationRules: string[];
  partitionKeys?: string[];
  staleWhileRevalidate?: boolean;
}

export interface ExecutionHint {
  type: 'parallel' | 'index' | 'join_order' | 'memory' | 'timeout' | 'concurrency';
  value: string | number;
  description: string;
}

export interface QueryAnalysis {
  complexity: number;
  nodeCount: number;
  relationshipCount: number;
  filterCount: number;
  aggregationCount: number;
  joinCount: number;
  hasWildcard: boolean;
  isRead: boolean;
  isWrite: boolean;
  affectedLabels: string[];
  requiredIndexes: string[];
  intent?: QueryIntent;
  suggestedTraversalStrategy?: TraversalStrategy;
}

export interface OptimizationContext {
  tenantId: string;
  queryType: 'cypher' | 'sql' | 'gremlin';
  region?: string;
  priority: 'low' | 'medium' | 'high';
  timeoutMs?: number;
  cacheEnabled?: boolean;
  intent?: QueryIntent;
  userRoles?: string[];
  features?: string[];
}

export interface QueryPlan {
  originalQuery: string;
  optimizedQuery: string;
  indexes: string[];
  estimatedCost: number;
  estimatedRows: number;
  optimizations: OptimizationRule[];
  cacheStrategy?: CacheStrategy;
  executionHints: ExecutionHint[];
  traversalStrategy?: TraversalStrategy;
}
