import client from 'prom-client';

/**
 * The Prometheus metrics registry.
 */
export const registry = new client.Registry();

// Collect default metrics (CPU, memory, etc.)
client.collectDefaultMetrics({ register: registry });

/**
 * Histogram metric for tracking GraphQL request duration.
 */
export const gqlDuration = new client.Histogram({
  name: 'graphql_request_duration_seconds',
  help: 'GraphQL duration',
  buckets: [0.05, 0.1, 0.2, 0.35, 0.7, 1, 1.5, 3],
});
registry.registerMetric(gqlDuration);

/**
 * Histogram metric for tracking subscription fan-out latency.
 */
export const subscriptionFanoutLatency = new client.Histogram({
  name: 'subscription_fanout_latency_ms',
  help: 'Subscription fan-out latency in milliseconds',
  buckets: [10, 50, 100, 250, 500, 1000],
});
registry.registerMetric(subscriptionFanoutLatency);

/**
 * Gauge metric for tracking the rate of deduplicated ingest events.
 */
export const ingestDedupeRate = new client.Gauge({
  name: 'ingest_dedupe_rate',
  help: 'Rate of deduplicated ingest events',
});
registry.registerMetric(ingestDedupeRate);

/**
 * Gauge metric for tracking the current size of the ingest backlog.
 */
export const ingestBacklog = new client.Gauge({
  name: 'ingest_backlog',
  help: 'Current ingest backlog size',
});
registry.registerMetric(ingestBacklog);
