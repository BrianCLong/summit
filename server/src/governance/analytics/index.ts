// Governance Analytics Module Index
// Exports all governance analytics components for use across the platform

export * from './types.js';
export * from './prometheus-queries.js';
export * from './governance-metrics-service.js';
export * from './graphql-schema.js';

// Re-export commonly used items for convenience
export {
  GovernanceMetricsService,
  createGovernanceMetricsService,
  governanceMetricsService,
  governanceDashboardLatency,
  governanceMetricsRefreshLatency,
  governanceValidationRateGauge,
  governanceComplianceGapsGauge,
  governanceRiskScoreGauge,
} from './governance-metrics-service.js';

export {
  VALIDATION_QUERIES,
  INCIDENT_QUERIES,
  COMPLIANCE_QUERIES,
  MODEL_GOVERNANCE_QUERIES,
  RISK_QUERIES,
  PERFORMANCE_QUERIES,
  buildPrometheusInstantQuery,
  buildPrometheusRangeQuery,
  getAllQueries,
} from './prometheus-queries.js';

export {
  governanceMetricsTypeDefs,
  governanceMetricsResolvers,
} from './graphql-schema.js';

export {
  governanceRoutes,
} from './routes.js';

// Type exports
export type {
  AIGovernanceMetrics,
  ValidationMetrics,
  ValidationBreakdown,
  IncidentTrendData,
  IncidentPeriod,
  IncidentCategory,
  SeverityBreakdown,
  TimelinePoint,
  ComplianceGap,
  RiskScoreData,
  RiskComponent,
  HistoricalScore,
  AuditEvent,
  AuditEventType,
  ModelGovernanceMetrics,
  RiskTierBreakdown,
  DeploymentMetrics,
  BiasMetrics,
  TrendDirection,
  PrometheusQueryConfig,
  GovernanceDashboardConfig,
  TimeRange,
  AlertThresholds,
  FeatureFlags,
  GovernanceMetricsResponse,
  GovernanceMetricsInput,
  GovernanceMetricsServiceConfig,
} from './types.js';
