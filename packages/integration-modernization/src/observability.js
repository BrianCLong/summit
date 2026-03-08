"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConnectorObservability = void 0;
const prom_client_1 = require("prom-client");
class ConnectorObservability {
    registry;
    latency;
    failures;
    throughput;
    lastSuccess;
    health = new Map();
    constructor() {
        this.registry = new prom_client_1.Registry();
        (0, prom_client_1.collectDefaultMetrics)({ register: this.registry });
        this.latency = new prom_client_1.Histogram({
            name: 'connector_latency_seconds',
            help: 'Latency per connector operation',
            labelNames: ['connectorId']
        });
        this.failures = new prom_client_1.Counter({
            name: 'connector_failures_total',
            help: 'Count of connector failures',
            labelNames: ['connectorId']
        });
        this.throughput = new prom_client_1.Counter({
            name: 'connector_success_total',
            help: 'Successful connector operations',
            labelNames: ['connectorId']
        });
        this.lastSuccess = new prom_client_1.Gauge({
            name: 'connector_last_success_timestamp',
            help: 'Last success timestamp per connector',
            labelNames: ['connectorId']
        });
        this.registry.registerMetric(this.latency);
        this.registry.registerMetric(this.failures);
        this.registry.registerMetric(this.throughput);
        this.registry.registerMetric(this.lastSuccess);
    }
    recordSuccess(connectorId, latencyMs) {
        this.latency.labels(connectorId).observe(latencyMs / 1000);
        this.throughput.labels(connectorId).inc();
        this.lastSuccess.labels(connectorId).set(Date.now());
        this.health.set(connectorId, 'connected');
    }
    recordFailure(connectorId) {
        this.failures.labels(connectorId).inc();
        const current = this.health.get(connectorId);
        if (!current || current === 'connected') {
            this.health.set(connectorId, 'degraded');
        }
        else {
            this.health.set(connectorId, 'failing');
        }
    }
    pause(connectorId) {
        this.health.set(connectorId, 'paused');
    }
    getHealth(connectorId) {
        return this.health.get(connectorId) ?? 'degraded';
    }
    metrics() {
        return this.registry.metrics();
    }
}
exports.ConnectorObservability = ConnectorObservability;
