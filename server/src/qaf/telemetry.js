"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROITelemetry = void 0;
const metrics_js_1 = require("../utils/metrics.js");
class ROITelemetry {
    static instance;
    promMetrics;
    metrics = {
        velocityGain: 0,
        contextSwitchesReduced: 0,
        complianceScore: 100,
        tasksCompleted: 0,
        uptime: 100,
    };
    constructor() {
        this.promMetrics = new metrics_js_1.PrometheusMetrics('summit_qaf'); // Namespace matches dashboard prefix
        // Initialize Prometheus definitions
        this.promMetrics.createGauge('velocity_gain', 'Percentage gain in development velocity');
        this.promMetrics.createGauge('context_switch_reduction', 'Percentage reduction in context switches');
        this.promMetrics.createGauge('compliance_score', 'Current compliance score (0-100)');
        this.promMetrics.createCounter('tasks_completed', 'Total number of agent tasks completed');
        this.promMetrics.createGauge('secure_agents', 'Number of quantum-secure agents');
        this.promMetrics.createGauge('total_agents', 'Total number of active agents');
    }
    static getInstance() {
        if (!ROITelemetry.instance) {
            ROITelemetry.instance = new ROITelemetry();
        }
        return ROITelemetry.instance;
    }
    recordTaskCompletion(durationMs, success) {
        this.metrics.tasksCompleted++;
        this.promMetrics.incrementCounter('tasks_completed');
        // Simulate velocity gain calculation
        this.metrics.velocityGain = Math.min(15, this.metrics.velocityGain + 0.1);
        this.promMetrics.setGauge('velocity_gain', this.metrics.velocityGain);
    }
    updateContextSwitches(reduction) {
        this.metrics.contextSwitchesReduced = reduction;
        this.promMetrics.setGauge('context_switch_reduction', reduction);
    }
    recordComplianceCheck(passed) {
        if (!passed) {
            this.metrics.complianceScore = Math.max(0, this.metrics.complianceScore - 5);
        }
        else {
            this.metrics.complianceScore = Math.min(100, this.metrics.complianceScore + 1);
        }
        this.promMetrics.setGauge('compliance_score', this.metrics.complianceScore);
    }
    updateAgentCounts(total, secure) {
        this.promMetrics.setGauge('total_agents', total);
        this.promMetrics.setGauge('secure_agents', secure);
    }
    getMetrics() {
        return { ...this.metrics };
    }
    async generateReport() {
        return JSON.stringify(this.metrics, null, 2);
    }
}
exports.ROITelemetry = ROITelemetry;
