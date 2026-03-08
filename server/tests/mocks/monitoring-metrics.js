"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolverLatencyMs = exports.aiRequestTotal = exports.graphExpandRequestsTotal = exports.doclingCostUsd = exports.doclingCharactersProcessed = exports.doclingInferenceTotal = exports.doclingInferenceDuration = exports.admissionDecisionsTotal = exports.pbacDecisionsTotal = exports.graphragCacheHitRatio = exports.graphragSchemaFailuresTotal = exports.pipelineLatencySeconds = exports.pipelineCorrectnessRatio = exports.pipelineCompletenessRatio = exports.pipelineFreshnessSeconds = exports.pipelineUptimeRatio = exports.memoryUsage = exports.applicationErrors = exports.deploymentRollbacksTotal = exports.erMergeOutcomesTotal = exports.investigationOperations = exports.investigationsActive = exports.websocketMessages = exports.websocketConnections = exports.graphOperationDuration = exports.graphEdgesTotal = exports.graphNodesTotal = exports.llmRequestsTotal = exports.llmTokensTotal = exports.llmRequestDuration = exports.aiJobsTotal = exports.aiJobDuration = exports.aiJobsProcessing = exports.aiJobsQueued = exports.vectorQueriesTotal = exports.vectorQueryDurationSeconds = exports.dbQueriesTotal = exports.dbQueryDuration = exports.dbConnectionsActive = exports.tenantScopeViolationsTotal = exports.graphqlErrors = exports.graphqlRequestsTotal = exports.graphqlRequestDuration = exports.businessRevenueTotal = exports.businessApiCallsTotal = exports.businessUserSignupsTotal = exports.httpRequestsTotal = exports.httpRequestDuration = exports.stopMetricsCollection = exports.register = void 0;
exports.metrics = exports.llmCostTotal = exports.copilotApiRequestDurationMs = exports.copilotApiRequestTotal = exports.intelgraphCacheMisses = exports.intelgraphCacheHits = exports.intelgraphGlassBoxCacheHits = exports.intelgraphGlassBoxRunDurationMs = exports.intelgraphGlassBoxRunsTotal = exports.intelgraphQueryPreviewExecutionsTotal = exports.intelgraphQueryPreviewErrorsTotal = exports.intelgraphQueryPreviewLatencyMs = exports.intelgraphQueryPreviewsTotal = exports.intelgraphGraphragQueryDurationMs = exports.intelgraphGraphragQueryTotal = exports.intelgraphHttpRequestDuration = exports.intelgraphDatabaseQueryDuration = exports.intelgraphActiveConnections = exports.intelgraphOutboxSyncLatency = exports.intelgraphJobsProcessed = exports.maestroJobExecutionDurationSeconds = exports.maestroDagExecutionDurationSeconds = exports.maestroMttrHours = exports.maestroChangeFailureRate = exports.maestroPrLeadTimeHours = exports.maestroDeploymentsTotal = exports.intelgraphJobQueueDepth = exports.breakerState = exports.uiErrorBoundaryCatchTotal = exports.goldenPathStepTotal = exports.serviceAutoRemediationsTotal = exports.idempotentHitsTotal = exports.realtimeConflictsTotal = exports.webVitalValue = exports.graphqlResolverCallsTotal = exports.graphqlResolverErrorsTotal = exports.graphqlResolverDurationSeconds = exports.neighborhoodCacheLatencyMs = exports.neighborhoodCacheHitRatio = void 0;
// Mock for monitoring/metrics
const globals_1 = require("@jest/globals");
// Mock metric creators
const createMockHistogram = () => ({
    observe: globals_1.jest.fn(),
    startTimer: globals_1.jest.fn().mockReturnValue(globals_1.jest.fn()),
    labels: globals_1.jest.fn().mockReturnThis(),
});
const createMockCounter = () => ({
    inc: globals_1.jest.fn(),
    labels: globals_1.jest.fn().mockReturnThis(),
});
const createMockGauge = () => ({
    set: globals_1.jest.fn(),
    inc: globals_1.jest.fn(),
    dec: globals_1.jest.fn(),
    labels: globals_1.jest.fn().mockReturnThis(),
});
// Registry mock
exports.register = {
    metrics: globals_1.jest.fn().mockResolvedValue(''),
    getSingleMetric: globals_1.jest.fn(),
    clear: globals_1.jest.fn(),
    registerMetric: globals_1.jest.fn(),
};
exports.stopMetricsCollection = globals_1.jest.fn();
// HTTP Request metrics
exports.httpRequestDuration = createMockHistogram();
exports.httpRequestsTotal = createMockCounter();
// Business KPIs
exports.businessUserSignupsTotal = createMockCounter();
exports.businessApiCallsTotal = createMockCounter();
exports.businessRevenueTotal = createMockCounter();
// GraphQL metrics
exports.graphqlRequestDuration = createMockHistogram();
exports.graphqlRequestsTotal = createMockCounter();
exports.graphqlErrors = createMockCounter();
// Tenant metrics
exports.tenantScopeViolationsTotal = createMockCounter();
// Database metrics
exports.dbConnectionsActive = createMockGauge();
exports.dbQueryDuration = createMockHistogram();
exports.dbQueriesTotal = createMockCounter();
exports.vectorQueryDurationSeconds = createMockHistogram();
exports.vectorQueriesTotal = createMockCounter();
// AI/ML Processing metrics
exports.aiJobsQueued = createMockGauge();
exports.aiJobsProcessing = createMockGauge();
exports.aiJobDuration = createMockHistogram();
exports.aiJobsTotal = createMockCounter();
// LLM Metrics
exports.llmRequestDuration = createMockHistogram();
exports.llmTokensTotal = createMockCounter();
exports.llmRequestsTotal = createMockCounter();
// Graph operations metrics
exports.graphNodesTotal = createMockGauge();
exports.graphEdgesTotal = createMockGauge();
exports.graphOperationDuration = createMockHistogram();
// WebSocket metrics
exports.websocketConnections = createMockGauge();
exports.websocketMessages = createMockCounter();
// Investigation metrics
exports.investigationsActive = createMockGauge();
exports.investigationOperations = createMockCounter();
// Entity resolution merge outcomes
exports.erMergeOutcomesTotal = createMockCounter();
// Deployment rollbacks
exports.deploymentRollbacksTotal = createMockCounter();
// Error tracking
exports.applicationErrors = createMockCounter();
// Memory usage
exports.memoryUsage = createMockGauge();
// Pipeline SLI metrics
exports.pipelineUptimeRatio = createMockGauge();
exports.pipelineFreshnessSeconds = createMockGauge();
exports.pipelineCompletenessRatio = createMockGauge();
exports.pipelineCorrectnessRatio = createMockGauge();
exports.pipelineLatencySeconds = createMockHistogram();
// GraphRAG metrics
exports.graphragSchemaFailuresTotal = createMockCounter();
exports.graphragCacheHitRatio = createMockGauge();
// PBAC metrics
exports.pbacDecisionsTotal = createMockCounter();
exports.admissionDecisionsTotal = createMockCounter();
// Docling service metrics
exports.doclingInferenceDuration = createMockHistogram();
exports.doclingInferenceTotal = createMockCounter();
exports.doclingCharactersProcessed = createMockCounter();
exports.doclingCostUsd = createMockCounter();
// Domain metrics
exports.graphExpandRequestsTotal = createMockCounter();
exports.aiRequestTotal = createMockCounter();
exports.resolverLatencyMs = createMockHistogram();
exports.neighborhoodCacheHitRatio = createMockGauge();
exports.neighborhoodCacheLatencyMs = createMockHistogram();
// Enhanced GraphQL resolver metrics
exports.graphqlResolverDurationSeconds = createMockHistogram();
exports.graphqlResolverErrorsTotal = createMockCounter();
exports.graphqlResolverCallsTotal = createMockCounter();
// Web Vitals metrics
exports.webVitalValue = createMockGauge();
// Real-time updates metrics
exports.realtimeConflictsTotal = createMockCounter();
exports.idempotentHitsTotal = createMockCounter();
// Auto-remediation
exports.serviceAutoRemediationsTotal = createMockCounter();
// Golden Path Metrics
exports.goldenPathStepTotal = createMockCounter();
// UI Error Boundary Metrics
exports.uiErrorBoundaryCatchTotal = createMockCounter();
// Circuit breaker and job queue
exports.breakerState = createMockGauge();
exports.intelgraphJobQueueDepth = createMockGauge();
// DORA Metrics (Maestro)
exports.maestroDeploymentsTotal = createMockCounter();
exports.maestroPrLeadTimeHours = createMockHistogram();
exports.maestroChangeFailureRate = createMockGauge();
exports.maestroMttrHours = createMockHistogram();
exports.maestroDagExecutionDurationSeconds = createMockHistogram();
exports.maestroJobExecutionDurationSeconds = createMockHistogram();
// Legacy IntelGraph metrics
exports.intelgraphJobsProcessed = createMockCounter();
exports.intelgraphOutboxSyncLatency = createMockHistogram();
exports.intelgraphActiveConnections = createMockGauge();
exports.intelgraphDatabaseQueryDuration = createMockHistogram();
exports.intelgraphHttpRequestDuration = createMockHistogram();
// GraphRAG Query Preview metrics
exports.intelgraphGraphragQueryTotal = createMockCounter();
exports.intelgraphGraphragQueryDurationMs = createMockHistogram();
exports.intelgraphQueryPreviewsTotal = createMockCounter();
exports.intelgraphQueryPreviewLatencyMs = createMockHistogram();
exports.intelgraphQueryPreviewErrorsTotal = createMockCounter();
exports.intelgraphQueryPreviewExecutionsTotal = createMockCounter();
exports.intelgraphGlassBoxRunsTotal = createMockCounter();
exports.intelgraphGlassBoxRunDurationMs = createMockHistogram();
exports.intelgraphGlassBoxCacheHits = createMockCounter();
exports.intelgraphCacheHits = createMockCounter();
exports.intelgraphCacheMisses = createMockCounter();
// Copilot API metrics
exports.copilotApiRequestTotal = createMockCounter();
exports.copilotApiRequestDurationMs = createMockHistogram();
// LLM Cost metrics
exports.llmCostTotal = createMockCounter();
// Aggregate metrics object
exports.metrics = {
    graphExpandRequestsTotal: exports.graphExpandRequestsTotal,
    aiRequestTotal: exports.aiRequestTotal,
    resolverLatencyMs: exports.resolverLatencyMs,
    breakerState: exports.breakerState,
    intelgraphJobQueueDepth: exports.intelgraphJobQueueDepth,
    graphragSchemaFailuresTotal: exports.graphragSchemaFailuresTotal,
    graphragCacheHitRatio: exports.graphragCacheHitRatio,
    neighborhoodCacheHitRatio: exports.neighborhoodCacheHitRatio,
    neighborhoodCacheLatencyMs: exports.neighborhoodCacheLatencyMs,
    pbacDecisionsTotal: exports.pbacDecisionsTotal,
    businessUserSignupsTotal: exports.businessUserSignupsTotal,
    businessApiCallsTotal: exports.businessApiCallsTotal,
    businessRevenueTotal: exports.businessRevenueTotal,
    serviceAutoRemediationsTotal: exports.serviceAutoRemediationsTotal,
    goldenPathStepTotal: exports.goldenPathStepTotal,
    uiErrorBoundaryCatchTotal: exports.uiErrorBoundaryCatchTotal,
    maestroDeploymentsTotal: exports.maestroDeploymentsTotal,
    maestroPrLeadTimeHours: exports.maestroPrLeadTimeHours,
    maestroChangeFailureRate: exports.maestroChangeFailureRate,
    maestroMttrHours: exports.maestroMttrHours,
    maestroDagExecutionDurationSeconds: exports.maestroDagExecutionDurationSeconds,
    maestroJobExecutionDurationSeconds: exports.maestroJobExecutionDurationSeconds,
    httpRequestDuration: exports.httpRequestDuration,
    httpRequestsTotal: exports.httpRequestsTotal,
    graphqlRequestDuration: exports.graphqlRequestDuration,
    graphqlRequestsTotal: exports.graphqlRequestsTotal,
    graphqlErrors: exports.graphqlErrors,
    dbConnectionsActive: exports.dbConnectionsActive,
    dbQueryDuration: exports.dbQueryDuration,
    dbQueriesTotal: exports.dbQueriesTotal,
    aiJobsQueued: exports.aiJobsQueued,
    aiJobsProcessing: exports.aiJobsProcessing,
    aiJobDuration: exports.aiJobDuration,
    aiJobsTotal: exports.aiJobsTotal,
    llmRequestDuration: exports.llmRequestDuration,
    llmTokensTotal: exports.llmTokensTotal,
    llmRequestsTotal: exports.llmRequestsTotal,
    graphNodesTotal: exports.graphNodesTotal,
    graphEdgesTotal: exports.graphEdgesTotal,
    graphOperationDuration: exports.graphOperationDuration,
    websocketConnections: exports.websocketConnections,
    websocketMessages: exports.websocketMessages,
    investigationsActive: exports.investigationsActive,
    investigationOperations: exports.investigationOperations,
    applicationErrors: exports.applicationErrors,
    tenantScopeViolationsTotal: exports.tenantScopeViolationsTotal,
    memoryUsage: exports.memoryUsage,
    admissionDecisionsTotal: exports.admissionDecisionsTotal,
    doclingInferenceDuration: exports.doclingInferenceDuration,
    doclingInferenceTotal: exports.doclingInferenceTotal,
    doclingCharactersProcessed: exports.doclingCharactersProcessed,
    doclingCostUsd: exports.doclingCostUsd,
    pipelineUptimeRatio: exports.pipelineUptimeRatio,
    pipelineFreshnessSeconds: exports.pipelineFreshnessSeconds,
    pipelineCompletenessRatio: exports.pipelineCompletenessRatio,
    pipelineCorrectnessRatio: exports.pipelineCorrectnessRatio,
    pipelineLatencySeconds: exports.pipelineLatencySeconds,
    graphqlResolverDurationSeconds: exports.graphqlResolverDurationSeconds,
    graphqlResolverErrorsTotal: exports.graphqlResolverErrorsTotal,
    graphqlResolverCallsTotal: exports.graphqlResolverCallsTotal,
    webVitalValue: exports.webVitalValue,
    realtimeConflictsTotal: exports.realtimeConflictsTotal,
    idempotentHitsTotal: exports.idempotentHitsTotal,
};
exports.default = {
    register: exports.register,
    stopMetricsCollection: exports.stopMetricsCollection,
    metrics: exports.metrics,
    httpRequestDuration: exports.httpRequestDuration,
    httpRequestsTotal: exports.httpRequestsTotal,
    businessUserSignupsTotal: exports.businessUserSignupsTotal,
    businessApiCallsTotal: exports.businessApiCallsTotal,
    businessRevenueTotal: exports.businessRevenueTotal,
    graphqlRequestDuration: exports.graphqlRequestDuration,
    graphqlRequestsTotal: exports.graphqlRequestsTotal,
    graphqlErrors: exports.graphqlErrors,
    tenantScopeViolationsTotal: exports.tenantScopeViolationsTotal,
    dbConnectionsActive: exports.dbConnectionsActive,
    dbQueryDuration: exports.dbQueryDuration,
    dbQueriesTotal: exports.dbQueriesTotal,
    vectorQueryDurationSeconds: exports.vectorQueryDurationSeconds,
    vectorQueriesTotal: exports.vectorQueriesTotal,
    aiJobsQueued: exports.aiJobsQueued,
    aiJobsProcessing: exports.aiJobsProcessing,
    aiJobDuration: exports.aiJobDuration,
    aiJobsTotal: exports.aiJobsTotal,
    llmRequestDuration: exports.llmRequestDuration,
    llmTokensTotal: exports.llmTokensTotal,
    llmRequestsTotal: exports.llmRequestsTotal,
    graphNodesTotal: exports.graphNodesTotal,
    graphEdgesTotal: exports.graphEdgesTotal,
    graphOperationDuration: exports.graphOperationDuration,
    websocketConnections: exports.websocketConnections,
    websocketMessages: exports.websocketMessages,
    investigationsActive: exports.investigationsActive,
    investigationOperations: exports.investigationOperations,
    erMergeOutcomesTotal: exports.erMergeOutcomesTotal,
    deploymentRollbacksTotal: exports.deploymentRollbacksTotal,
    applicationErrors: exports.applicationErrors,
    memoryUsage: exports.memoryUsage,
    graphragSchemaFailuresTotal: exports.graphragSchemaFailuresTotal,
    graphragCacheHitRatio: exports.graphragCacheHitRatio,
    pbacDecisionsTotal: exports.pbacDecisionsTotal,
    admissionDecisionsTotal: exports.admissionDecisionsTotal,
    graphExpandRequestsTotal: exports.graphExpandRequestsTotal,
    aiRequestTotal: exports.aiRequestTotal,
    resolverLatencyMs: exports.resolverLatencyMs,
    neighborhoodCacheHitRatio: exports.neighborhoodCacheHitRatio,
    neighborhoodCacheLatencyMs: exports.neighborhoodCacheLatencyMs,
    graphqlResolverDurationSeconds: exports.graphqlResolverDurationSeconds,
    graphqlResolverErrorsTotal: exports.graphqlResolverErrorsTotal,
    graphqlResolverCallsTotal: exports.graphqlResolverCallsTotal,
    webVitalValue: exports.webVitalValue,
    realtimeConflictsTotal: exports.realtimeConflictsTotal,
    idempotentHitsTotal: exports.idempotentHitsTotal,
    serviceAutoRemediationsTotal: exports.serviceAutoRemediationsTotal,
    goldenPathStepTotal: exports.goldenPathStepTotal,
    uiErrorBoundaryCatchTotal: exports.uiErrorBoundaryCatchTotal,
    breakerState: exports.breakerState,
    intelgraphJobQueueDepth: exports.intelgraphJobQueueDepth,
    maestroDeploymentsTotal: exports.maestroDeploymentsTotal,
    maestroPrLeadTimeHours: exports.maestroPrLeadTimeHours,
    maestroChangeFailureRate: exports.maestroChangeFailureRate,
    maestroMttrHours: exports.maestroMttrHours,
    maestroDagExecutionDurationSeconds: exports.maestroDagExecutionDurationSeconds,
    maestroJobExecutionDurationSeconds: exports.maestroJobExecutionDurationSeconds,
    pipelineUptimeRatio: exports.pipelineUptimeRatio,
    pipelineFreshnessSeconds: exports.pipelineFreshnessSeconds,
    pipelineCompletenessRatio: exports.pipelineCompletenessRatio,
    pipelineCorrectnessRatio: exports.pipelineCorrectnessRatio,
    pipelineLatencySeconds: exports.pipelineLatencySeconds,
    doclingInferenceDuration: exports.doclingInferenceDuration,
    doclingInferenceTotal: exports.doclingInferenceTotal,
    doclingCharactersProcessed: exports.doclingCharactersProcessed,
    doclingCostUsd: exports.doclingCostUsd,
    intelgraphJobsProcessed: exports.intelgraphJobsProcessed,
    intelgraphOutboxSyncLatency: exports.intelgraphOutboxSyncLatency,
    intelgraphActiveConnections: exports.intelgraphActiveConnections,
    intelgraphDatabaseQueryDuration: exports.intelgraphDatabaseQueryDuration,
    intelgraphHttpRequestDuration: exports.intelgraphHttpRequestDuration,
    intelgraphGraphragQueryTotal: exports.intelgraphGraphragQueryTotal,
    intelgraphGraphragQueryDurationMs: exports.intelgraphGraphragQueryDurationMs,
    intelgraphQueryPreviewsTotal: exports.intelgraphQueryPreviewsTotal,
    intelgraphQueryPreviewLatencyMs: exports.intelgraphQueryPreviewLatencyMs,
    intelgraphQueryPreviewErrorsTotal: exports.intelgraphQueryPreviewErrorsTotal,
    intelgraphQueryPreviewExecutionsTotal: exports.intelgraphQueryPreviewExecutionsTotal,
    intelgraphGlassBoxRunsTotal: exports.intelgraphGlassBoxRunsTotal,
    intelgraphGlassBoxRunDurationMs: exports.intelgraphGlassBoxRunDurationMs,
    intelgraphGlassBoxCacheHits: exports.intelgraphGlassBoxCacheHits,
    intelgraphCacheHits: exports.intelgraphCacheHits,
    intelgraphCacheMisses: exports.intelgraphCacheMisses,
    copilotApiRequestTotal: exports.copilotApiRequestTotal,
    copilotApiRequestDurationMs: exports.copilotApiRequestDurationMs,
    llmCostTotal: exports.llmCostTotal,
};
