import client from 'prom-client';

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

const LATENCY_BUCKETS_SECONDS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5];

export const gqlDuration = new client.Histogram({
  name: 'graphql_request_duration_seconds',
  help: 'GraphQL duration',
  buckets: LATENCY_BUCKETS_SECONDS,
  labelNames: ['op']
});
registry.registerMetric(gqlDuration);

export const graphQueryLatency = new client.Histogram({
  name: 'graph_query_latency_seconds',
  help: 'Latency for graph-backed resolvers and Cypher queries',
  buckets: LATENCY_BUCKETS_SECONDS,
  labelNames: ['operation', 'tenant_id', 'outcome']
});
registry.registerMetric(graphQueryLatency);

export const subscriptionFanoutLatency = new client.Histogram({
  name: 'subscription_fanout_latency_ms',
  help: 'Subscription fan-out latency in milliseconds',
  buckets: [10, 50, 100, 250, 500, 1000]
});
registry.registerMetric(subscriptionFanoutLatency);

export const ingestDedupeRate = new client.Gauge({
  name: 'ingest_dedupe_rate',
  help: 'Rate of deduplicated ingest events'
});
registry.registerMetric(ingestDedupeRate);

export const ingestBacklog = new client.Gauge({
  name: 'ingest_backlog',
  help: 'Current ingest backlog size'
});
registry.registerMetric(ingestBacklog);

export const erQueueDepth = new client.Gauge({
  name: 'er_queue_depth',
  help: 'Entity resolution queue depth by tenant',
  labelNames: ['tenant_id']
});
registry.registerMetric(erQueueDepth);

export const ingestPipelineDuration = new client.Histogram({
  name: 'ingest_pipeline_e2e_seconds',
  help: 'End-to-end ingest pipeline duration segmented by stage',
  buckets: LATENCY_BUCKETS_SECONDS,
  labelNames: ['tenant_id', 'source', 'stage']
});
registry.registerMetric(ingestPipelineDuration);

export const ingestE2eLatency = new client.Histogram({
  name: 'ingest_signal_lag_seconds',
  help: 'Lag between signal timestamp and persistence',
  buckets: LATENCY_BUCKETS_SECONDS,
  labelNames: ['tenant_id', 'source']
});
registry.registerMetric(ingestE2eLatency);

export const policyDecisionsTotal = new client.Counter({
  name: 'policy_decisions_total',
  help: 'Total OPA policy decisions by action and result',
  labelNames: ['tenant_id', 'action', 'result']
});
registry.registerMetric(policyDecisionsTotal);

export const policyDecisionLatency = new client.Histogram({
  name: 'policy_decision_latency_seconds',
  help: 'OPA policy decision latency in seconds',
  buckets: LATENCY_BUCKETS_SECONDS,
  labelNames: ['cached']
});
registry.registerMetric(policyDecisionLatency);

export const policyPurposeViolations = new client.Counter({
  name: 'purpose_violations_total',
  help: 'Total purpose limitation violations',
  labelNames: ['tenant_id', 'required_purpose', 'provided_purpose']
});
registry.registerMetric(policyPurposeViolations);

export const errorBudgetBurnRate = new client.Gauge({
  name: 'slo_error_budget_burn_rate',
  help: 'Rolling error budget burn rate (1.0 == on budget)',
  labelNames: ['service', 'slo', 'env', 'tenant_id']
});
registry.registerMetric(errorBudgetBurnRate);