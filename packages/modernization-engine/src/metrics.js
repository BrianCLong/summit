"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.predictiveRiskGauge = exports.boundaryViolationCounter = exports.registry = void 0;
exports.serializeMetrics = serializeMetrics;
const prom_client_1 = require("prom-client");
exports.registry = new prom_client_1.Registry();
exports.boundaryViolationCounter = new prom_client_1.Counter({
    name: 'domain_boundary_violations_total',
    help: 'Counts domain boundary violations by source, target, and type',
    labelNames: ['source_domain', 'target_domain', 'type'],
    registers: [exports.registry],
});
exports.predictiveRiskGauge = new prom_client_1.Counter({
    name: 'predictive_risk_alerts_total',
    help: 'Counts predictive risk alerts emitted by the risk engine',
    labelNames: ['domain', 'severity'],
    registers: [exports.registry],
});
function serializeMetrics() {
    return exports.registry.metrics();
}
