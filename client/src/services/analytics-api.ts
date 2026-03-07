/**
 * Analytics API Client
 *
 * Frontend API client for governance and compliance analytics.
 *
 * SOC 2 Controls: CC7.2, PI1.1, CC2.1
 *
 * @module services/analytics-api
 */

import { apiFetch, getAuthHeaders } from "./api";

// ============================================================================
// Types
// ============================================================================

export interface DataEnvelope<T> {
  data: T;
  meta: {
    source: string;
    timestamp: string;
    requestId: string;
    actor?: string;
  };
  governance: {
    result: string;
    policyId: string;
    reason: string;
    evaluator: string;
  };
}

export interface TimeRange {
  start: string;
  end: string;
  granularity: "hour" | "day" | "week" | "month";
}

// Governance Metrics Types
export interface VerdictDistribution {
  allow: number;
  deny: number;
  escalate: number;
  warn: number;
  total: number;
  period: string;
}

export interface VerdictTrend {
  date: string;
  allow: number;
  deny: number;
  escalate: number;
  warn: number;
}

export interface PolicyEffectiveness {
  policyId: string;
  policyName: string;
  triggerCount: number;
  denyRate: number;
  escalateRate: number;
  averageLatencyMs: number;
  lastTriggered: string | null;
}

export interface AnomalyEvent {
  id: string;
  type: "spike" | "drop" | "pattern" | "outlier";
  severity: "low" | "medium" | "high" | "critical";
  metric: string;
  description: string;
  detectedAt: string;
  value: number;
  baseline: number;
  deviation: number;
}

export interface GovernanceMetricsSummary {
  verdictDistribution: VerdictDistribution;
  topPolicies: PolicyEffectiveness[];
  recentAnomalies: AnomalyEvent[];
  healthScore: number;
  lastUpdated: string;
}

// Compliance Metrics Types
export interface ControlStatus {
  controlId: string;
  controlName: string;
  framework: string;
  status: "compliant" | "partially_compliant" | "non_compliant" | "not_assessed";
  lastAssessed: string | null;
  evidenceCount: number;
  gapCount: number;
}

export interface ControlEffectiveness {
  controlId: string;
  controlName: string;
  effectiveness: number;
  testsPassed: number;
  testsFailed: number;
  lastTested: string | null;
  trend: "improving" | "stable" | "declining";
}

export interface EvidenceStatus {
  total: number;
  current: number;
  expiring: number;
  expired: number;
  byType: Record<string, number>;
}

export interface AuditReadiness {
  overallScore: number;
  frameworkScores: Record<string, number>;
  controlCoverage: number;
  evidenceCoverage: number;
  gapCount: number;
  criticalGaps: number;
  recommendations: string[];
}

export interface FrameworkStatus {
  framework: string;
  displayName: string;
  totalControls: number;
  compliantControls: number;
  compliancePercentage: number;
  lastAudit: string | null;
  nextAudit: string | null;
}

export interface ComplianceSummary {
  auditReadiness: AuditReadiness;
  controlsByStatus: Record<string, number>;
  evidenceStatus: EvidenceStatus;
  recentActivity: ComplianceActivity[];
  frameworks: FrameworkStatus[];
}

export interface ComplianceActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  actor?: string;
  controlId?: string;
}

// ============================================================================
// Helper Functions
// ============================================================================

const buildTimeRangeParams = (timeRange?: Partial<TimeRange>): string => {
  const params = new URLSearchParams();
  if (timeRange?.start) params.set("start", timeRange.start);
  if (timeRange?.end) params.set("end", timeRange.end);
  if (timeRange?.granularity) params.set("granularity", timeRange.granularity);
  return params.toString();
};

// ============================================================================
// API Clients
// ============================================================================

const GOVERNANCE_BASE = "/api/analytics/governance";
const COMPLIANCE_BASE = "/api/analytics/compliance";

/**
 * Governance Metrics API
 */
