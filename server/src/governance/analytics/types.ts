// AI Governance Analytics Types
// Types for governance metrics dashboard per ODNI compliance requirements

export interface AIGovernanceMetrics {
  validationRate: ValidationMetrics;
  incidentTrends: IncidentTrendData;
  complianceGaps: ComplianceGap[];
  riskScore: RiskScoreData;
  auditTrail: AuditEvent[];
  modelGovernance: ModelGovernanceMetrics;
  timestamp: number;
}

/**
 * ODNI-mandated 85% validation tracking
 */
export interface ValidationMetrics {
  totalDecisions: number;
  validatedDecisions: number;
  validationRate: number; // Must track >= 85% per ODNI
  targetRate: number; // 85%
  trend: TrendDirection;
  breakdown: ValidationBreakdown[];
  lastUpdated: number;
}

export interface ValidationBreakdown {
  category: string;
  validated: number;
  total: number;
  rate: number;
  compliant: boolean;
}

export interface IncidentTrendData {
  current: IncidentPeriod;
  previous: IncidentPeriod;
  trend: TrendDirection;
  byCategory: IncidentCategory[];
  bySeverity: SeverityBreakdown[];
  timeline: TimelinePoint[];
}

export interface IncidentPeriod {
  totalIncidents: number;
  resolvedIncidents: number;
  mttr: number; // Mean time to resolve (seconds)
  startDate: number;
  endDate: number;
}

export interface IncidentCategory {
  name: string;
  count: number;
  percentOfTotal: number;
  trend: TrendDirection;
}

export interface SeverityBreakdown {
  severity: 'critical' | 'high' | 'medium' | 'low';
  count: number;
  percentOfTotal: number;
  avgResolutionTime: number;
}

export interface TimelinePoint {
  timestamp: number;
  incidents: number;
  resolved: number;
  validationRate: number;
}

export interface ComplianceGap {
  id: string;
  framework: string;
  requirement: string;
  category: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  currentState: string;
  requiredState: string;
  remediationPlan?: string;
  dueDate?: number;
  owner?: string;
  status: 'open' | 'in_progress' | 'mitigated' | 'accepted';
  createdAt: number;
  updatedAt: number;
}

export interface RiskScoreData {
  overall: number; // 0-100
  components: RiskComponent[];
  trend: TrendDirection;
  historicalScores: HistoricalScore[];
}

export interface RiskComponent {
  name: string;
  score: number;
  weight: number;
  contributedScore: number;
  status: 'healthy' | 'warning' | 'critical';
}

export interface HistoricalScore {
  timestamp: number;
  score: number;
}

export interface AuditEvent {
  id: string;
  timestamp: number;
  eventType: AuditEventType;
  actor: string;
  resource: string;
  action: string;
  outcome: 'success' | 'failure' | 'partial';
  details: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export type AuditEventType =
  | 'model_deployment'
  | 'policy_change'
  | 'access_grant'
  | 'access_revoke'
  | 'data_access'
  | 'configuration_change'
  | 'incident_created'
  | 'incident_resolved'
  | 'validation_performed'
  | 'compliance_check';

export interface ModelGovernanceMetrics {
  totalModels: number;
  approvedModels: number;
  pendingReview: number;
  rejectedModels: number;
  modelsByRiskTier: RiskTierBreakdown[];
  deploymentMetrics: DeploymentMetrics;
  biasMetrics: BiasMetrics;
}

export interface RiskTierBreakdown {
  tier: 'low' | 'medium' | 'high' | 'critical';
  count: number;
  percentOfTotal: number;
}

export interface DeploymentMetrics {
  totalDeployments: number;
  successfulDeployments: number;
  failedDeployments: number;
  rolledBack: number;
  avgDeploymentTime: number;
}

export interface BiasMetrics {
  modelsAudited: number;
  biasDetected: number;
  biasRemediations: number;
  lastAuditDate: number;
}

export type TrendDirection = 'up' | 'down' | 'stable';

// Prometheus query configuration
export interface PrometheusQueryConfig {
  endpoint: string;
  queries: Record<string, string>;
  refreshIntervalMs: number;
  timeoutMs: number;
}

// Dashboard configuration
export interface GovernanceDashboardConfig {
  refreshIntervalSeconds: number;
  defaultTimeRange: TimeRange;
  alertThresholds: AlertThresholds;
  features: FeatureFlags;
}

export interface TimeRange {
  start: number;
  end: number;
  label: string;
}

export interface AlertThresholds {
  validationRateWarning: number; // e.g., 88%
  validationRateCritical: number; // 85% ODNI minimum
  riskScoreWarning: number;
  riskScoreCritical: number;
  incidentCountWarning: number;
  incidentCountCritical: number;
}

export interface FeatureFlags {
  realTimeUpdates: boolean;
  exportEnabled: boolean;
  alertsEnabled: boolean;
  advancedAnalytics: boolean;
}

// GraphQL response types
export interface GovernanceMetricsResponse {
  governanceMetrics: AIGovernanceMetrics;
  loading: boolean;
  error?: string;
}

export interface GovernanceMetricsInput {
  tenantId: string;
  timeRange: TimeRange;
  frameworks?: string[];
  includeHistorical?: boolean;
}
