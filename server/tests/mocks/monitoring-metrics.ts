// Mock for monitoring/metrics
import { jest } from '@jest/globals';

// Mock metric creators
const createMockHistogram = () => ({
  observe: jest.fn(),
  startTimer: jest.fn().mockReturnValue(jest.fn()),
  labels: jest.fn().mockReturnThis(),
});

const createMockCounter = () => ({
  inc: jest.fn(),
  labels: jest.fn().mockReturnThis(),
});

const createMockGauge = () => ({
  set: jest.fn(),
  inc: jest.fn(),
  dec: jest.fn(),
  labels: jest.fn().mockReturnThis(),
});

// Registry mock
export const register = {
  metrics: jest.fn().mockResolvedValue(''),
  getSingleMetric: jest.fn(),
  clear: jest.fn(),
  registerMetric: jest.fn(),
};

export const stopMetricsCollection = jest.fn();

// HTTP Request metrics
export const httpRequestDuration = createMockHistogram();
export const httpRequestsTotal = createMockCounter();

// Business KPIs
export const businessUserSignupsTotal = createMockCounter();
export const businessApiCallsTotal = createMockCounter();
export const businessRevenueTotal = createMockCounter();

// GraphQL metrics
export const graphqlRequestDuration = createMockHistogram();
export const graphqlRequestsTotal = createMockCounter();
export const graphqlErrors = createMockCounter();

// Tenant metrics
export const tenantScopeViolationsTotal = createMockCounter();

// Database metrics
export const dbConnectionsActive = createMockGauge();
export const dbQueryDuration = createMockHistogram();
export const dbQueriesTotal = createMockCounter();
export const vectorQueryDurationSeconds = createMockHistogram();
export const vectorQueriesTotal = createMockCounter();

// AI/ML Processing metrics
export const aiJobsQueued = createMockGauge();
export const aiJobsProcessing = createMockGauge();
export const aiJobDuration = createMockHistogram();
export const aiJobsTotal = createMockCounter();

// LLM Metrics
export const llmRequestDuration = createMockHistogram();
export const llmTokensTotal = createMockCounter();
export const llmRequestsTotal = createMockCounter();

// Graph operations metrics
export const graphNodesTotal = createMockGauge();
export const graphEdgesTotal = createMockGauge();
export const graphOperationDuration = createMockHistogram();

// WebSocket metrics
export const websocketConnections = createMockGauge();
export const websocketMessages = createMockCounter();

// Investigation metrics
export const investigationsActive = createMockGauge();
export const investigationOperations = createMockCounter();

// Entity resolution merge outcomes
export const erMergeOutcomesTotal = createMockCounter();

// Deployment rollbacks
export const deploymentRollbacksTotal = createMockCounter();

// Error tracking
export const applicationErrors = createMockCounter();

// Memory usage
export const memoryUsage = createMockGauge();

// Pipeline SLI metrics
export const pipelineUptimeRatio = createMockGauge();
export const pipelineFreshnessSeconds = createMockGauge();
export const pipelineCompletenessRatio = createMockGauge();
export const pipelineCorrectnessRatio = createMockGauge();
export const pipelineLatencySeconds = createMockHistogram();

// GraphRAG metrics
export const graphragSchemaFailuresTotal = createMockCounter();
export const graphragCacheHitRatio = createMockGauge();

// PBAC metrics
export const pbacDecisionsTotal = createMockCounter();
export const admissionDecisionsTotal = createMockCounter();

// Docling service metrics
export const doclingInferenceDuration = createMockHistogram();
export const doclingInferenceTotal = createMockCounter();
export const doclingCharactersProcessed = createMockCounter();
export const doclingCostUsd = createMockCounter();

// Domain metrics
export const graphExpandRequestsTotal = createMockCounter();
export const aiRequestTotal = createMockCounter();
export const resolverLatencyMs = createMockHistogram();
export const neighborhoodCacheHitRatio = createMockGauge();
export const neighborhoodCacheLatencyMs = createMockHistogram();

