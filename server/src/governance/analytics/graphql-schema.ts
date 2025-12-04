// GraphQL Schema for AI Governance Metrics Dashboard
// Provides real-time governance metrics with ODNI compliance tracking

import { gql } from 'graphql-tag';

export const governanceMetricsTypeDefs = gql`
  """
  Time range for querying governance metrics
  """
  input TimeRangeInput {
    start: Float!
    end: Float!
    label: String
  }

  """
  Input for querying governance metrics
  """
  input GovernanceMetricsInput {
    tenantId: String!
    timeRange: TimeRangeInput!
    frameworks: [String!]
    includeHistorical: Boolean
  }

  """
  Trend direction indicator
  """
  enum TrendDirection {
    UP
    DOWN
    STABLE
  }

  """
  Severity levels for compliance gaps and incidents
  """
  enum Severity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  """
  Status of a compliance gap
  """
  enum ComplianceGapStatus {
    OPEN
    IN_PROGRESS
    MITIGATED
    ACCEPTED
  }

  """
  Component health status
  """
  enum HealthStatus {
    HEALTHY
    WARNING
    CRITICAL
  }

  """
  ODNI-mandated validation metrics (85% target)
  """
  type ValidationMetrics {
    totalDecisions: Int!
    validatedDecisions: Int!
    validationRate: Float!
    targetRate: Float!
    trend: TrendDirection!
    breakdown: [ValidationBreakdown!]!
    lastUpdated: Float!
    """
    Whether current rate meets ODNI 85% requirement
    """
    meetsODNIRequirement: Boolean!
  }

  """
  Validation breakdown by category
  """
  type ValidationBreakdown {
    category: String!
    validated: Int!
    total: Int!
    rate: Float!
    compliant: Boolean!
  }

  """
  Incident period statistics
  """
  type IncidentPeriod {
    totalIncidents: Int!
    resolvedIncidents: Int!
    mttr: Int!
    startDate: Float!
    endDate: Float!
  }

  """
  Incident category breakdown
  """
  type IncidentCategory {
    name: String!
    count: Int!
    percentOfTotal: Float!
    trend: TrendDirection!
  }

  """
  Incident severity breakdown
  """
  type SeverityBreakdown {
    severity: Severity!
    count: Int!
    percentOfTotal: Float!
    avgResolutionTime: Int!
  }

  """
  Timeline data point for incident visualization
  """
  type TimelinePoint {
    timestamp: Float!
    incidents: Int!
    resolved: Int!
    validationRate: Float!
  }

  """
  Incident trend data for visualization
  """
  type IncidentTrendData {
    current: IncidentPeriod!
    previous: IncidentPeriod!
    trend: TrendDirection!
    byCategory: [IncidentCategory!]!
    bySeverity: [SeverityBreakdown!]!
    timeline: [TimelinePoint!]!
  }

  """
  Compliance gap - explicit display of non-compliance
  """
  type ComplianceGap {
    id: ID!
    framework: String!
    requirement: String!
    category: String!
    severity: Severity!
    description: String!
    currentState: String!
    requiredState: String!
    remediationPlan: String
    dueDate: Float
    owner: String
    status: ComplianceGapStatus!
    createdAt: Float!
    updatedAt: Float!
    """
    Days until due date (negative if overdue)
    """
    daysUntilDue: Int
  }

  """
  Risk component score
  """
  type RiskComponent {
    name: String!
    score: Float!
    weight: Float!
    contributedScore: Float!
    status: HealthStatus!
  }

  """
  Historical risk score point
  """
  type HistoricalScore {
    timestamp: Float!
    score: Float!
  }

  """
  Overall risk score data
  """
  type RiskScoreData {
    overall: Float!
    components: [RiskComponent!]!
    trend: TrendDirection!
    historicalScores: [HistoricalScore!]!
    """
    Risk level classification
    """
    riskLevel: Severity!
  }

  """
  Audit event types
  """
  enum AuditEventType {
    MODEL_DEPLOYMENT
    POLICY_CHANGE
    ACCESS_GRANT
    ACCESS_REVOKE
    DATA_ACCESS
    CONFIGURATION_CHANGE
    INCIDENT_CREATED
    INCIDENT_RESOLVED
    VALIDATION_PERFORMED
    COMPLIANCE_CHECK
  }

  """
  Audit event outcome
  """
  enum AuditOutcome {
    SUCCESS
    FAILURE
    PARTIAL
  }

  """
  Audit trail event
  """
  type AuditEvent {
    id: ID!
    timestamp: Float!
    eventType: AuditEventType!
    actor: String!
    resource: String!
    action: String!
    outcome: AuditOutcome!
    riskLevel: Severity!
  }

  """
  Risk tier breakdown for models
  """
  type RiskTierBreakdown {
    tier: Severity!
    count: Int!
    percentOfTotal: Float!
  }

  """
  Model deployment metrics
  """
  type DeploymentMetrics {
    totalDeployments: Int!
    successfulDeployments: Int!
    failedDeployments: Int!
    rolledBack: Int!
    avgDeploymentTime: Int!
    successRate: Float!
  }

  """
  Bias detection and remediation metrics
  """
  type BiasMetrics {
    modelsAudited: Int!
    biasDetected: Int!
    biasRemediations: Int!
    lastAuditDate: Float!
    detectionRate: Float!
  }

  """
  Model governance metrics
  """
  type ModelGovernanceMetrics {
    totalModels: Int!
    approvedModels: Int!
    pendingReview: Int!
    rejectedModels: Int!
    modelsByRiskTier: [RiskTierBreakdown!]!
    deploymentMetrics: DeploymentMetrics!
    biasMetrics: BiasMetrics!
    approvalRate: Float!
  }

  """
  Alert thresholds configuration
  """
  type AlertThresholds {
    validationRateWarning: Float!
    validationRateCritical: Float!
    riskScoreWarning: Float!
    riskScoreCritical: Float!
    incidentCountWarning: Int!
    incidentCountCritical: Int!
  }

  """
  Feature flags for dashboard
  """
  type FeatureFlags {
    realTimeUpdates: Boolean!
    exportEnabled: Boolean!
    alertsEnabled: Boolean!
    advancedAnalytics: Boolean!
  }

  """
  Dashboard configuration
  """
  type GovernanceDashboardConfig {
    refreshIntervalSeconds: Int!
    defaultTimeRange: TimeRange!
    alertThresholds: AlertThresholds!
    features: FeatureFlags!
  }

  """
  Time range type
  """
  type TimeRange {
    start: Float!
    end: Float!
    label: String!
  }

  """
  Complete AI Governance Metrics
  """
  type AIGovernanceMetrics {
    validationRate: ValidationMetrics!
    incidentTrends: IncidentTrendData!
    complianceGaps: [ComplianceGap!]!
    riskScore: RiskScoreData!
    auditTrail: [AuditEvent!]!
    modelGovernance: ModelGovernanceMetrics!
    timestamp: Float!
    """
    Overall compliance status
    """
    overallCompliance: ComplianceStatus!
  }

  """
  Overall compliance status summary
  """
  type ComplianceStatus {
    isCompliant: Boolean!
    validationMeetsODNI: Boolean!
    criticalGapsCount: Int!
    highGapsCount: Int!
    riskLevel: Severity!
    lastAssessment: Float!
  }

  extend type Query {
    """
    Get AI governance metrics for the dashboard
    """
    governanceMetrics(input: GovernanceMetricsInput!): AIGovernanceMetrics!

    """
    Get dashboard configuration
    """
    governanceDashboardConfig: GovernanceDashboardConfig!

    """
    Get compliance gaps filtered by framework and severity
    """
    complianceGaps(
      tenantId: String!
      framework: String
      severity: Severity
      status: ComplianceGapStatus
    ): [ComplianceGap!]!

    """
    Get validation rate history for trend analysis
    """
    validationRateHistory(
      tenantId: String!
      timeRange: TimeRangeInput!
    ): [TimelinePoint!]!

    """
    Get audit trail with filters
    """
    auditTrail(
      tenantId: String!
      eventType: AuditEventType
      limit: Int
      offset: Int
    ): [AuditEvent!]!
  }

  extend type Subscription {
    """
    Subscribe to real-time governance metrics updates
    """
    governanceMetricsUpdated(tenantId: String!): AIGovernanceMetrics!

    """
    Subscribe to new compliance gaps
    """
    complianceGapCreated(tenantId: String!): ComplianceGap!

    """
    Subscribe to incident updates
    """
    incidentUpdated(tenantId: String!): IncidentTrendData!
  }
`;