export const GovernanceMetricsAPI = {
  /**
   * Get governance metrics summary
   */
  async getSummary(
    timeRange?: Partial<TimeRange>
  ): Promise<DataEnvelope<GovernanceMetricsSummary>> {
    const params = buildTimeRangeParams(timeRange);
    const url = params ? `${GOVERNANCE_BASE}/summary?${params}` : `${GOVERNANCE_BASE}/summary`;
    return apiFetch(url, { headers: getAuthHeaders() });
  },

  /**
   * Get verdict distribution
   */
  async getVerdictDistribution(
    timeRange?: Partial<TimeRange>
  ): Promise<DataEnvelope<VerdictDistribution>> {
    const params = buildTimeRangeParams(timeRange);
    const url = params ? `${GOVERNANCE_BASE}/verdicts?${params}` : `${GOVERNANCE_BASE}/verdicts`;
    return apiFetch(url, { headers: getAuthHeaders() });
  },

  /**
   * Get verdict trends over time
   */
  async getVerdictTrends(timeRange?: Partial<TimeRange>): Promise<DataEnvelope<VerdictTrend[]>> {
    const params = buildTimeRangeParams(timeRange);
    const url = params ? `${GOVERNANCE_BASE}/trends?${params}` : `${GOVERNANCE_BASE}/trends`;
    return apiFetch(url, { headers: getAuthHeaders() });
  },

  /**
   * Get policy effectiveness metrics
   */
  async getPolicyEffectiveness(
    timeRange?: Partial<TimeRange>,
    limit?: number
  ): Promise<DataEnvelope<PolicyEffectiveness[]>> {
    const params = new URLSearchParams();
    if (timeRange?.start) params.set("start", timeRange.start);
    if (timeRange?.end) params.set("end", timeRange.end);
    if (limit) params.set("limit", String(limit));
    const url = params.toString()
      ? `${GOVERNANCE_BASE}/policies?${params}`
      : `${GOVERNANCE_BASE}/policies`;
    return apiFetch(url, { headers: getAuthHeaders() });
  },

  /**
   * Get detected anomalies
   */
  async getAnomalies(timeRange?: Partial<TimeRange>): Promise<DataEnvelope<AnomalyEvent[]>> {
    const params = buildTimeRangeParams(timeRange);
    const url = params ? `${GOVERNANCE_BASE}/anomalies?${params}` : `${GOVERNANCE_BASE}/anomalies`;
    return apiFetch(url, { headers: getAuthHeaders() });
  },
};

/**
 * Compliance Metrics API
 */
export const ComplianceMetricsAPI = {
  /**
   * Get compliance summary
   */
  async getSummary(): Promise<DataEnvelope<ComplianceSummary>> {
    return apiFetch(`${COMPLIANCE_BASE}/summary`, { headers: getAuthHeaders() });
  },

  /**
   * Get audit readiness score
   */
  async getAuditReadiness(): Promise<DataEnvelope<AuditReadiness>> {
    return apiFetch(`${COMPLIANCE_BASE}/readiness`, { headers: getAuthHeaders() });
  },

  /**
   * Get control status
   */
  async getControlStatus(framework?: string): Promise<DataEnvelope<ControlStatus[]>> {
    const url = framework
      ? `${COMPLIANCE_BASE}/controls?framework=${framework}`
      : `${COMPLIANCE_BASE}/controls`;
    return apiFetch(url, { headers: getAuthHeaders() });
  },

  /**
   * Get control effectiveness
   */
  async getControlEffectiveness(): Promise<DataEnvelope<ControlEffectiveness[]>> {
    return apiFetch(`${COMPLIANCE_BASE}/effectiveness`, { headers: getAuthHeaders() });
  },

  /**
   * Get evidence status
   */
  async getEvidenceStatus(): Promise<DataEnvelope<EvidenceStatus>> {
    return apiFetch(`${COMPLIANCE_BASE}/evidence`, { headers: getAuthHeaders() });
  },

  /**
   * Get framework status
   */
  async getFrameworkStatus(): Promise<DataEnvelope<FrameworkStatus[]>> {
    return apiFetch(`${COMPLIANCE_BASE}/frameworks`, { headers: getAuthHeaders() });
  },
};

/**
 * Combined Analytics API
 */
export const AnalyticsAPI = {
  governance: GovernanceMetricsAPI,
  compliance: ComplianceMetricsAPI,
};

export default AnalyticsAPI;
