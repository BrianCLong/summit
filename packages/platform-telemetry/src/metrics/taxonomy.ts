/**
 * P31: Metrics Taxonomy
 * Standardized metric definitions for Summit platform
 */

import { z } from 'zod';

/**
 * Metric types following OpenTelemetry conventions
 */
export type MetricType = 'counter' | 'gauge' | 'histogram' | 'summary';

/**
 * Metric unit types
 */
export type MetricUnit =
  | 'ms'
  | 's'
  | 'bytes'
  | 'kilobytes'
  | 'megabytes'
  | 'requests'
  | 'errors'
  | 'connections'
  | 'percent'
  | 'count'
  | 'ratio'
  | '1';

/**
 * Metric definition schema
 */
export const MetricDefinitionSchema = z.object({
  name: z.string().regex(/^[a-z][a-z0-9_]*$/),
  type: z.enum(['counter', 'gauge', 'histogram', 'summary']),
  unit: z.string(),
  description: z.string(),
  labels: z.array(z.string()).default([]),
  buckets: z.array(z.number()).optional(),
  objectives: z.record(z.number()).optional(),
});

export type MetricDefinition = z.infer<typeof MetricDefinitionSchema>;

/**
 * Standardized label names
 */
export const StandardLabels = {
  // Service identification
  SERVICE: 'service',
  VERSION: 'version',
  ENVIRONMENT: 'environment',
  INSTANCE: 'instance',

  // Request context
  METHOD: 'method',
  PATH: 'path',
  STATUS_CODE: 'status_code',
  ERROR_TYPE: 'error_type',

  // Database context
  DATABASE: 'database',
  OPERATION: 'operation',
  TABLE: 'table',

  // Cache context
  CACHE_HIT: 'cache_hit',
  CACHE_LAYER: 'cache_layer',

  // Queue context
  QUEUE: 'queue',
  CONSUMER: 'consumer',

  // Business context
  ENTITY_TYPE: 'entity_type',
  INVESTIGATION_TYPE: 'investigation_type',
  USER_TYPE: 'user_type',
} as const;

/**
 * HTTP metrics following RED method
 */
export const HTTPMetrics: Record<string, MetricDefinition> = {
  requestsTotal: {
    name: 'http_requests_total',
    type: 'counter',
    unit: 'requests',
    description: 'Total number of HTTP requests',
    labels: [StandardLabels.METHOD, StandardLabels.PATH, StandardLabels.STATUS_CODE],
  },
  requestDuration: {
    name: 'http_request_duration_seconds',
    type: 'histogram',
    unit: 's',
    description: 'HTTP request duration in seconds',
    labels: [StandardLabels.METHOD, StandardLabels.PATH, StandardLabels.STATUS_CODE],
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  },
  requestSize: {
    name: 'http_request_size_bytes',
    type: 'histogram',
    unit: 'bytes',
    description: 'HTTP request body size in bytes',
    labels: [StandardLabels.METHOD, StandardLabels.PATH],
    buckets: [100, 1000, 10000, 100000, 1000000],
  },
  responseSize: {
    name: 'http_response_size_bytes',
    type: 'histogram',
    unit: 'bytes',
    description: 'HTTP response body size in bytes',
    labels: [StandardLabels.METHOD, StandardLabels.PATH],
    buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
  },
  activeRequests: {
    name: 'http_requests_active',
    type: 'gauge',
    unit: 'requests',
    description: 'Number of active HTTP requests',
    labels: [StandardLabels.METHOD],
  },
};

/**
 * Database metrics following USE method
 */
export const DatabaseMetrics: Record<string, MetricDefinition> = {
  queryTotal: {
    name: 'db_queries_total',
    type: 'counter',
    unit: 'count',
    description: 'Total number of database queries',
    labels: [StandardLabels.DATABASE, StandardLabels.OPERATION],
  },
  queryDuration: {
    name: 'db_query_duration_seconds',
    type: 'histogram',
    unit: 's',
    description: 'Database query duration in seconds',
    labels: [StandardLabels.DATABASE, StandardLabels.OPERATION],
    buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  },
  queryErrors: {
    name: 'db_query_errors_total',
    type: 'counter',
    unit: 'errors',
    description: 'Total number of database query errors',
    labels: [StandardLabels.DATABASE, StandardLabels.OPERATION, StandardLabels.ERROR_TYPE],
  },
  connectionPoolSize: {
    name: 'db_connection_pool_size',
    type: 'gauge',
    unit: 'connections',
    description: 'Current size of database connection pool',
    labels: [StandardLabels.DATABASE],
  },
  connectionPoolActive: {
    name: 'db_connection_pool_active',
    type: 'gauge',
    unit: 'connections',
    description: 'Number of active database connections',
    labels: [StandardLabels.DATABASE],
  },
  connectionPoolWaiting: {
    name: 'db_connection_pool_waiting',
    type: 'gauge',
    unit: 'requests',
    description: 'Number of requests waiting for a connection',
    labels: [StandardLabels.DATABASE],
  },
};

/**
 * Graph database specific metrics
 */
