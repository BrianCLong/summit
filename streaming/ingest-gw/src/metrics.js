"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.recordIngest = recordIngest;
exports.startProduceTimer = startProduceTimer;
exports.metricsSnapshot = metricsSnapshot;
const prom_client_1 = require("prom-client");
const registry = new prom_client_1.Registry();
(0, prom_client_1.collectDefaultMetrics)({ register: registry });
const ingestEventsTotal = new prom_client_1.Counter({
    name: 'ingest_events_total',
    help: 'Count of events received by the ingest gateway.',
    labelNames: ['result'],
    registers: [registry],
});
const ingestProduceDurationSeconds = new prom_client_1.Histogram({
    name: 'ingest_produce_duration_seconds',
    help: 'Time spent producing events to the downstream topic.',
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    registers: [registry],
});
function recordIngest(result) {
    ingestEventsTotal.labels(result).inc();
}
function startProduceTimer() {
    return ingestProduceDurationSeconds.startTimer();
}
async function metricsSnapshot() {
    return registry.metrics();
}
