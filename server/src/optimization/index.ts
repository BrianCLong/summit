// server/src/optimization/index.ts

export { Neo4jQueryOptimizer } from './neo4j-query-optimizer.js';
export { PostgresPerformanceOptimizer } from './postgres-performance-optimizer.js';
export { ApiGatewayOptimizer } from './api-gateway-optimizer.js';
export { CostEfficiencyOptimizer } from './cost-efficiency-optimizer.js';
export { PerformanceMonitoringSystem } from './performance-monitoring-system.js';
export { OptimizationManager } from './optimization-manager.js';

// Re-export types for convenience
export type {
  QueryComplexity,
  QueryMetrics,
  CachedQueryResult,
  MaterializedView,
} from './neo4j-query-optimizer.js';

export type {
  QueryPlan,
  IndexRecommendation,
  ConnectionPoolMetrics,
  SlowQueryLog,
  MaintenanceTask,
} from './postgres-performance-optimizer.js';

export type {
  CacheConfig,
  CircuitBreakerConfig,
  BulkheadConfig,
  RouteMetrics,
  CostMetrics,
} from './api-gateway-optimizer.js';

export type {
  ModelProfile,
  ModelSelectionCriteria,
  CostPrediction,
  BudgetTracker,
  OptimizationRecommendation,
  UsageAnalytics,
} from './cost-efficiency-optimizer.js';

export type {
  SystemMetrics,
  DatabaseMetrics,
  ApplicationMetrics,
  AlertRule,
  PerformanceAlert,
  SLODefinition,
  SLOStatus,
  PerformanceDashboard,
} from './performance-monitoring-system.js';
