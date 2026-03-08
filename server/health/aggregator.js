"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getHealthScore = void 0;
const ci_signal_js_1 = require("./ci-signal.js");
const p95_latency_js_1 = require("./p95-latency.js");
const graph_consistency_js_1 = require("./graph-consistency.js");
const error_taxonomies_js_1 = require("./error-taxonomies.js");
const secret_drift_js_1 = require("./secret-drift.js");
const predictive_anomaly_detection_js_1 = require("./predictive-anomaly-detection.js");
const getHealthScore = async () => {
    const ciSignal = await (0, ci_signal_js_1.getCiSignal)();
    const p95Latency = await (0, p95_latency_js_1.getP95Latency)();
    const graphConsistency = await (0, graph_consistency_js_1.getGraphConsistency)();
    const errorTaxonomies = await (0, error_taxonomies_js_1.getErrorTaxonomies)();
    const secretDrift = await (0, secret_drift_js_1.getSecretDrift)();
    const predictiveAnomalyDetection = await (0, predictive_anomaly_detection_js_1.getPredictiveAnomalyDetection)();
    const scores = [
        ciSignal.score,
        p95Latency.score,
        graphConsistency.score,
        errorTaxonomies.score,
        secretDrift.score,
        predictiveAnomalyDetection.score,
    ];
    const totalScore = scores.reduce((acc, score) => acc + score, 0);
    const healthScore = totalScore / scores.length;
    return {
        healthScore,
        ciSignal,
        p95Latency,
        graphConsistency,
        errorTaxonomies,
        secretDrift,
        predictiveAnomalyDetection,
    };
};
exports.getHealthScore = getHealthScore;
