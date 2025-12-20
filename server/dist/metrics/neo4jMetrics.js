import { Counter, Gauge, Histogram } from 'prom-client';
import { register } from '../monitoring/metrics.js';
export const neo4jQueryTotal = new Counter({
    name: 'neo4j_query_total',
    help: 'Total number of Neo4j queries executed',
    labelNames: ['operation', 'label'],
});
export const neo4jQueryErrorsTotal = new Counter({
    name: 'neo4j_query_errors_total',
    help: 'Total number of Neo4j query errors',
    labelNames: ['operation', 'label'],
});
export const neo4jQueryLatencyMs = new Histogram({
    name: 'neo4j_query_latency_ms',
    help: 'Latency of Neo4j queries in milliseconds',
    labelNames: ['operation', 'label'],
    buckets: [10, 20, 50, 100, 250, 500, 1000, 5000],
});
export const neo4jConnectivityUp = new Gauge({
    name: 'neo4j_connectivity_up',
    help: 'Neo4j connectivity status (1=up, 0=down)',
});
register.registerMetric(neo4jQueryTotal);
register.registerMetric(neo4jQueryErrorsTotal);
register.registerMetric(neo4jQueryLatencyMs);
register.registerMetric(neo4jConnectivityUp);
//# sourceMappingURL=neo4jMetrics.js.map