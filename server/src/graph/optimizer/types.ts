export interface OptimizationRule {
  name: string;
  type: 'index_hint' | 'query_rewrite' | 'parameter_tuning' | 'cache_strategy';
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
}

export interface ExecutionHint {
  type: 'parallel' | 'index' | 'join_order' | 'memory' | 'timeout';
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
}

export interface OptimizationContext {
  tenantId: string;
  queryType: 'cypher' | 'sql' | 'gremlin';
  region?: string;
  priority: 'low' | 'medium' | 'high';
  timeoutMs?: number;
  cacheEnabled?: boolean;
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
}