// Enhanced GraphQL resolver metrics
export const graphqlResolverDurationSeconds = createMockHistogram();
export const graphqlResolverErrorsTotal = createMockCounter();
export const graphqlResolverCallsTotal = createMockCounter();

// Web Vitals metrics
export const webVitalValue = createMockGauge();

// Real-time updates metrics
export const realtimeConflictsTotal = createMockCounter();
export const idempotentHitsTotal = createMockCounter();

// Auto-remediation
export const serviceAutoRemediationsTotal = createMockCounter();

// Golden Path Metrics
export const goldenPathStepTotal = createMockCounter();

// UI Error Boundary Metrics
export const uiErrorBoundaryCatchTotal = createMockCounter();

// Circuit breaker and job queue
export const breakerState = createMockGauge();
export const intelgraphJobQueueDepth = createMockGauge();

// DORA Metrics (Maestro)
export const maestroDeploymentsTotal = createMockCounter();
export const maestroPrLeadTimeHours = createMockHistogram();
export const maestroChangeFailureRate = createMockGauge();
export const maestroMttrHours = createMockHistogram();
export const maestroDagExecutionDurationSeconds = createMockHistogram();
export const maestroJobExecutionDurationSeconds = createMockHistogram();

// Legacy IntelGraph metrics
export const intelgraphJobsProcessed = createMockCounter();
export const intelgraphOutboxSyncLatency = createMockHistogram();
export const intelgraphActiveConnections = createMockGauge();
export const intelgraphDatabaseQueryDuration = createMockHistogram();
export const intelgraphHttpRequestDuration = createMockHistogram();

// GraphRAG Query Preview metrics
export const intelgraphGraphragQueryTotal = createMockCounter();
export const intelgraphGraphragQueryDurationMs = createMockHistogram();
export const intelgraphQueryPreviewsTotal = createMockCounter();
export const intelgraphQueryPreviewLatencyMs = createMockHistogram();
export const intelgraphQueryPreviewErrorsTotal = createMockCounter();
export const intelgraphQueryPreviewExecutionsTotal = createMockCounter();
export const intelgraphGlassBoxRunsTotal = createMockCounter();
export const intelgraphGlassBoxRunDurationMs = createMockHistogram();
export const intelgraphGlassBoxCacheHits = createMockCounter();
export const intelgraphCacheHits = createMockCounter();
export const intelgraphCacheMisses = createMockCounter();

// Copilot API metrics
export const copilotApiRequestTotal = createMockCounter();
export const copilotApiRequestDurationMs = createMockHistogram();

// LLM Cost metrics
export const llmCostTotal = createMockCounter();

// Aggregate metrics object
export const metrics = {
  graphExpandRequestsTotal,
  aiRequestTotal,
  resolverLatencyMs,
  breakerState,
  intelgraphJobQueueDepth,
  graphragSchemaFailuresTotal,
  graphragCacheHitRatio,
  neighborhoodCacheHitRatio,
  neighborhoodCacheLatencyMs,
  pbacDecisionsTotal,
  businessUserSignupsTotal,
  businessApiCallsTotal,
  businessRevenueTotal,
  serviceAutoRemediationsTotal,
  goldenPathStepTotal,
  uiErrorBoundaryCatchTotal,
  maestroDeploymentsTotal,
  maestroPrLeadTimeHours,
  maestroChangeFailureRate,
  maestroMttrHours,
  maestroDagExecutionDurationSeconds,
  maestroJobExecutionDurationSeconds,
  httpRequestDuration,
  httpRequestsTotal,
  graphqlRequestDuration,
  graphqlRequestsTotal,
  graphqlErrors,
  dbConnectionsActive,
  dbQueryDuration,
  dbQueriesTotal,
  aiJobsQueued,
  aiJobsProcessing,
  aiJobDuration,
  aiJobsTotal,
  llmRequestDuration,
  llmTokensTotal,
  llmRequestsTotal,
  graphNodesTotal,
  graphEdgesTotal,
  graphOperationDuration,
  websocketConnections,
  websocketMessages,
  investigationsActive,
  investigationOperations,
  applicationErrors,
  tenantScopeViolationsTotal,
  memoryUsage,
  admissionDecisionsTotal,
  doclingInferenceDuration,
  doclingInferenceTotal,
  doclingCharactersProcessed,
  doclingCostUsd,
  pipelineUptimeRatio,
  pipelineFreshnessSeconds,
  pipelineCompletenessRatio,
  pipelineCorrectnessRatio,
  pipelineLatencySeconds,
  graphqlResolverDurationSeconds,
  graphqlResolverErrorsTotal,
  graphqlResolverCallsTotal,
  webVitalValue,
  realtimeConflictsTotal,
  idempotentHitsTotal,
};

