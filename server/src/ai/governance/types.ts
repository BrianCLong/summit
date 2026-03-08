/**
 * AI-Assisted Governance Types
 *
 * Type definitions for AI-augmented governance features including
 * policy suggestions, verdict explanations, and anomaly detection.
 *
 * @module ai/governance/types
 * @version 4.0.0-alpha
 */

import { GovernanceVerdict, PolicyAction } from '../../governance/types.js';

// Local ProvenanceMetadata definition (aligned with provenance-beta types)
export interface ProvenanceMetadata {
  id?: string;
  sourceId: string;
  sourceType: 'ai_model' | 'rule_engine' | 'human' | 'automated' | 'template_engine';
  modelVersion?: string;
  modelProvider?: string;
  inputHash: string;
  outputHash: string;
  timestamp: string;
  confidence?: number;
  reasoning?: string;
  method?: string;
  chainOfCustody: ChainOfCustodyEntry[];
}

export interface ChainOfCustodyEntry {
  timestamp: string;
  actor: string;
  action: string;
  hash: string;
}

// =============================================================================
// Policy Suggestion Types
// =============================================================================

export interface PolicySuggestion {
  id: string;
  suggestionType: PolicySuggestionType;
  title: string;
  description: string;
  rationale: string;
  suggestedPolicy: SuggestedPolicyDefinition;
  impactAnalysis: ImpactAnalysis;
  confidence: number; // 0.0 - 1.0
  priority: 'low' | 'medium' | 'high' | 'critical';
  relatedPolicies: string[]; // Existing policy IDs
  complianceFrameworks: string[]; // e.g., ['SOC2:CC6.1', 'GDPR:Art.25']
  createdAt: string; // ISO 8601
  expiresAt: string; // Suggestion validity
  status: SuggestionStatus;
  feedback?: SuggestionFeedback;
  governanceVerdict: GovernanceVerdict;
  provenance: ProvenanceMetadata;
}

export type PolicySuggestionType =
  | 'gap_detection' // Missing policy for compliance requirement
  | 'conflict_resolution' // Conflicting policies detected
  | 'optimization' // Simplify or merge redundant policies
  | 'risk_mitigation' // New risk pattern detected
  | 'regulatory_update' // Regulation changed
  | 'usage_based'; // Derived from usage patterns

export interface SuggestedPolicyDefinition {
  name: string;
  description: string;
  scope: PolicyScope;
  rules: SuggestedRule[];
  actions: PolicyAction[];
  effectiveDate?: string;
  sunset?: string;
}

export interface PolicyScope {
  tenants: string[] | '*';
  resources: string[] | '*';
  users: string[] | '*';
  environments: ('dev' | 'staging' | 'prod')[];
}

export interface SuggestedRule {
  field: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'in' | 'not_in' | 'contains' | 'matches';
  value: unknown;
  explanation: string; // Human-readable explanation of why this rule
}

export interface ImpactAnalysis {
  affectedTenants: number;
  affectedUsers: number;
  estimatedDenialRate: number; // 0.0 - 1.0
  breakingChanges: BreakingChange[];
  complianceImpact: ComplianceImpact[];
  performanceImpact: PerformanceImpact;
}

export interface BreakingChange {
  description: string;
  severity: 'low' | 'medium' | 'high';
  mitigation: string;
}

export interface ComplianceImpact {
  framework: string;
  control: string;
  impact: 'positive' | 'neutral' | 'negative';
  description: string;
}

export interface PerformanceImpact {
  estimatedLatencyDelta: number; // milliseconds
  estimatedResourceDelta: number; // percentage
}

export type SuggestionStatus =
  | 'pending' // Awaiting review
  | 'approved' // Accepted by admin
  | 'rejected' // Rejected by admin
  | 'implemented' // Policy created
  | 'expired'; // Suggestion expired

export interface SuggestionFeedback {
  reviewedBy: string;
  reviewedAt: string;
  decision: 'approve' | 'reject' | 'defer';
  reason?: string;
  modifications?: Partial<SuggestedPolicyDefinition>;
}

// =============================================================================
// Verdict Explanation Types
// =============================================================================