export const GraphMetrics: Record<string, MetricDefinition> = {
  traversalTotal: {
    name: 'graph_traversals_total',
    type: 'counter',
    unit: 'count',
    description: 'Total number of graph traversals',
    labels: ['pattern', 'depth'],
  },
  traversalDuration: {
    name: 'graph_traversal_duration_seconds',
    type: 'histogram',
    unit: 's',
    description: 'Graph traversal duration in seconds',
    labels: ['pattern', 'depth'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
  },
  nodesVisited: {
    name: 'graph_nodes_visited',
    type: 'histogram',
    unit: 'count',
    description: 'Number of nodes visited per traversal',
    labels: ['pattern'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  },
  relationshipsFollowed: {
    name: 'graph_relationships_followed',
    type: 'histogram',
    unit: 'count',
    description: 'Number of relationships followed per traversal',
    labels: ['pattern'],
    buckets: [1, 5, 10, 25, 50, 100, 250, 500, 1000],
  },
};

/**
 * Cache metrics
 */
export const CacheMetrics: Record<string, MetricDefinition> = {
  hits: {
    name: 'cache_hits_total',
    type: 'counter',
    unit: 'count',
    description: 'Total number of cache hits',
    labels: [StandardLabels.CACHE_LAYER],
  },
  misses: {
    name: 'cache_misses_total',
    type: 'counter',
    unit: 'count',
    description: 'Total number of cache misses',
    labels: [StandardLabels.CACHE_LAYER],
  },
  hitRate: {
    name: 'cache_hit_rate',
    type: 'gauge',
    unit: 'ratio',
    description: 'Cache hit rate (0-1)',
    labels: [StandardLabels.CACHE_LAYER],
  },
  size: {
    name: 'cache_size',
    type: 'gauge',
    unit: 'count',
    description: 'Number of items in cache',
    labels: [StandardLabels.CACHE_LAYER],
  },
  evictions: {
    name: 'cache_evictions_total',
    type: 'counter',
    unit: 'count',
    description: 'Total number of cache evictions',
    labels: [StandardLabels.CACHE_LAYER],
  },
};

/**
 * Business metrics for Summit platform
 */
export const BusinessMetrics: Record<string, MetricDefinition> = {
  entitiesCreated: {
    name: 'summit_entities_created_total',
    type: 'counter',
    unit: 'count',
    description: 'Total number of entities created',
    labels: [StandardLabels.ENTITY_TYPE],
  },
  investigationsStarted: {
    name: 'summit_investigations_started_total',
    type: 'counter',
    unit: 'count',
    description: 'Total number of investigations started',
    labels: [StandardLabels.INVESTIGATION_TYPE],
  },
  investigationsDuration: {
    name: 'summit_investigation_duration_seconds',
    type: 'histogram',
    unit: 's',
    description: 'Duration of investigations in seconds',
    labels: [StandardLabels.INVESTIGATION_TYPE],
    buckets: [60, 300, 900, 1800, 3600, 7200, 14400, 28800],
  },
  copilotRequests: {
    name: 'summit_copilot_requests_total',
    type: 'counter',
    unit: 'count',
    description: 'Total number of copilot requests',
    labels: ['action_type'],
  },
  copilotLatency: {
    name: 'summit_copilot_latency_seconds',
    type: 'histogram',
    unit: 's',
    description: 'Copilot request latency in seconds',
    labels: ['action_type'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
  },
  searchQueries: {
    name: 'summit_search_queries_total',
    type: 'counter',
    unit: 'count',
    description: 'Total number of search queries',
    labels: ['query_type'],
  },
  searchLatency: {
    name: 'summit_search_latency_seconds',
    type: 'histogram',
    unit: 's',
    description: 'Search query latency in seconds',
    labels: ['query_type'],
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2.5],
  },
  activeUsers: {
    name: 'summit_active_users',
    type: 'gauge',
    unit: 'count',
    description: 'Number of active users',
    labels: [StandardLabels.USER_TYPE],
  },
};

/**
 * Runtime metrics
 */
export const RuntimeMetrics: Record<string, MetricDefinition> = {
  processMemoryHeapUsed: {
    name: 'process_memory_heap_used_bytes',
    type: 'gauge',
    unit: 'bytes',
    description: 'Process heap memory used',
    labels: [],
  },
  processMemoryHeapTotal: {
    name: 'process_memory_heap_total_bytes',
    type: 'gauge',
    unit: 'bytes',
    description: 'Process heap memory total',
    labels: [],
  },
  processMemoryRss: {
    name: 'process_memory_rss_bytes',
    type: 'gauge',
    unit: 'bytes',
    description: 'Process resident set size',
    labels: [],
  },
  processCpuUsage: {
    name: 'process_cpu_usage_percent',
    type: 'gauge',
    unit: 'percent',
    description: 'Process CPU usage percentage',
    labels: [],
  },
  eventLoopLag: {
    name: 'nodejs_eventloop_lag_seconds',
    type: 'gauge',
    unit: 's',
    description: 'Event loop lag in seconds',
    labels: [],
  },
  activeHandles: {
    name: 'nodejs_active_handles',
    type: 'gauge',
    unit: 'count',
    description: 'Number of active handles',
    labels: [],
  },
};

/**
 * All metrics taxonomy
 */
export const MetricsTaxonomy = {
  http: HTTPMetrics,
  database: DatabaseMetrics,
  graph: GraphMetrics,
  cache: CacheMetrics,
  business: BusinessMetrics,
  runtime: RuntimeMetrics,
};

/**
 * Get all metric definitions as a flat array
 */
export function getAllMetrics(): MetricDefinition[] {
  return Object.values(MetricsTaxonomy).flatMap((category) => Object.values(category));
}

/**
 * Get metric by name
 */
export function getMetricByName(name: string): MetricDefinition | undefined {
  for (const category of Object.values(MetricsTaxonomy)) {
    for (const metric of Object.values(category)) {
      if (metric.name === name) {
        return metric;
      }
    }
  }
  return undefined;
}
