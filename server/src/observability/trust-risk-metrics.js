"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.riskSignalsTotal = exports.trustScoreGauge = void 0;
exports.recordTrustScore = recordTrustScore;
exports.recordRiskSignal = recordRiskSignal;
const prom_client_1 = require("prom-client");
const registry_js_1 = require("../metrics/registry.js");
exports.trustScoreGauge = new prom_client_1.Gauge({
    name: 'intelgraph_trust_score',
    help: 'Current trust score per subject',
    labelNames: ['subject'],
    registers: [registry_js_1.registry],
});
exports.riskSignalsTotal = new prom_client_1.Counter({
    name: 'intelgraph_risk_signals_total',
    help: 'Total risk signals raised',
    labelNames: ['tenant', 'kind', 'severity', 'source'],
    registers: [registry_js_1.registry],
});
function recordTrustScore(subjectId, score) {
    if (Number.isFinite(score))
        exports.trustScoreGauge.set({ subject: subjectId }, score);
}
function recordRiskSignal(opts) {
    exports.riskSignalsTotal.inc({
        tenant: opts.tenantId,
        kind: opts.kind,
        severity: opts.severity,
        source: opts.source,
    });
}