// Resolver implementations
export const governanceMetricsResolvers = {
  Query: {
    governanceMetrics: async (
      _parent: unknown,
      { input }: { input: { tenantId: string; timeRange: { start: number; end: number; label?: string } } },
      context: { governanceMetricsService: { getGovernanceMetrics: Function } },
    ) => {
      const metrics = await context.governanceMetricsService.getGovernanceMetrics(
        input.tenantId,
        input.timeRange,
      );

      // Add computed fields
      return {
        ...metrics,
        overallCompliance: {
          isCompliant:
            metrics.validationRate.validationRate >= 85 &&
            metrics.complianceGaps.filter((g: { severity: string }) => g.severity === 'critical')
              .length === 0,
          validationMeetsODNI: metrics.validationRate.validationRate >= 85,
          criticalGapsCount: metrics.complianceGaps.filter(
            (g: { severity: string }) => g.severity === 'critical',
          ).length,
          highGapsCount: metrics.complianceGaps.filter((g: { severity: string }) => g.severity === 'high')
            .length,
          riskLevel:
            metrics.riskScore.overall >= 80
              ? 'LOW'
              : metrics.riskScore.overall >= 50
                ? 'MEDIUM'
                : 'HIGH',
          lastAssessment: metrics.timestamp,
        },
      };
    },

    governanceDashboardConfig: async (
      _parent: unknown,
      _args: unknown,
      context: { governanceMetricsService: { getDashboardConfig: Function } },
    ) => {
      return context.governanceMetricsService.getDashboardConfig();
    },

    complianceGaps: async (
      _parent: unknown,
      args: { tenantId: string; framework?: string; severity?: string; status?: string },
      context: { governanceMetricsService: { getComplianceGaps: Function } },
    ) => {
      let gaps = await context.governanceMetricsService.getComplianceGaps(
        args.tenantId,
      );

      if (args.framework) {
        gaps = gaps.filter((g: { framework: string }) => g.framework === args.framework);
      }
      if (args.severity) {
        gaps = gaps.filter(
          (g: { severity: string }) => g.severity.toUpperCase() === args.severity,
        );
      }
      if (args.status) {
        gaps = gaps.filter((g: { status: string }) => g.status.toUpperCase() === args.status);
      }

      return gaps;
    },

    validationRateHistory: async (
      _parent: unknown,
      args: { tenantId: string; timeRange: { start: number; end: number } },
      context: { governanceMetricsService: { getIncidentTrends: Function } },
    ) => {
      const trends = await context.governanceMetricsService.getIncidentTrends(
        args.tenantId,
        args.timeRange,
      );
      return trends.timeline;
    },

    auditTrail: async (
      _parent: unknown,
      args: { tenantId: string; eventType?: string; limit?: number; offset?: number },
      context: { governanceMetricsService: { getRecentAuditEvents: Function } },
    ) => {
      const limit = args.limit || 50;
      let events = await context.governanceMetricsService.getRecentAuditEvents(
        args.tenantId,
        limit + (args.offset || 0),
      );

      if (args.eventType) {
        events = events.filter(
          (e: { eventType: string }) => e.eventType.toUpperCase() === args.eventType,
        );
      }

      if (args.offset) {
        events = events.slice(args.offset);
      }

      return events.slice(0, limit);
    },
  },

  ValidationMetrics: {
    meetsODNIRequirement: (parent: { validationRate: number; targetRate: number }) =>
      parent.validationRate >= parent.targetRate,
  },

  ComplianceGap: {
    daysUntilDue: (parent: { dueDate?: number }) => {
      if (!parent.dueDate) return null;
      const daysMs = parent.dueDate - Date.now();
      return Math.ceil(daysMs / (24 * 60 * 60 * 1000));
    },
  },

  RiskScoreData: {
    riskLevel: (parent: { overall: number }) => {
      if (parent.overall >= 80) return 'LOW';
      if (parent.overall >= 60) return 'MEDIUM';
      if (parent.overall >= 40) return 'HIGH';
      return 'CRITICAL';
    },
  },

  DeploymentMetrics: {
    successRate: (parent: { successfulDeployments: number; totalDeployments: number }) =>
      parent.totalDeployments > 0
        ? (parent.successfulDeployments / parent.totalDeployments) * 100
        : 0,
  },

  BiasMetrics: {
    detectionRate: (parent: { biasDetected: number; modelsAudited: number }) =>
      parent.modelsAudited > 0
        ? (parent.biasDetected / parent.modelsAudited) * 100
        : 0,
  },

  ModelGovernanceMetrics: {
    approvalRate: (parent: { approvedModels: number; totalModels: number }) =>
      parent.totalModels > 0
        ? (parent.approvedModels / parent.totalModels) * 100
        : 0,
  },
};
