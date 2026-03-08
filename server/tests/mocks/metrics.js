"use strict";
// Comprehensive mock for monitoring/metrics module
// Auto-generated to include all exports from src/monitoring/metrics.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.intelgraphGlassBoxRunDurationMs = exports.intelgraphGlassBoxCacheHits = exports.intelgraphDatabaseQueryDuration = exports.intelgraphCacheMisses = exports.intelgraphCacheHits = exports.intelgraphActiveConnections = exports.idempotentHitsTotal = exports.httpRequestsTotal = exports.httpRequestDuration = exports.graphragSchemaFailuresTotal = exports.graphragCacheHitRatio = exports.graphqlTenantCostUsage = exports.graphqlResolverErrorsTotal = exports.graphqlResolverDurationSeconds = exports.graphqlResolverCallsTotal = exports.graphqlRequestsTotal = exports.graphqlRequestDuration = exports.graphqlQueryCostHistogram = exports.graphqlPerTenantOverageCount = exports.graphqlErrors = exports.graphqlCostRateLimitHits = exports.graphqlCostLimitRemaining = exports.graphqlCostLimitExceededTotal = exports.graphOperationDuration = exports.graphNodesTotal = exports.graphExpandRequestsTotal = exports.graphEdgesTotal = exports.goldenPathStepTotal = exports.erMergeOutcomesTotal = exports.doclingInferenceTotal = exports.doclingInferenceDuration = exports.doclingCostUsd = exports.doclingCharactersProcessed = exports.deploymentRollbacksTotal = exports.dbQueryDuration = exports.dbQueriesTotal = exports.dbConnectionsActive = exports.copilotApiRequestTotal = exports.copilotApiRequestDurationMs = exports.businessUserSignupsTotal = exports.businessRevenueTotal = exports.businessApiCallsTotal = exports.breakerState = exports.applicationErrors = exports.aiRequestTotal = exports.aiJobsTotal = exports.aiJobsQueued = exports.aiJobsProcessing = exports.aiJobDuration = exports.admissionDecisionsTotal = void 0;
exports.memoryUsage = exports.maestroWebScrapingRequests = exports.maestroThompsonSamplingRewards = exports.maestroSynthesisOperations = exports.maestroSecurityEvents = exports.maestroPrLeadTimeHours = exports.maestroPremiumRoutingDecisions = exports.maestroPremiumCostSavings = exports.maestroPremiumBudgetUtilization = exports.maestroOrchestrationRequests = exports.maestroOrchestrationErrors = exports.maestroOrchestrationDuration = exports.maestroMttrHours = exports.maestroJobExecutionDurationSeconds = exports.maestroInvestigationsCreated = exports.maestroGraphRelations = exports.maestroGraphQueryDuration = exports.maestroGraphOperations = exports.maestroGraphEntities = exports.maestroGraphConnections = exports.maestroDeploymentsTotal = exports.maestroDataSourcesActive = exports.maestroDagExecutionDurationSeconds = exports.maestroComplianceGateDecisions = exports.maestroChangeFailureRate = exports.maestroAuthorizationDecisions = exports.maestroAuthenticationAttempts = exports.maestroAiModelRequests = exports.maestroAiModelErrors = exports.maestroAiModelDuration = exports.maestroAiModelCosts = exports.maestroActiveSessions = exports.maestroActiveConnections = exports.llmTokensTotal = exports.llmRequestsTotal = exports.llmRequestDuration = exports.llmCostTotal = exports.investigationsActive = exports.investigationOperations = exports.intelgraphQueryPreviewsTotal = exports.intelgraphQueryPreviewLatencyMs = exports.intelgraphQueryPreviewExecutionsTotal = exports.intelgraphQueryPreviewErrorsTotal = exports.intelgraphOutboxSyncLatency = exports.intelgraphJobsProcessed = exports.intelgraphJobQueueDepth = exports.intelgraphHttpRequestDuration = exports.intelgraphGraphragQueryTotal = exports.intelgraphGraphragQueryDurationMs = exports.intelgraphGlassBoxRunsTotal = void 0;
exports.register = exports.metrics = exports.rollbackEventsTotal = exports.regionHealthStatus = exports.regionProbeLatencyMs = exports.mcpInvocationsTotal = exports.mcpSessionsTotal = exports.approvalDuration = exports.approvalsPending = exports.approvalsRejectedTotal = exports.approvalsApprovedTotal = exports.webVitalValue = exports.websocketMessages = exports.websocketConnections = exports.vectorQueryDurationSeconds = exports.vectorQueriesTotal = exports.uiErrorBoundaryCatchTotal = exports.tenantScopeViolationsTotal = exports.serviceAutoRemediationsTotal = exports.resolverLatencyMs = exports.realtimeConflictsTotal = exports.pipelineUptimeRatio = exports.pipelineLatencySeconds = exports.pipelineFreshnessSeconds = exports.pipelineCorrectnessRatio = exports.pipelineCompletenessRatio = exports.pbacDecisionsTotal = exports.neighborhoodCacheLatencyMs = exports.neighborhoodCacheHitRatio = void 0;
exports.stopMetricsCollection = stopMetricsCollection;
const createMockMetric = () => ({
    inc: () => { },
    dec: () => { },
    set: () => { },
    observe: () => { },
    startTimer: () => () => { },
    labels: () => createMockMetric(),
});
// Export all individual metrics (alphabetically sorted)
exports.admissionDecisionsTotal = createMockMetric();
exports.aiJobDuration = createMockMetric();
exports.aiJobsProcessing = createMockMetric();
exports.aiJobsQueued = createMockMetric();
exports.aiJobsTotal = createMockMetric();
exports.aiRequestTotal = createMockMetric();
exports.applicationErrors = createMockMetric();
exports.breakerState = createMockMetric();
exports.businessApiCallsTotal = createMockMetric();
exports.businessRevenueTotal = createMockMetric();
exports.businessUserSignupsTotal = createMockMetric();
exports.copilotApiRequestDurationMs = createMockMetric();
exports.copilotApiRequestTotal = createMockMetric();
exports.dbConnectionsActive = createMockMetric();
exports.dbQueriesTotal = createMockMetric();
exports.dbQueryDuration = createMockMetric();
exports.deploymentRollbacksTotal = createMockMetric();
exports.doclingCharactersProcessed = createMockMetric();
exports.doclingCostUsd = createMockMetric();
exports.doclingInferenceDuration = createMockMetric();
exports.doclingInferenceTotal = createMockMetric();
exports.erMergeOutcomesTotal = createMockMetric();
exports.goldenPathStepTotal = createMockMetric();
exports.graphEdgesTotal = createMockMetric();
exports.graphExpandRequestsTotal = createMockMetric();
exports.graphNodesTotal = createMockMetric();
exports.graphOperationDuration = createMockMetric();
exports.graphqlCostLimitExceededTotal = createMockMetric();
exports.graphqlCostLimitRemaining = createMockMetric();
exports.graphqlCostRateLimitHits = createMockMetric();
exports.graphqlErrors = createMockMetric();
exports.graphqlPerTenantOverageCount = createMockMetric();
exports.graphqlQueryCostHistogram = createMockMetric();
exports.graphqlRequestDuration = createMockMetric();
exports.graphqlRequestsTotal = createMockMetric();
exports.graphqlResolverCallsTotal = createMockMetric();
exports.graphqlResolverDurationSeconds = createMockMetric();
exports.graphqlResolverErrorsTotal = createMockMetric();
exports.graphqlTenantCostUsage = createMockMetric();
exports.graphragCacheHitRatio = createMockMetric();
exports.graphragSchemaFailuresTotal = createMockMetric();
exports.httpRequestDuration = createMockMetric();
exports.httpRequestsTotal = createMockMetric();
exports.idempotentHitsTotal = createMockMetric();
exports.intelgraphActiveConnections = createMockMetric();
exports.intelgraphCacheHits = createMockMetric();
exports.intelgraphCacheMisses = createMockMetric();
exports.intelgraphDatabaseQueryDuration = createMockMetric();
exports.intelgraphGlassBoxCacheHits = createMockMetric();
exports.intelgraphGlassBoxRunDurationMs = createMockMetric();
exports.intelgraphGlassBoxRunsTotal = createMockMetric();
exports.intelgraphGraphragQueryDurationMs = createMockMetric();
exports.intelgraphGraphragQueryTotal = createMockMetric();
exports.intelgraphHttpRequestDuration = createMockMetric();
exports.intelgraphJobQueueDepth = createMockMetric();
exports.intelgraphJobsProcessed = createMockMetric();
exports.intelgraphOutboxSyncLatency = createMockMetric();
exports.intelgraphQueryPreviewErrorsTotal = createMockMetric();
exports.intelgraphQueryPreviewExecutionsTotal = createMockMetric();
exports.intelgraphQueryPreviewLatencyMs = createMockMetric();
exports.intelgraphQueryPreviewsTotal = createMockMetric();
exports.investigationOperations = createMockMetric();
exports.investigationsActive = createMockMetric();
exports.llmCostTotal = createMockMetric();
exports.llmRequestDuration = createMockMetric();
exports.llmRequestsTotal = createMockMetric();
exports.llmTokensTotal = createMockMetric();
exports.maestroActiveConnections = createMockMetric();
exports.maestroActiveSessions = createMockMetric();
exports.maestroAiModelCosts = createMockMetric();
exports.maestroAiModelDuration = createMockMetric();
exports.maestroAiModelErrors = createMockMetric();
exports.maestroAiModelRequests = createMockMetric();
exports.maestroAuthenticationAttempts = createMockMetric();
exports.maestroAuthorizationDecisions = createMockMetric();
exports.maestroChangeFailureRate = createMockMetric();
exports.maestroComplianceGateDecisions = createMockMetric();
exports.maestroDagExecutionDurationSeconds = createMockMetric();
exports.maestroDataSourcesActive = createMockMetric();
exports.maestroDeploymentsTotal = createMockMetric();
exports.maestroGraphConnections = createMockMetric();
exports.maestroGraphEntities = createMockMetric();
exports.maestroGraphOperations = createMockMetric();
exports.maestroGraphQueryDuration = createMockMetric();
exports.maestroGraphRelations = createMockMetric();
exports.maestroInvestigationsCreated = createMockMetric();
exports.maestroJobExecutionDurationSeconds = createMockMetric();
exports.maestroMttrHours = createMockMetric();
exports.maestroOrchestrationDuration = createMockMetric();
exports.maestroOrchestrationErrors = createMockMetric();
exports.maestroOrchestrationRequests = createMockMetric();
exports.maestroPremiumBudgetUtilization = createMockMetric();
exports.maestroPremiumCostSavings = createMockMetric();
exports.maestroPremiumRoutingDecisions = createMockMetric();
exports.maestroPrLeadTimeHours = createMockMetric();
exports.maestroSecurityEvents = createMockMetric();
exports.maestroSynthesisOperations = createMockMetric();
exports.maestroThompsonSamplingRewards = createMockMetric();
exports.maestroWebScrapingRequests = createMockMetric();
exports.memoryUsage = createMockMetric();
exports.neighborhoodCacheHitRatio = createMockMetric();
exports.neighborhoodCacheLatencyMs = createMockMetric();
exports.pbacDecisionsTotal = createMockMetric();
exports.pipelineCompletenessRatio = createMockMetric();
exports.pipelineCorrectnessRatio = createMockMetric();
exports.pipelineFreshnessSeconds = createMockMetric();
exports.pipelineLatencySeconds = createMockMetric();
exports.pipelineUptimeRatio = createMockMetric();
exports.realtimeConflictsTotal = createMockMetric();
exports.resolverLatencyMs = createMockMetric();
exports.serviceAutoRemediationsTotal = createMockMetric();
exports.tenantScopeViolationsTotal = createMockMetric();
exports.uiErrorBoundaryCatchTotal = createMockMetric();
exports.vectorQueriesTotal = createMockMetric();
exports.vectorQueryDurationSeconds = createMockMetric();
exports.websocketConnections = createMockMetric();
exports.websocketMessages = createMockMetric();
exports.webVitalValue = createMockMetric();
// Additional metrics that may be imported
exports.approvalsApprovedTotal = createMockMetric();
exports.approvalsRejectedTotal = createMockMetric();
exports.approvalsPending = createMockMetric();
exports.approvalDuration = createMockMetric();
exports.mcpSessionsTotal = createMockMetric();
exports.mcpInvocationsTotal = createMockMetric();
exports.regionProbeLatencyMs = createMockMetric();
exports.regionHealthStatus = createMockMetric();
exports.rollbackEventsTotal = createMockMetric();
// Export metrics object
exports.metrics = {
    admissionDecisionsTotal: exports.admissionDecisionsTotal,
    aiJobDuration: exports.aiJobDuration,
    aiJobsProcessing: exports.aiJobsProcessing,
    aiJobsQueued: exports.aiJobsQueued,
    aiJobsTotal: exports.aiJobsTotal,
    aiRequestTotal: exports.aiRequestTotal,
    applicationErrors: exports.applicationErrors,
    approvalsApprovedTotal: exports.approvalsApprovedTotal,
    approvalsRejectedTotal: exports.approvalsRejectedTotal,
    approvalsPending: exports.approvalsPending,
    approvalDuration: exports.approvalDuration,
    breakerState: exports.breakerState,
    businessApiCallsTotal: exports.businessApiCallsTotal,
    businessRevenueTotal: exports.businessRevenueTotal,
    businessUserSignupsTotal: exports.businessUserSignupsTotal,
    copilotApiRequestDurationMs: exports.copilotApiRequestDurationMs,
    copilotApiRequestTotal: exports.copilotApiRequestTotal,
    dbConnectionsActive: exports.dbConnectionsActive,
    dbQueriesTotal: exports.dbQueriesTotal,
    dbQueryDuration: exports.dbQueryDuration,
    deploymentRollbacksTotal: exports.deploymentRollbacksTotal,
    doclingCharactersProcessed: exports.doclingCharactersProcessed,
    doclingCostUsd: exports.doclingCostUsd,
    doclingInferenceDuration: exports.doclingInferenceDuration,
    doclingInferenceTotal: exports.doclingInferenceTotal,
    erMergeOutcomesTotal: exports.erMergeOutcomesTotal,
    goldenPathStepTotal: exports.goldenPathStepTotal,
    graphEdgesTotal: exports.graphEdgesTotal,
    graphExpandRequestsTotal: exports.graphExpandRequestsTotal,
    graphNodesTotal: exports.graphNodesTotal,
    graphOperationDuration: exports.graphOperationDuration,
    graphqlCostLimitExceededTotal: exports.graphqlCostLimitExceededTotal,
    graphqlCostLimitRemaining: exports.graphqlCostLimitRemaining,
    graphqlCostRateLimitHits: exports.graphqlCostRateLimitHits,
    graphqlErrors: exports.graphqlErrors,
    graphqlPerTenantOverageCount: exports.graphqlPerTenantOverageCount,
    graphqlQueryCostHistogram: exports.graphqlQueryCostHistogram,
    graphqlRequestDuration: exports.graphqlRequestDuration,
    graphqlRequestsTotal: exports.graphqlRequestsTotal,
    graphqlResolverCallsTotal: exports.graphqlResolverCallsTotal,
    graphqlResolverDurationSeconds: exports.graphqlResolverDurationSeconds,
    graphqlResolverErrorsTotal: exports.graphqlResolverErrorsTotal,
    graphqlTenantCostUsage: exports.graphqlTenantCostUsage,
    graphragCacheHitRatio: exports.graphragCacheHitRatio,
    graphragSchemaFailuresTotal: exports.graphragSchemaFailuresTotal,
    httpRequestDuration: exports.httpRequestDuration,
    httpRequestsTotal: exports.httpRequestsTotal,
    idempotentHitsTotal: exports.idempotentHitsTotal,
    intelgraphActiveConnections: exports.intelgraphActiveConnections,
    intelgraphCacheHits: exports.intelgraphCacheHits,
    intelgraphCacheMisses: exports.intelgraphCacheMisses,
    intelgraphDatabaseQueryDuration: exports.intelgraphDatabaseQueryDuration,
    intelgraphGlassBoxCacheHits: exports.intelgraphGlassBoxCacheHits,
    intelgraphGlassBoxRunDurationMs: exports.intelgraphGlassBoxRunDurationMs,
    intelgraphGlassBoxRunsTotal: exports.intelgraphGlassBoxRunsTotal,
    intelgraphGraphragQueryDurationMs: exports.intelgraphGraphragQueryDurationMs,
    intelgraphGraphragQueryTotal: exports.intelgraphGraphragQueryTotal,
    intelgraphHttpRequestDuration: exports.intelgraphHttpRequestDuration,
    intelgraphJobQueueDepth: exports.intelgraphJobQueueDepth,
    intelgraphJobsProcessed: exports.intelgraphJobsProcessed,
    intelgraphOutboxSyncLatency: exports.intelgraphOutboxSyncLatency,
    intelgraphQueryPreviewErrorsTotal: exports.intelgraphQueryPreviewErrorsTotal,
    intelgraphQueryPreviewExecutionsTotal: exports.intelgraphQueryPreviewExecutionsTotal,
    intelgraphQueryPreviewLatencyMs: exports.intelgraphQueryPreviewLatencyMs,
    intelgraphQueryPreviewsTotal: exports.intelgraphQueryPreviewsTotal,
    investigationOperations: exports.investigationOperations,
    investigationsActive: exports.investigationsActive,
    llmCostTotal: exports.llmCostTotal,
    llmRequestDuration: exports.llmRequestDuration,
    llmRequestsTotal: exports.llmRequestsTotal,
    llmTokensTotal: exports.llmTokensTotal,
    maestroActiveConnections: exports.maestroActiveConnections,
    maestroActiveSessions: exports.maestroActiveSessions,
    maestroAiModelCosts: exports.maestroAiModelCosts,
    maestroAiModelDuration: exports.maestroAiModelDuration,
    maestroAiModelErrors: exports.maestroAiModelErrors,
    maestroAiModelRequests: exports.maestroAiModelRequests,
    maestroAuthenticationAttempts: exports.maestroAuthenticationAttempts,
    maestroAuthorizationDecisions: exports.maestroAuthorizationDecisions,
    maestroChangeFailureRate: exports.maestroChangeFailureRate,
    maestroComplianceGateDecisions: exports.maestroComplianceGateDecisions,
    maestroDagExecutionDurationSeconds: exports.maestroDagExecutionDurationSeconds,
    maestroDataSourcesActive: exports.maestroDataSourcesActive,
    maestroDeploymentsTotal: exports.maestroDeploymentsTotal,
    maestroGraphConnections: exports.maestroGraphConnections,
    maestroGraphEntities: exports.maestroGraphEntities,
    maestroGraphOperations: exports.maestroGraphOperations,
    maestroGraphQueryDuration: exports.maestroGraphQueryDuration,
    maestroGraphRelations: exports.maestroGraphRelations,
    maestroInvestigationsCreated: exports.maestroInvestigationsCreated,
    maestroJobExecutionDurationSeconds: exports.maestroJobExecutionDurationSeconds,
    maestroMttrHours: exports.maestroMttrHours,
    maestroOrchestrationDuration: exports.maestroOrchestrationDuration,
    maestroOrchestrationErrors: exports.maestroOrchestrationErrors,
    maestroOrchestrationRequests: exports.maestroOrchestrationRequests,
    maestroPremiumBudgetUtilization: exports.maestroPremiumBudgetUtilization,
    maestroPremiumCostSavings: exports.maestroPremiumCostSavings,
    maestroPremiumRoutingDecisions: exports.maestroPremiumRoutingDecisions,
    maestroPrLeadTimeHours: exports.maestroPrLeadTimeHours,
    maestroSecurityEvents: exports.maestroSecurityEvents,
    maestroSynthesisOperations: exports.maestroSynthesisOperations,
    maestroThompsonSamplingRewards: exports.maestroThompsonSamplingRewards,
    maestroWebScrapingRequests: exports.maestroWebScrapingRequests,
    mcpSessionsTotal: exports.mcpSessionsTotal,
    mcpInvocationsTotal: exports.mcpInvocationsTotal,
    memoryUsage: exports.memoryUsage,
    neighborhoodCacheHitRatio: exports.neighborhoodCacheHitRatio,
    neighborhoodCacheLatencyMs: exports.neighborhoodCacheLatencyMs,
    pbacDecisionsTotal: exports.pbacDecisionsTotal,
    pipelineCompletenessRatio: exports.pipelineCompletenessRatio,
    pipelineCorrectnessRatio: exports.pipelineCorrectnessRatio,
    pipelineFreshnessSeconds: exports.pipelineFreshnessSeconds,
    pipelineLatencySeconds: exports.pipelineLatencySeconds,
    pipelineUptimeRatio: exports.pipelineUptimeRatio,
    realtimeConflictsTotal: exports.realtimeConflictsTotal,
    regionProbeLatencyMs: exports.regionProbeLatencyMs,
    regionHealthStatus: exports.regionHealthStatus,
    resolverLatencyMs: exports.resolverLatencyMs,
    rollbackEventsTotal: exports.rollbackEventsTotal,
    serviceAutoRemediationsTotal: exports.serviceAutoRemediationsTotal,
    tenantScopeViolationsTotal: exports.tenantScopeViolationsTotal,
    uiErrorBoundaryCatchTotal: exports.uiErrorBoundaryCatchTotal,
    vectorQueriesTotal: exports.vectorQueriesTotal,
    vectorQueryDurationSeconds: exports.vectorQueryDurationSeconds,
    websocketConnections: exports.websocketConnections,
    websocketMessages: exports.websocketMessages,
    webVitalValue: exports.webVitalValue,
};
// Export register mock
exports.register = {
    metrics: () => [],
    getSingleMetric: () => null,
    getMetricsAsJSON: () => ({}),
    getMetricsAsArray: () => [],
    removeSingleMetric: () => { },
    clear: () => { },
    registerMetric: () => { },
    setDefaultLabels: () => { },
    resetMetrics: () => { },
    contentType: 'text/plain',
};
// Export cleanup function
function stopMetricsCollection() { }
exports.default = exports.metrics;
