"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.erMetrics = exports.ERMetrics = void 0;
const metrics_js_1 = require("../utils/metrics.js");
class ERMetrics {
    static instance;
    metrics;
    constructor() {
        this.metrics = new metrics_js_1.PrometheusMetrics('entity_resolution');
        this.metrics.createCounter('matches_total', 'Total matches found', ['confidence']);
        this.metrics.createCounter('merges_total', 'Total entities merged', []);
        this.metrics.createGauge('precision', 'ER Precision on Golden Set', ['dataset']);
        this.metrics.createGauge('recall', 'ER Recall on Golden Set', ['dataset']);
    }
    static getInstance() {
        if (!ERMetrics.instance) {
            ERMetrics.instance = new ERMetrics();
        }
        return ERMetrics.instance;
    }
    recordMatch(confidence) {
        this.metrics.incrementCounter('matches_total', { confidence });
    }
    recordMerge() {
        this.metrics.incrementCounter('merges_total');
    }
    updateGoldenMetrics(dataset, precision, recall) {
        this.metrics.setGauge('precision', precision, { dataset });
        this.metrics.setGauge('recall', recall, { dataset });
    }
}
exports.ERMetrics = ERMetrics;
exports.erMetrics = ERMetrics.getInstance();
