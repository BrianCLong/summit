"use strict";
/**
 * Centralized metrics configuration
 * Re-exports from monitoring/metrics.js to maintain backward compatibility
 * while unifying the registry.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.narrativeSimulationTicksTotal = exports.narrativeSimulationActiveSimulations = exports.websocketConnections = exports.dbQueryDuration = exports.dbQueriesTotal = exports.stdHttpRequestDuration = exports.stdHttpRequestsTotal = exports.maestroMttrHours = exports.maestroChangeFailureRate = exports.maestroPrLeadTimeHours = exports.maestroDeploymentsTotal = exports.uiErrorBoundaryCatchTotal = exports.goldenPathStepTotal = exports.intelgraphGlassBoxCacheHits = exports.intelgraphGlassBoxRunDurationMs = exports.intelgraphGlassBoxRunsTotal = exports.intelgraphQueryPreviewExecutionsTotal = exports.intelgraphQueryPreviewErrorsTotal = exports.intelgraphQueryPreviewLatencyMs = exports.intelgraphQueryPreviewsTotal = exports.intelgraphGraphragQueryDurationMs = exports.intelgraphGraphragQueryTotal = exports.intelgraphHttpRequestDuration = exports.intelgraphDatabaseQueryDuration = exports.intelgraphActiveConnections = exports.intelgraphCacheMisses = exports.intelgraphCacheHits = exports.llmRequestDuration = exports.llmTokensTotal = exports.maestroJobExecutionDurationSeconds = exports.maestroDagExecutionDurationSeconds = exports.copilotApiRequestDurationMs = exports.copilotApiRequestTotal = exports.cacheMisses = exports.cacheHits = exports.glassBoxCacheHits = exports.glassBoxRunDurationMs = exports.glassBoxRunsTotal = exports.queryPreviewExecutionsTotal = exports.queryPreviewErrorsTotal = exports.queryPreviewLatencyMs = exports.queryPreviewsTotal = exports.graphragQueryDurationMs = exports.graphragQueryTotal = exports.httpRequestDuration = exports.databaseQueryDuration = exports.activeConnections = exports.outboxSyncLatency = exports.jobsProcessed = exports.registry = void 0;
exports.metrics = exports.summitHealthChecksTotal = exports.narrativeSimulationDurationSeconds = exports.narrativeSimulationEventsTotal = void 0;
const metrics_js_1 = require("../monitoring/metrics.js");
Object.defineProperty(exports, "registry", { enumerable: true, get: function () { return metrics_js_1.register; } });
Object.defineProperty(exports, "jobsProcessed", { enumerable: true, get: function () { return metrics_js_1.summitJobsProcessed; } });
Object.defineProperty(exports, "outboxSyncLatency", { enumerable: true, get: function () { return metrics_js_1.summitOutboxSyncLatency; } });
Object.defineProperty(exports, "activeConnections", { enumerable: true, get: function () { return metrics_js_1.summitActiveConnections; } });
Object.defineProperty(exports, "databaseQueryDuration", { enumerable: true, get: function () { return metrics_js_1.summitDatabaseQueryDuration; } });
Object.defineProperty(exports, "httpRequestDuration", { enumerable: true, get: function () { return metrics_js_1.summitHttpRequestDuration; } });
Object.defineProperty(exports, "graphragQueryTotal", { enumerable: true, get: function () { return metrics_js_1.summitGraphragQueryTotal; } });
Object.defineProperty(exports, "graphragQueryDurationMs", { enumerable: true, get: function () { return metrics_js_1.summitGraphragQueryDurationMs; } });
Object.defineProperty(exports, "queryPreviewsTotal", { enumerable: true, get: function () { return metrics_js_1.summitQueryPreviewsTotal; } });
Object.defineProperty(exports, "queryPreviewLatencyMs", { enumerable: true, get: function () { return metrics_js_1.summitQueryPreviewLatencyMs; } });
Object.defineProperty(exports, "queryPreviewErrorsTotal", { enumerable: true, get: function () { return metrics_js_1.summitQueryPreviewErrorsTotal; } });
Object.defineProperty(exports, "queryPreviewExecutionsTotal", { enumerable: true, get: function () { return metrics_js_1.summitQueryPreviewExecutionsTotal; } });
Object.defineProperty(exports, "glassBoxRunsTotal", { enumerable: true, get: function () { return metrics_js_1.summitGlassBoxRunsTotal; } });
Object.defineProperty(exports, "glassBoxRunDurationMs", { enumerable: true, get: function () { return metrics_js_1.summitGlassBoxRunDurationMs; } });
Object.defineProperty(exports, "glassBoxCacheHits", { enumerable: true, get: function () { return metrics_js_1.summitGlassBoxCacheHits; } });
Object.defineProperty(exports, "cacheHits", { enumerable: true, get: function () { return metrics_js_1.summitCacheHits; } });
Object.defineProperty(exports, "cacheMisses", { enumerable: true, get: function () { return metrics_js_1.summitCacheMisses; } });
Object.defineProperty(exports, "copilotApiRequestTotal", { enumerable: true, get: function () { return metrics_js_1.copilotApiRequestTotal; } });
Object.defineProperty(exports, "copilotApiRequestDurationMs", { enumerable: true, get: function () { return metrics_js_1.copilotApiRequestDurationMs; } });
Object.defineProperty(exports, "maestroDagExecutionDurationSeconds", { enumerable: true, get: function () { return 
    // Maestro Metrics
    metrics_js_1.maestroDagExecutionDurationSeconds; } });
Object.defineProperty(exports, "maestroJobExecutionDurationSeconds", { enumerable: true, get: function () { return metrics_js_1.maestroJobExecutionDurationSeconds; } });
Object.defineProperty(exports, "llmTokensTotal", { enumerable: true, get: function () { return 
    // LLM Metrics
    metrics_js_1.llmTokensTotal; } });
Object.defineProperty(exports, "llmRequestDuration", { enumerable: true, get: function () { return metrics_js_1.llmRequestDuration; } });
Object.defineProperty(exports, "intelgraphCacheHits", { enumerable: true, get: function () { return 
    // New Metrics from metrics.js
    metrics_js_1.intelgraphCacheHits; } });
Object.defineProperty(exports, "intelgraphCacheMisses", { enumerable: true, get: function () { return metrics_js_1.intelgraphCacheMisses; } });
Object.defineProperty(exports, "intelgraphActiveConnections", { enumerable: true, get: function () { return metrics_js_1.intelgraphActiveConnections; } });
Object.defineProperty(exports, "intelgraphDatabaseQueryDuration", { enumerable: true, get: function () { return metrics_js_1.intelgraphDatabaseQueryDuration; } });
Object.defineProperty(exports, "intelgraphHttpRequestDuration", { enumerable: true, get: function () { return metrics_js_1.intelgraphHttpRequestDuration; } });
Object.defineProperty(exports, "intelgraphGraphragQueryTotal", { enumerable: true, get: function () { return metrics_js_1.intelgraphGraphragQueryTotal; } });
Object.defineProperty(exports, "intelgraphGraphragQueryDurationMs", { enumerable: true, get: function () { return metrics_js_1.intelgraphGraphragQueryDurationMs; } });
Object.defineProperty(exports, "intelgraphQueryPreviewsTotal", { enumerable: true, get: function () { return metrics_js_1.intelgraphQueryPreviewsTotal; } });
Object.defineProperty(exports, "intelgraphQueryPreviewLatencyMs", { enumerable: true, get: function () { return metrics_js_1.intelgraphQueryPreviewLatencyMs; } });
Object.defineProperty(exports, "intelgraphQueryPreviewErrorsTotal", { enumerable: true, get: function () { return metrics_js_1.intelgraphQueryPreviewErrorsTotal; } });
Object.defineProperty(exports, "intelgraphQueryPreviewExecutionsTotal", { enumerable: true, get: function () { return metrics_js_1.intelgraphQueryPreviewExecutionsTotal; } });
Object.defineProperty(exports, "intelgraphGlassBoxRunsTotal", { enumerable: true, get: function () { return metrics_js_1.intelgraphGlassBoxRunsTotal; } });
Object.defineProperty(exports, "intelgraphGlassBoxRunDurationMs", { enumerable: true, get: function () { return metrics_js_1.intelgraphGlassBoxRunDurationMs; } });
Object.defineProperty(exports, "intelgraphGlassBoxCacheHits", { enumerable: true, get: function () { return metrics_js_1.intelgraphGlassBoxCacheHits; } });
Object.defineProperty(exports, "goldenPathStepTotal", { enumerable: true, get: function () { return metrics_js_1.goldenPathStepTotal; } });
Object.defineProperty(exports, "uiErrorBoundaryCatchTotal", { enumerable: true, get: function () { return metrics_js_1.uiErrorBoundaryCatchTotal; } });
Object.defineProperty(exports, "maestroDeploymentsTotal", { enumerable: true, get: function () { return metrics_js_1.maestroDeploymentsTotal; } });
Object.defineProperty(exports, "maestroPrLeadTimeHours", { enumerable: true, get: function () { return metrics_js_1.maestroPrLeadTimeHours; } });
Object.defineProperty(exports, "maestroChangeFailureRate", { enumerable: true, get: function () { return metrics_js_1.maestroChangeFailureRate; } });
Object.defineProperty(exports, "maestroMttrHours", { enumerable: true, get: function () { return metrics_js_1.maestroMttrHours; } });
Object.defineProperty(exports, "stdHttpRequestsTotal", { enumerable: true, get: function () { return metrics_js_1.httpRequestsTotal; } });
Object.defineProperty(exports, "stdHttpRequestDuration", { enumerable: true, get: function () { return metrics_js_1.httpRequestDuration; } });
Object.defineProperty(exports, "dbQueriesTotal", { enumerable: true, get: function () { return metrics_js_1.dbQueriesTotal; } });
Object.defineProperty(exports, "dbQueryDuration", { enumerable: true, get: function () { return metrics_js_1.dbQueryDuration; } });
Object.defineProperty(exports, "websocketConnections", { enumerable: true, get: function () { return metrics_js_1.websocketConnections; } });
Object.defineProperty(exports, "narrativeSimulationActiveSimulations", { enumerable: true, get: function () { return metrics_js_1.narrativeSimulationActiveSimulations; } });
Object.defineProperty(exports, "narrativeSimulationTicksTotal", { enumerable: true, get: function () { return metrics_js_1.narrativeSimulationTicksTotal; } });
Object.defineProperty(exports, "narrativeSimulationEventsTotal", { enumerable: true, get: function () { return metrics_js_1.narrativeSimulationEventsTotal; } });
Object.defineProperty(exports, "narrativeSimulationDurationSeconds", { enumerable: true, get: function () { return metrics_js_1.narrativeSimulationDurationSeconds; } });
Object.defineProperty(exports, "summitHealthChecksTotal", { enumerable: true, get: function () { return metrics_js_1.summitHealthChecksTotal; } });
exports.metrics = {
    jobsProcessed: metrics_js_1.summitJobsProcessed,
    outboxSyncLatency: metrics_js_1.summitOutboxSyncLatency,
    activeConnections: metrics_js_1.summitActiveConnections,
    databaseQueryDuration: metrics_js_1.summitDatabaseQueryDuration,
    httpRequestDuration: metrics_js_1.summitHttpRequestDuration,
    graphragQueryTotal: metrics_js_1.summitGraphragQueryTotal,
    graphragQueryDurationMs: metrics_js_1.summitGraphragQueryDurationMs,
    queryPreviewsTotal: metrics_js_1.summitQueryPreviewsTotal,
    queryPreviewLatencyMs: metrics_js_1.summitQueryPreviewLatencyMs,
    queryPreviewErrorsTotal: metrics_js_1.summitQueryPreviewErrorsTotal,
    queryPreviewExecutionsTotal: metrics_js_1.summitQueryPreviewExecutionsTotal,
    glassBoxRunsTotal: metrics_js_1.summitGlassBoxRunsTotal,
    glassBoxRunDurationMs: metrics_js_1.summitGlassBoxRunDurationMs,
    glassBoxCacheHits: metrics_js_1.summitGlassBoxCacheHits,
    cacheHits: metrics_js_1.summitCacheHits,
    cacheMisses: metrics_js_1.summitCacheMisses,
    copilotApiRequestTotal: metrics_js_1.copilotApiRequestTotal,
    copilotApiRequestDurationMs: metrics_js_1.copilotApiRequestDurationMs,
    maestroDagExecutionDurationSeconds: metrics_js_1.maestroDagExecutionDurationSeconds,
    maestroJobExecutionDurationSeconds: metrics_js_1.maestroJobExecutionDurationSeconds,
    llmTokensTotal: metrics_js_1.llmTokensTotal,
    llmRequestDuration: metrics_js_1.llmRequestDuration,
    intelgraphCacheHits: metrics_js_1.intelgraphCacheHits,
    intelgraphCacheMisses: metrics_js_1.intelgraphCacheMisses,
    intelgraphActiveConnections: metrics_js_1.intelgraphActiveConnections,
    intelgraphDatabaseQueryDuration: metrics_js_1.intelgraphDatabaseQueryDuration,
    intelgraphHttpRequestDuration: metrics_js_1.intelgraphHttpRequestDuration,
    intelgraphGraphragQueryTotal: metrics_js_1.intelgraphGraphragQueryTotal,
    intelgraphGraphragQueryDurationMs: metrics_js_1.intelgraphGraphragQueryDurationMs,
    intelgraphQueryPreviewsTotal: metrics_js_1.intelgraphQueryPreviewsTotal,
    intelgraphQueryPreviewLatencyMs: metrics_js_1.intelgraphQueryPreviewLatencyMs,
    intelgraphQueryPreviewErrorsTotal: metrics_js_1.intelgraphQueryPreviewErrorsTotal,
    intelgraphQueryPreviewExecutionsTotal: metrics_js_1.intelgraphQueryPreviewExecutionsTotal,
    intelgraphGlassBoxRunsTotal: metrics_js_1.intelgraphGlassBoxRunsTotal,
    intelgraphGlassBoxRunDurationMs: metrics_js_1.intelgraphGlassBoxRunDurationMs,
    intelgraphGlassBoxCacheHits: metrics_js_1.intelgraphGlassBoxCacheHits,
    goldenPathStepTotal: metrics_js_1.goldenPathStepTotal,
    uiErrorBoundaryCatchTotal: metrics_js_1.uiErrorBoundaryCatchTotal,
    maestroDeploymentsTotal: metrics_js_1.maestroDeploymentsTotal,
    maestroPrLeadTimeHours: metrics_js_1.maestroPrLeadTimeHours,
    maestroChangeFailureRate: metrics_js_1.maestroChangeFailureRate,
    maestroMttrHours: metrics_js_1.maestroMttrHours,
    stdHttpRequestsTotal: metrics_js_1.httpRequestsTotal,
    stdHttpRequestDuration: metrics_js_1.httpRequestDuration,
    dbQueriesTotal: metrics_js_1.dbQueriesTotal,
    dbQueryDuration: metrics_js_1.dbQueryDuration,
    websocketConnections: metrics_js_1.websocketConnections,
    narrativeSimulationActiveSimulations: metrics_js_1.narrativeSimulationActiveSimulations,
    narrativeSimulationTicksTotal: metrics_js_1.narrativeSimulationTicksTotal,
    narrativeSimulationEventsTotal: metrics_js_1.narrativeSimulationEventsTotal,
    narrativeSimulationDurationSeconds: metrics_js_1.narrativeSimulationDurationSeconds,
    summitHealthChecksTotal: metrics_js_1.summitHealthChecksTotal
};