export interface ExplainedVerdict {
  originalVerdict: GovernanceVerdict;
  summary: string; // One-sentence plain English summary
  detailedExplanation: string; // Multi-paragraph explanation
  technicalDetails: TechnicalDetail[];
  remediationSteps: RemediationStep[];
  policyReferences: PolicyReference[];
  relatedExamples: RelatedExample[];
  confidence: number;
  tone: ExplanationTone;
  audience: ExplanationAudience;
  generatedAt: string;
  governanceVerdict: GovernanceVerdict; // Meta-governance on the explanation
  provenance: ProvenanceMetadata;
}

export interface TechnicalDetail {
  category: string;
  field: string;
  expected: string;
  actual: string;
  explanation: string;
}

export interface RemediationStep {
  order: number;
  action: string;
  description: string;
  automated: boolean;
  automationAction?: string; // If automated, what action to trigger
  estimatedEffort: 'trivial' | 'low' | 'medium' | 'high';
}

export interface PolicyReference {
  policyId: string;
  policyName: string;
  ruleId?: string;
  excerpt: string;
  documentationUrl?: string;
}

export interface RelatedExample {
  scenario: string;
  outcome: 'allowed' | 'denied';
  explanation: string;
}

export type ExplanationTone = 'formal' | 'friendly' | 'technical';
export type ExplanationAudience = 'end_user' | 'developer' | 'compliance_officer' | 'executive';

// =============================================================================
// Anomaly Detection Types
// =============================================================================

export interface BehavioralAnomaly {
  id: string;
  anomalyType: AnomalyType;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  detectedAt: string;
  affectedEntity: AffectedEntity;
  baselineBehavior: BaselineBehavior;
  observedBehavior: ObservedBehavior;
  deviation: DeviationMetrics;
  riskScore: number; // 0-100
  recommendedActions: RecommendedAction[];
  relatedAnomalies: string[]; // IDs of potentially related anomalies
  falsePositiveLikelihood: number; // 0.0 - 1.0
  evidenceChain: EvidenceItem[];
  status: AnomalyStatus;
  resolution?: AnomalyResolution;
  governanceVerdict: GovernanceVerdict;
  provenance: ProvenanceMetadata;
}

export type AnomalyType =
  | 'access_pattern' // Unusual access times, locations, resources
  | 'volume_spike' // Unusual data volume accessed
  | 'privilege_escalation' // Attempted or successful privilege escalation
  | 'policy_circumvention' // Attempts to bypass policies
  | 'data_exfiltration' // Potential data exfiltration patterns
  | 'credential_abuse' // Credential sharing or misuse
  | 'insider_threat' // Insider threat indicators
  | 'api_abuse'; // API rate anomalies, scraping patterns

export interface AffectedEntity {
  entityType: 'user' | 'service' | 'tenant' | 'resource';
  entityId: string;
  entityName?: string;
  tenantId?: string;
}

export interface BaselineBehavior {
  timeWindow: string; // e.g., '30d' for 30 days
  metrics: BehaviorMetric[];
  peerGroupComparison?: PeerGroupComparison;
}

export interface BehaviorMetric {
  name: string;
  value: number;
  unit: string;
  percentile?: number; // Where this falls in distribution
}

export interface PeerGroupComparison {
  groupDefinition: string;
  groupSize: number;
  entityPercentile: number;
}

export interface ObservedBehavior {
  observationWindow: string;
  metrics: BehaviorMetric[];
  rawEvents?: EventSummary[];
}

export interface EventSummary {
  timestamp: string;
  eventType: string;
  resourceId?: string;
  action?: string;
  outcome?: string;
}

export interface DeviationMetrics {
  standardDeviations: number;
  percentileJump: number;
  absoluteChange: number;
  relativeChange: number; // percentage
  statisticalSignificance: number; // p-value
}

export interface RecommendedAction {
  actionType: 'investigate' | 'block' | 'alert' | 'restrict' | 'monitor';
  description: string;
  urgency: 'immediate' | 'urgent' | 'standard' | 'low';
  automated: boolean;
  automationConfig?: Record<string, unknown>;
  requiredRole: string;
}

