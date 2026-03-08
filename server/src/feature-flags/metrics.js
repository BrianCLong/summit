"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.killSwitchGauge = exports.featureFlagDecisions = exports.featureFlagLatency = void 0;
exports.ensureMetricsRegistered = ensureMetricsRegistered;
const prom_client_1 = require("prom-client");
exports.featureFlagLatency = new prom_client_1.Histogram({
    name: 'feature_flag_evaluation_duration_seconds',
    help: 'Latency of OPA-backed feature flag evaluations',
    buckets: [0.01, 0.05, 0.1, 0.25, 0.5, 1, 2, 5],
    labelNames: ['flag', 'source', 'outcome'],
});
exports.featureFlagDecisions = new prom_client_1.Counter({
    name: 'feature_flag_decisions_total',
    help: 'Total feature flag decisions emitted by the runtime SDK',
    labelNames: ['flag', 'source', 'outcome'],
});
exports.killSwitchGauge = new prom_client_1.Gauge({
    name: 'feature_kill_switch_active',
    help: 'Indicates whether a kill switch is active for a module',
    labelNames: ['module'],
});
function ensureMetricsRegistered() {
    if (!prom_client_1.register.getSingleMetric(exports.featureFlagLatency.name)) {
        prom_client_1.register.registerMetric(exports.featureFlagLatency);
    }
    if (!prom_client_1.register.getSingleMetric(exports.featureFlagDecisions.name)) {
        prom_client_1.register.registerMetric(exports.featureFlagDecisions);
    }
    if (!prom_client_1.register.getSingleMetric(exports.killSwitchGauge.name)) {
        prom_client_1.register.registerMetric(exports.killSwitchGauge);
    }
}
