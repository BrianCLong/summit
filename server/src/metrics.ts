import client from 'prom-client';
export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });
export const gqlDuration = new client.Histogram({
  name: 'graphql_request_duration_seconds',
  help: 'GraphQL duration',
  buckets: [0.05, 0.1, 0.2, 0.35, 0.7, 1, 1.5, 3],
});
registry.registerMetric(gqlDuration);

export const subscriptionFanoutLatency = new client.Histogram({
  name: 'subscription_fanout_latency_ms',
  help: 'Subscription fan-out latency in milliseconds',
  buckets: [10, 50, 100, 250, 500, 1000],
});
registry.registerMetric(subscriptionFanoutLatency);

export const ingestDedupeRate = new client.Gauge({
  name: 'ingest_dedupe_rate',
  help: 'Rate of deduplicated ingest events',
});
registry.registerMetric(ingestDedupeRate);

export const ingestBacklog = new client.Gauge({
  name: 'ingest_backlog',
  help: 'Current ingest backlog size',
});
registry.registerMetric(ingestBacklog);