export interface EvidenceItem {
  evidenceType: string;
  description: string;
  data: Record<string, unknown>;
  timestamp: string;
  source: string;
}

export type AnomalyStatus =
  | 'new' // Just detected
  | 'investigating' // Under investigation
  | 'confirmed' // Confirmed as true positive
  | 'false_positive' // Marked as false positive
  | 'mitigated' // Action taken
  | 'escalated'; // Escalated to security team

export interface AnomalyResolution {
  resolvedBy: string;
  resolvedAt: string;
  resolution: 'confirmed_threat' | 'false_positive' | 'acceptable_risk' | 'mitigated';
  notes: string;
  actionsTaken: string[];
}

// =============================================================================
// AI Governance Service Configuration
// =============================================================================

export interface AIGovernanceConfig {
  enabled: boolean;
  policySuggestions: {
    enabled: boolean;
    maxSuggestionsPerDay: number;
    minConfidenceThreshold: number;
    requireHumanApproval: boolean;
  };
  verdictExplanations: {
    enabled: boolean;
    defaultAudience: ExplanationAudience;
    defaultTone: ExplanationTone;
    cacheExplanations: boolean;
    cacheTTLSeconds: number;
  };
  anomalyDetection: {
    enabled: boolean;
    detectionIntervalSeconds: number;
    minAnomalyScore: number;
    autoBlockThreshold: number;
    alertChannels: string[];
  };
  privacySettings: {
    federatedLearning: boolean;
    differentialPrivacy: boolean;
    epsilonBudget: number; // For differential privacy
    dataRetentionDays: number;
    piiRedaction: boolean;
  };
  llmSettings: {
    provider: 'openai' | 'anthropic' | 'ollama' | 'mock';
    model: string;
    maxTokens: number;
    temperature: number;
    timeout: number;
  };
}

// =============================================================================
// Service Interfaces
// =============================================================================

export interface PolicySuggestionService {
  generateSuggestions(context: SuggestionContext): Promise<PolicySuggestion[]>;
  getSuggestion(id: string): Promise<PolicySuggestion | null>;
  reviewSuggestion(id: string, feedback: SuggestionFeedback): Promise<PolicySuggestion>;
  implementSuggestion(id: string): Promise<{ policyId: string }>;
}

export interface SuggestionContext {
  tenantId: string;
  triggeredBy: 'scheduled' | 'manual' | 'event';
  focusAreas?: PolicySuggestionType[];
  complianceFrameworks?: string[];
  timeRange?: { start: string; end: string };
}

export interface VerdictExplainerService {
  explainVerdict(
    verdict: GovernanceVerdict,
    context: ExplanationContext
  ): Promise<ExplainedVerdict>;
  batchExplain(
    verdicts: GovernanceVerdict[],
    context: ExplanationContext
  ): Promise<ExplainedVerdict[]>;
}

export interface ExplanationContext {
  audience: ExplanationAudience;
  tone: ExplanationTone;
  locale?: string;
  includeExamples?: boolean;
  maxLength?: number;
  tenantId?: string;
  userId?: string;
}

export interface AnomalyDetectionService {
  detectAnomalies(scope: AnomalyDetectionScope): Promise<BehavioralAnomaly[]>;
  getAnomaly(id: string): Promise<BehavioralAnomaly | null>;
  updateAnomalyStatus(id: string, status: AnomalyStatus, notes?: string): Promise<BehavioralAnomaly>;
  resolveAnomaly(id: string, resolution: AnomalyResolution): Promise<BehavioralAnomaly>;
  getAnomalyTrends(tenantId: string, timeRange: { start: string; end: string }): Promise<AnomalyTrends>;
}

export interface AnomalyDetectionScope {
  tenantIds?: string[];
  entityTypes?: AffectedEntity['entityType'][];
  anomalyTypes?: AnomalyType[];
  minSeverity?: BehavioralAnomaly['severity'];
  timeRange: { start: string; end: string };
}

export interface AnomalyTrends {
  totalAnomalies: number;
  byType: Record<AnomalyType, number>;
  bySeverity: Record<string, number>;
  trend: 'increasing' | 'stable' | 'decreasing';
  topAffectedEntities: AffectedEntity[];
}
