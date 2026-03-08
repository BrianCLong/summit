"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metrics = exports.registry = void 0;
const prom_client_1 = require("prom-client");
exports.registry = new prom_client_1.Registry();
exports.registry.setDefaultLabels({
    service: 'ai-sandbox',
});
exports.metrics = {
    experimentsSubmitted: new prom_client_1.Counter({
        name: 'ai_sandbox_experiments_submitted_total',
        help: 'Total number of experiments submitted',
        registers: [exports.registry],
    }),
    experimentsCompleted: new prom_client_1.Counter({
        name: 'ai_sandbox_experiments_completed_total',
        help: 'Total number of experiments completed',
        labelNames: ['status'],
        registers: [exports.registry],
    }),
    experimentDuration: new prom_client_1.Histogram({
        name: 'ai_sandbox_experiment_duration_ms',
        help: 'Duration of experiment execution in milliseconds',
        buckets: [100, 500, 1000, 5000, 10000, 30000, 60000],
        registers: [exports.registry],
    }),
    queueDepth: new prom_client_1.Gauge({
        name: 'ai_sandbox_queue_depth',
        help: 'Current number of experiments in queue',
        labelNames: ['state'],
        registers: [exports.registry],
    }),
    policyViolations: new prom_client_1.Counter({
        name: 'ai_sandbox_policy_violations_total',
        help: 'Total number of policy violations detected',
        labelNames: ['framework', 'severity'],
        registers: [exports.registry],
    }),
    sandboxExecutions: new prom_client_1.Counter({
        name: 'ai_sandbox_executions_total',
        help: 'Total sandbox code executions',
        labelNames: ['status'],
        registers: [exports.registry],
    }),
};
