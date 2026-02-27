import { Counter, Gauge, Registry } from 'prom-client';

/**
 * Prometheus metrics for IntelGraph cost guardrails.
 *
 * All metrics use the 'intelgraph_' prefix for namespace clarity.
 */

/** Shared registry for cost-related metrics */
export const costRegistry = new Registry();

/** Total API calls, labeled by tenant, operation, and HTTP status */
export const apiCallsTotal = new Counter({
  name: 'intelgraph_api_calls_total',
  help: 'Total number of API calls',
  labelNames: ['tenant', 'operation', 'status'] as const,
  registers: [costRegistry],
});

/** Total ingest events, labeled by connector, tenant, and processing status */
export const ingestEventsTotal = new Counter({
  name: 'intelgraph_ingest_events_total',
  help: 'Total number of ingest events processed',
  labelNames: ['connector', 'tenant', 'status'] as const,
  registers: [costRegistry],
});

/** Total graph traversals, labeled by hop depth and tenant */
export const graphTraversalsTotal = new Counter({
  name: 'intelgraph_graph_traversals_total',
  help: 'Total number of graph traversals',
  labelNames: ['hops', 'tenant'] as const,
  registers: [costRegistry],
});

/** Accumulated cost in USD, labeled by operation and tenant */
export const costUsdTotal = new Counter({
  name: 'intelgraph_cost_usd_total',
  help: 'Accumulated cost in USD',
  labelNames: ['operation', 'tenant'] as const,
  registers: [costRegistry],
});

/** Budget utilization ratio (0.0 - 1.0+), labeled by environment */
export const budgetUtilizationRatio = new Gauge({
  name: 'intelgraph_budget_utilization_ratio',
  help: 'Current budget utilization ratio (spent / budget)',
  labelNames: ['environment'] as const,
  registers: [costRegistry],
});

/** Daily cost in USD, labeled by environment and date */
export const dailyCostUsd = new Gauge({
  name: 'intelgraph_daily_cost_usd',
  help: 'Daily cost in USD',
  labelNames: ['environment', 'date'] as const,
  registers: [costRegistry],
});
