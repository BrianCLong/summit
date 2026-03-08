"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.clientConnected = clientConnected;
exports.clientDisconnected = clientDisconnected;
exports.recordAlertStreamed = recordAlertStreamed;
exports.recordStreamError = recordStreamError;
exports.metricsSnapshot = metricsSnapshot;
const prom_client_1 = require("prom-client");
const registry = new prom_client_1.Registry();
(0, prom_client_1.collectDefaultMetrics)({ register: registry });
const alertStreamClients = new prom_client_1.Gauge({
    name: 'alert_stream_clients',
    help: 'Current number of active SSE clients.',
    registers: [registry],
});
const alertsStreamedTotal = new prom_client_1.Counter({
    name: 'alerts_streamed_total',
    help: 'Total alerts delivered over SSE.',
    registers: [registry],
});
const alertStreamErrorsTotal = new prom_client_1.Counter({
    name: 'alert_stream_errors_total',
    help: 'Errors encountered while streaming alerts.',
    registers: [registry],
});
function clientConnected() {
    alertStreamClients.inc();
}
function clientDisconnected() {
    alertStreamClients.dec();
}
function recordAlertStreamed() {
    alertsStreamedTotal.inc();
}
function recordStreamError() {
    alertStreamErrorsTotal.inc();
}
async function metricsSnapshot() {
    return registry.metrics();
}
