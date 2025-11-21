/**
 * IntelGraph Observability Module
 * Centralized exports for all observability utilities
 */

// Tracer and tracing utilities
export {
  IntelGraphTracer,
  initializeTracing,
  getTracer,
  traced,
  SpanKind,
  SpanStatusCode,
  type TracingConfig,
} from './tracer.js';

// Enhanced metrics
export {
  // Database pool metrics
  dbConnectionPoolActive,
  dbConnectionPoolIdle,
  dbConnectionPoolWaiting,
  dbConnectionPoolSize,
  dbConnectionAcquisitionDuration,
  dbConnectionErrors,
  // Redis/Cache metrics
  redisCacheHits,
  redisCacheMisses,
  redisCacheHitRatio,
  redisOperationDuration,
  redisConnectionsActive,
  redisCommandsTotal,
  redisKeySize,
  // Neo4j metrics
  neo4jSessionsActive,
  neo4jTransactionDuration,
  neo4jResultSize,
  // Service metrics
  serviceErrors,
  serviceResponseTime,
  // GraphQL metrics
  graphqlOperationComplexity,
  graphqlFieldResolutionCount,
  graphqlCacheUtilization,
  // WebSocket metrics
  websocketMessageSize,
  websocketLatency,
  websocketConnectionDuration,
  // Queue metrics
  queueJobsWaiting,
  queueJobsActive,
  queueJobsCompleted,
  queueJobsFailed,
  queueJobDuration,
  queueJobWaitTime,
  // System metrics
  heapFragmentation,
  eventLoopUtilization,
  // Helper functions
  updateCacheHitRatio,
  recordDbPoolStats,
  recordServiceError,
} from './enhanced-metrics.js';

// PostgreSQL instrumentation
export {
  monitorPostgresPool,
  instrumentPostgresPool,
  getPoolStats,
} from './postgres-instrumentation.js';

// Neo4j instrumentation
export {
  instrumentNeo4jDriver,
  getNeo4jStats,
  resetNeo4jStats,
} from './neo4j-instrumentation.js';

// Redis instrumentation
export {
  instrumentRedisClient,
  InstrumentedRedisCache,
} from './redis-instrumentation.js';

// GraphQL observability plugin is exported from graphql/plugins/observabilityPlugin.ts
