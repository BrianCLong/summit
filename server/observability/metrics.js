"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sdk = exports.recordPolicyMetrics = exports.recordSecurityMetrics = exports.recordTestMetrics = exports.recordPRMetrics = exports.recordTaskMetrics = exports.maestroMetrics = void 0;
const sdk_node_1 = require("@opentelemetry/sdk-node");
const auto_instrumentations_node_1 = require("@opentelemetry/auto-instrumentations-node");
const exporter_prometheus_1 = require("@opentelemetry/exporter-prometheus");
const resources_1 = require("@opentelemetry/resources");
const semantic_conventions_1 = require("@opentelemetry/semantic-conventions");
const exporter_jaeger_1 = require("@opentelemetry/exporter-jaeger");
const api_1 = require("@opentelemetry/api");
const logger_js_1 = require("../utils/logger.js");
// Initialize OpenTelemetry SDK
const sdk = new sdk_node_1.NodeSDK({
    resource: new resources_1.Resource({
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAME]: 'maestro-conductor-v03',
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_VERSION]: process.env.npm_package_version || '0.3.0',
        [semantic_conventions_1.SemanticResourceAttributes.SERVICE_NAMESPACE]: 'intelgraph',
    }),
    traceExporter: new exporter_jaeger_1.JaegerExporter({
        endpoint: process.env.JAEGER_ENDPOINT || 'http://localhost:14268/api/traces',
    }),
    metricReader: new exporter_prometheus_1.PrometheusExporter({
        port: parseInt(process.env.PROMETHEUS_PORT || '9464'),
    }),
    instrumentations: [
        (0, auto_instrumentations_node_1.getNodeAutoInstrumentations)({
            '@opentelemetry/instrumentation-http': {
                enabled: true,
                ignoreIncomingRequestHook: (req) => {
                    return req.url?.includes('/health') || req.url?.includes('/metrics');
                },
            },
            '@opentelemetry/instrumentation-express': { enabled: true },
            '@opentelemetry/instrumentation-redis': { enabled: true },
            '@opentelemetry/instrumentation-pg': { enabled: true },
        }),
    ],
});
exports.sdk = sdk;
// Initialize SDK
sdk.start();
logger_js_1.logger.info('OpenTelemetry initialized');
// Custom metrics
const meter = api_1.metrics.getMeter('maestro-conductor', '0.3.0');
exports.maestroMetrics = {
    // Agent task metrics
    taskStarted: meter.createCounter('maestro_tasks_started_total', {
        description: 'Total number of agent tasks started',
    }),
    taskCompleted: meter.createCounter('maestro_tasks_completed_total', {
        description: 'Total number of agent tasks completed',
    }),
    taskFailed: meter.createCounter('maestro_tasks_failed_total', {
        description: 'Total number of agent tasks failed',
    }),
    taskDuration: meter.createHistogram('maestro_task_duration_seconds', {
        description: 'Duration of agent tasks in seconds',
        boundaries: [0.1, 0.5, 1, 2, 5, 10, 30, 60, 300],
    }),
    // LLM cost tracking
    llmCost: meter.createHistogram('maestro_llm_cost_usd', {
        description: 'LLM API cost in USD',
        boundaries: [0.001, 0.01, 0.1, 1, 5, 10, 25, 50, 100],
    }),
    llmTokens: meter.createCounter('maestro_llm_tokens_total', {
        description: 'Total LLM tokens consumed',
    }),
    // PR metrics
    prProcessed: meter.createCounter('maestro_prs_processed_total', {
        description: 'Total PRs processed by Maestro',
    }),
    prLeadTime: meter.createHistogram('maestro_pr_lead_time_hours', {
        description: 'PR lead time from open to merge in hours',
        boundaries: [0.5, 1, 2, 4, 8, 16, 24, 48, 72, 168],
    }),
    // CI/CD metrics
    pipelineDuration: meter.createHistogram('maestro_pipeline_duration_seconds', {
        description: 'CI pipeline duration in seconds',
        boundaries: [30, 60, 120, 300, 600, 900, 1800, 3600],
    }),
    buildCacheHit: meter.createCounter('maestro_build_cache_hits_total', {
        description: 'Build cache hits',
    }),
    buildCacheMiss: meter.createCounter('maestro_build_cache_misses_total', {
        description: 'Build cache misses',
    }),
    // Test metrics
    testsRun: meter.createCounter('maestro_tests_run_total', {
        description: 'Total tests executed',
    }),
    testsPassed: meter.createCounter('maestro_tests_passed_total', {
        description: 'Total tests passed',
    }),
    testsFailed: meter.createCounter('maestro_tests_failed_total', {
        description: 'Total tests failed',
    }),
    testFlakes: meter.createCounter('maestro_test_flakes_total', {
        description: 'Total test flakes detected',
    }),
    // Security metrics
    securityIssues: meter.createCounter('maestro_security_issues_total', {
        description: 'Security issues detected',
    }),
    vulnerabilitiesFound: meter.createCounter('maestro_vulnerabilities_total', {
        description: 'Vulnerabilities found in dependencies',
    }),
    // Policy metrics
    policyViolations: meter.createCounter('maestro_policy_violations_total', {
        description: 'Policy violations detected',
    }),
    policyBlocks: meter.createCounter('maestro_policy_blocks_total', {
        description: 'Tasks blocked by policy',
    }),
    // Queue metrics
    queueSize: meter.createUpDownCounter('maestro_queue_size', {
        description: 'Current queue size',
    }),
    queueWaitTime: meter.createHistogram('maestro_queue_wait_seconds', {
        description: 'Time jobs wait in queue',
        boundaries: [1, 5, 10, 30, 60, 300, 600, 1800],
    }),
    // DORA metrics
    deploymentFrequency: meter.createCounter('maestro_deployments_total', {
        description: 'Total deployments',
    }),
    changeFailureRate: meter.createHistogram('maestro_change_failure_rate', {
        description: 'Percentage of deployments causing failures',
        boundaries: [0, 5, 10, 15, 20, 25, 50, 75, 100],
    }),
    recoveryTime: meter.createHistogram('maestro_mttr_hours', {
        description: 'Mean time to recovery in hours',
        boundaries: [0.5, 1, 2, 4, 8, 24, 48, 168],
    }),
};
// Convenience functions for common metric recording patterns
const recordTaskMetrics = (taskKind, status, durationSeconds, cost) => {
    const labels = { task_kind: taskKind };
    switch (status) {
        case 'started':
            exports.maestroMetrics.taskStarted.add(1, labels);
            break;
        case 'completed':
            exports.maestroMetrics.taskCompleted.add(1, labels);
            if (durationSeconds !== undefined) {
                exports.maestroMetrics.taskDuration.record(durationSeconds, labels);
            }
            if (cost !== undefined) {
                exports.maestroMetrics.llmCost.record(cost, labels);
            }
            break;
        case 'failed':
            exports.maestroMetrics.taskFailed.add(1, labels);
            if (durationSeconds !== undefined) {
                exports.maestroMetrics.taskDuration.record(durationSeconds, labels);
            }
            break;
    }
};
exports.recordTaskMetrics = recordTaskMetrics;
const recordPRMetrics = (prNumber, leadTimeHours, status) => {
    const labels = { pr: prNumber.toString() };
    if (status) {
        exports.maestroMetrics.prProcessed.add(1, { ...labels, status });
    }
    if (leadTimeHours !== undefined) {
        exports.maestroMetrics.prLeadTime.record(leadTimeHours, labels);
    }
};
exports.recordPRMetrics = recordPRMetrics;
const recordTestMetrics = (testsRun, testsPassed, testsFailed, flakes = 0, suite) => {
    const labels = suite ? { suite } : {};
    exports.maestroMetrics.testsRun.add(testsRun, labels);
    exports.maestroMetrics.testsPassed.add(testsPassed, labels);
    exports.maestroMetrics.testsFailed.add(testsFailed, labels);
    if (flakes > 0) {
        exports.maestroMetrics.testFlakes.add(flakes, labels);
    }
};
exports.recordTestMetrics = recordTestMetrics;
const recordSecurityMetrics = (issuesFound, vulnerabilities, severity) => {
    const labels = severity ? { severity } : {};
    exports.maestroMetrics.securityIssues.add(issuesFound, labels);
    exports.maestroMetrics.vulnerabilitiesFound.add(vulnerabilities, labels);
};
exports.recordSecurityMetrics = recordSecurityMetrics;
const recordPolicyMetrics = (violations, blocks, policyName) => {
    const labels = policyName ? { policy: policyName } : {};
    exports.maestroMetrics.policyViolations.add(violations, labels);
    exports.maestroMetrics.policyBlocks.add(blocks, labels);
};
exports.recordPolicyMetrics = recordPolicyMetrics;
// Graceful shutdown
process.on('SIGTERM', async () => {
    try {
        await sdk.shutdown();
        logger_js_1.logger.info('OpenTelemetry SDK shut down successfully');
    }
    catch (error) {
        logger_js_1.logger.error('Error shutting down OpenTelemetry SDK', error);
    }
});
