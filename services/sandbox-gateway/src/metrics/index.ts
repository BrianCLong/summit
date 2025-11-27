import { Counter, Histogram, Gauge, Registry, collectDefaultMetrics } from 'prom-client';

// Create a custom registry
export const registry = new Registry();

// Collect default metrics
collectDefaultMetrics({ register: registry });

// Resolver metrics
export const resolverDuration = new Histogram({
  name: 'sandbox_gateway_resolver_duration_seconds',
  help: 'Duration of GraphQL resolver execution',
  labelNames: ['resolver'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry],
});

export const resolverCalls = new Counter({
  name: 'sandbox_gateway_resolver_calls_total',
  help: 'Total number of GraphQL resolver calls',
  labelNames: ['resolver', 'status'],
  registers: [registry],
});

// Sandbox metrics
export const sandboxCreated = new Counter({
  name: 'sandbox_created_total',
  help: 'Total number of sandboxes created',
  labelNames: ['isolation_level'],
  registers: [registry],
});

export const sandboxStatusChange = new Counter({
  name: 'sandbox_status_change_total',
  help: 'Total number of sandbox status changes',
  labelNames: ['from', 'to'],
  registers: [registry],
});

export const activeSandboxes = new Gauge({
  name: 'sandbox_active_count',
  help: 'Number of currently active sandboxes',
  labelNames: ['isolation_level'],
  registers: [registry],
});

// Data Lab metrics
export const dataCloneOperations = new Counter({
  name: 'datalab_clone_operations_total',
  help: 'Total number of data clone operations',
  labelNames: ['strategy', 'status'],
  registers: [registry],
});

export const syntheticDataGenerated = new Counter({
  name: 'datalab_synthetic_data_generated_total',
  help: 'Total number of synthetic data generation operations',
  labelNames: ['status'],
  registers: [registry],
});

export const dataCloneDuration = new Histogram({
  name: 'datalab_clone_duration_seconds',
  help: 'Duration of data clone operations',
  labelNames: ['strategy'],
  buckets: [0.1, 0.5, 1, 5, 10, 30, 60, 120],
  registers: [registry],
});

// Enforcement metrics
export const enforcementDecisions = new Counter({
  name: 'sandbox_enforcement_decisions_total',
  help: 'Total number of enforcement decisions',
  labelNames: ['operation', 'allowed'],
  registers: [registry],
});

export const linkbackAttempts = new Counter({
  name: 'sandbox_linkback_attempts_total',
  help: 'Total number of linkback attempts (always blocked)',
  labelNames: ['sandbox_id'],
  registers: [registry],
});

// Promotion metrics
export const promotionRequests = new Counter({
  name: 'sandbox_promotion_requests_total',
  help: 'Total number of promotion requests',
  labelNames: ['status'],
  registers: [registry],
});

export const promotionExecuted = new Counter({
  name: 'sandbox_promotion_executed_total',
  help: 'Total number of promotions executed',
  labelNames: ['status'],
  registers: [registry],
});

// HTTP metrics
export const httpRequestDuration = new Histogram({
  name: 'sandbox_gateway_http_request_duration_seconds',
  help: 'Duration of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry],
});

export const httpRequestsTotal = new Counter({
  name: 'sandbox_gateway_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status'],
  registers: [registry],
});

// Export all metrics
export const metrics = {
  resolverDuration,
  resolverCalls,
  sandboxCreated,
  sandboxStatusChange,
  activeSandboxes,
  dataCloneOperations,
  syntheticDataGenerated,
  dataCloneDuration,
  enforcementDecisions,
  linkbackAttempts,
  promotionRequests,
  promotionExecuted,
  httpRequestDuration,
  httpRequestsTotal,
  registry,
};
