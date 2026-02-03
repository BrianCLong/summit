import * as promClient from 'prom-client';
import { register } from '../monitoring/metrics.js';

const client: any = (promClient as any).default || promClient;

function createHistogram(config: any) {
    try {
        return new client.Histogram(config);
    } catch (e) {
        return {
            observe: () => {},
            startTimer: () => () => {},
            labels: () => ({ observe: () => {} }),
            reset: () => {}
        } as any;
    }
}

function createCounter(config: any) {
    try {
        return new client.Counter(config);
    } catch (e) {
        return {
            inc: () => {},
            labels: () => ({ inc: () => {} }),
            reset: () => {}
        } as any;
    }
}

function createGauge(config: any) {
    try {
        return new client.Gauge(config);
    } catch (e) {
        return {
            inc: () => {},
            dec: () => {},
            set: () => {},
            labels: () => ({ inc: () => {}, dec: () => {}, set: () => {} }),
            reset: () => {}
        } as any;
    }
}

export const neo4jQueryTotal = createCounter({
  name: 'neo4j_query_total',
  help: 'Total number of Neo4j queries executed',
  labelNames: ['operation', 'label', 'tenant_id'],
});

export const neo4jQueryErrorsTotal = createCounter({
  name: 'neo4j_query_errors_total',
  help: 'Total number of Neo4j query errors',
  labelNames: ['operation', 'label', 'tenant_id'],
});

export const neo4jQueryLatencyMs = createHistogram({
  name: 'neo4j_query_latency_ms',
  help: 'Latency of Neo4j queries in milliseconds',
  labelNames: ['operation', 'label', 'tenant_id'],
  buckets: [5, 10, 25, 50, 100, 250, 500, 1000, 2500, 5000, 10000],
});

export const neo4jConnectivityUp = createGauge({
  name: 'neo4j_connectivity_up',
  help: 'Neo4j connectivity status (1=up, 0=down)',
});

export const neo4jActiveConnections = createGauge({
  name: 'neo4j_active_connections',
  help: 'Number of active connections in the Neo4j pool',
});

export const neo4jIdleConnections = createGauge({
  name: 'neo4j_idle_connections',
  help: 'Number of idle connections in the Neo4j pool',
});

try {
register.registerMetric(neo4jQueryTotal);
register.registerMetric(neo4jQueryErrorsTotal);
register.registerMetric(neo4jQueryLatencyMs);
register.registerMetric(neo4jConnectivityUp);
register.registerMetric(neo4jActiveConnections);
register.registerMetric(neo4jIdleConnections);
} catch (e) {}