export default {
  register,
  stopMetricsCollection,
  metrics,
  httpRequestDuration,
  httpRequestsTotal,
  businessUserSignupsTotal,
  businessApiCallsTotal,
  businessRevenueTotal,
  graphqlRequestDuration,
  graphqlRequestsTotal,
  graphqlErrors,
  tenantScopeViolationsTotal,
  dbConnectionsActive,
  dbQueryDuration,
  dbQueriesTotal,
  vectorQueryDurationSeconds,
  vectorQueriesTotal,
  aiJobsQueued,
  aiJobsProcessing,
  aiJobDuration,
  aiJobsTotal,
  llmRequestDuration,
  llmTokensTotal,
  llmRequestsTotal,
  graphNodesTotal,
  graphEdgesTotal,
  graphOperationDuration,
  websocketConnections,
  websocketMessages,
  investigationsActive,
  investigationOperations,
  erMergeOutcomesTotal,
  deploymentRollbacksTotal,
  applicationErrors,
  memoryUsage,
  graphragSchemaFailuresTotal,
  graphragCacheHitRatio,
  pbacDecisionsTotal,
  admissionDecisionsTotal,
  graphExpandRequestsTotal,
  aiRequestTotal,
  resolverLatencyMs,
  neighborhoodCacheHitRatio,
  neighborhoodCacheLatencyMs,
  graphqlResolverDurationSeconds,
  graphqlResolverErrorsTotal,
  graphqlResolverCallsTotal,
  webVitalValue,
  realtimeConflictsTotal,
  idempotentHitsTotal,
  serviceAutoRemediationsTotal,
  goldenPathStepTotal,
  uiErrorBoundaryCatchTotal,
  breakerState,
  intelgraphJobQueueDepth,
  maestroDeploymentsTotal,
  maestroPrLeadTimeHours,
  maestroChangeFailureRate,
  maestroMttrHours,
  maestroDagExecutionDurationSeconds,
  maestroJobExecutionDurationSeconds,
  pipelineUptimeRatio,
  pipelineFreshnessSeconds,
  pipelineCompletenessRatio,
  pipelineCorrectnessRatio,
  pipelineLatencySeconds,
  doclingInferenceDuration,
  doclingInferenceTotal,
  doclingCharactersProcessed,
  doclingCostUsd,
  intelgraphJobsProcessed,
  intelgraphOutboxSyncLatency,
  intelgraphActiveConnections,
  intelgraphDatabaseQueryDuration,
  intelgraphHttpRequestDuration,
  intelgraphGraphragQueryTotal,
  intelgraphGraphragQueryDurationMs,
  intelgraphQueryPreviewsTotal,
  intelgraphQueryPreviewLatencyMs,
  intelgraphQueryPreviewErrorsTotal,
  intelgraphQueryPreviewExecutionsTotal,
  intelgraphGlassBoxRunsTotal,
  intelgraphGlassBoxRunDurationMs,
  intelgraphGlassBoxCacheHits,
  intelgraphCacheHits,
  intelgraphCacheMisses,
  copilotApiRequestTotal,
  copilotApiRequestDurationMs,
  llmCostTotal,
};
