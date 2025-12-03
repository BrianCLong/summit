/**
 * Agent Fleet Governance - Core Type Definitions
 *
 * Defines interfaces for misuse-aware orchestration, incident response,
 * hallucination audits, and SLSA/cosign provenance for AI agent fleets.
 *
 * Aligned with IC FY28 validation requirements.
 */

// ============================================================================
// Agent Identity & Classification
// ============================================================================

export type AgentId = string;
export type FleetId = string;
export type SessionId = string;
export type ProvenanceId = string;

export type AgentClassification =
  | 'UNCLASSIFIED'
  | 'CUI'
  | 'CONFIDENTIAL'
  | 'SECRET'
  | 'TOP_SECRET'
  | 'SCI'
  | 'SAP';

export type AgentTrustLevel = 'untrusted' | 'basic' | 'elevated' | 'privileged' | 'sovereign';

export type AgentCapability =
  | 'read'
  | 'write'
  | 'execute'
  | 'analyze'
  | 'recommend'
  | 'action'
  | 'chain'
  | 'delegate';

// ============================================================================
// OPA Policy Engine Types
// ============================================================================

export interface AgentPolicyContext {
  agentId: AgentId;
  fleetId: FleetId;
  sessionId: SessionId;
  trustLevel: AgentTrustLevel;
  classification: AgentClassification;
  capabilities: AgentCapability[];
  requestedAction: string;
  targetResource: string;
  resourceAttributes?: Record<string, unknown>;
  userContext: {
    userId: string;
    roles: string[];
    clearance: AgentClassification;
    organization: string;
  };
  environmentContext: {
    timestamp: number;
    ipAddress?: string;
    airgapped: boolean;
    federalEnvironment: boolean;
    slsaLevel: 'SLSA_0' | 'SLSA_1' | 'SLSA_2' | 'SLSA_3' | 'SLSA_4';
  };
}

export interface PolicyDecision {
  allow: boolean;
  reason: string;
  policyPath: string;
  conditions?: PolicyCondition[];
  requiredApprovals?: string[];
  auditLevel: 'info' | 'warn' | 'alert' | 'critical';
  mitigations?: PolicyMitigation[];
  expiresAt?: Date;
}

export interface PolicyCondition {
  type: 'rate_limit' | 'approval_required' | 'audit_enhanced' | 'capability_restricted';
  parameters: Record<string, unknown>;
  enforced: boolean;
}

export interface PolicyMitigation {
  action: 'throttle' | 'sandbox' | 'escalate' | 'block' | 'rollback';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  automated: boolean;
}

// ============================================================================
// Multi-LLM Prompt Chaining Types
// ============================================================================

export interface LLMProvider {
  id: string;
  name: string;
  endpoint: string;
  model: string;
  capabilities: string[];
  costPerToken: number;
  latencyMs: number;
  trustLevel: AgentTrustLevel;
  slsaProvenance?: ProvenanceId;
}

export interface PromptChainStep {
  id: string;
  sequence: number;
  llmProvider: string;
  prompt: PromptTemplate;
  inputMappings: Record<string, string>;
  outputMappings: Record<string, string>;
  validations: PromptValidation[];
  fallback?: string;
  timeout: number;
  retryPolicy: RetryPolicy;
}

export interface PromptTemplate {
  template: string;
  systemPrompt?: string;
  variables: string[];
  maxTokens: number;
  temperature: number;
  classification: AgentClassification;
}

export interface PromptValidation {
  type: 'schema' | 'regex' | 'semantic' | 'safety' | 'hallucination';
  config: Record<string, unknown>;
  action: 'warn' | 'reject' | 'remediate';
}

export interface RetryPolicy {
  maxRetries: number;
  backoffMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface PromptChain {
  id: string;
  name: string;
  description: string;
  steps: PromptChainStep[];
  governance: ChainGovernance;
  provenance: ChainProvenance;
  metadata: Record<string, unknown>;
}

export interface ChainGovernance {
  requiredApprovals: string[];
  maxCostPerExecution: number;
  maxDurationMs: number;
  allowedClassifications: AgentClassification[];
  auditLevel: 'minimal' | 'standard' | 'enhanced' | 'forensic';
  incidentEscalation: string[];
}

export interface ChainProvenance {
  createdBy: string;
  createdAt: Date;
  version: string;
  slsaLevel: 'SLSA_0' | 'SLSA_1' | 'SLSA_2' | 'SLSA_3' | 'SLSA_4';
  signatureBundle?: string;
  attestations: ProvenanceAttestation[];
}

export interface ProvenanceAttestation {
  type: 'build' | 'review' | 'approval' | 'deployment' | 'audit';
  attestedBy: string;
  attestedAt: Date;
  signature: string;
  claims: Record<string, unknown>;
}

// ============================================================================
// Incident Response Types
// ============================================================================

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical' | 'catastrophic';
export type IncidentStatus = 'detected' | 'investigating' | 'mitigating' | 'resolved' | 'post_mortem';
export type IncidentType =
  | 'misuse'
  | 'hallucination'
  | 'data_leak'
  | 'policy_violation'
  | 'safety_breach'
  | 'integrity_failure'
  | 'availability_issue'
  | 'supply_chain_compromise';

export interface Incident {
  id: string;
  type: IncidentType;
  severity: IncidentSeverity;
  status: IncidentStatus;
  title: string;
  description: string;
  detectedAt: Date;
  resolvedAt?: Date;
  affectedAgents: AgentId[];
  affectedFleets: FleetId[];
  affectedSessions: SessionId[];
  evidence: IncidentEvidence[];
  timeline: IncidentEvent[];
  mitigations: IncidentMitigation[];
  rootCause?: string;
  lessonsLearned?: string[];
  assignees: string[];
  escalationPath: string[];
}

export interface IncidentEvidence {
  id: string;
  type: 'log' | 'trace' | 'artifact' | 'screenshot' | 'audit_record' | 'provenance';
  source: string;
  timestamp: Date;
  data: unknown;
  hash: string;
  classification: AgentClassification;
}

export interface IncidentEvent {
  timestamp: Date;
  type: 'detection' | 'escalation' | 'mitigation' | 'update' | 'resolution';
  actor: string;
  description: string;
  automated: boolean;
  metadata?: Record<string, unknown>;
}

export interface IncidentMitigation {
  id: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  automated: boolean;
  startedAt?: Date;
  completedAt?: Date;
  result?: string;
  rollbackId?: string;
}

export interface IncidentDetector {
  id: string;
  name: string;
  type: IncidentType[];
  enabled: boolean;
  config: Record<string, unknown>;
  thresholds: DetectorThreshold[];
  actions: DetectorAction[];
}

export interface DetectorThreshold {
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte' | 'anomaly';
  value: number;
  window: number;
  severity: IncidentSeverity;
}

export interface DetectorAction {
  trigger: 'threshold_exceeded' | 'pattern_detected' | 'anomaly_detected';
  action: 'alert' | 'throttle' | 'block' | 'rollback' | 'escalate';
  automated: boolean;
  config: Record<string, unknown>;
}

// ============================================================================
// Hallucination Audit Types
// ============================================================================

export type HallucinationType =
  | 'factual_error'
  | 'citation_fabrication'
  | 'entity_confusion'
  | 'temporal_confusion'
  | 'logical_inconsistency'
  | 'self_contradiction'
  | 'unsupported_claim'
  | 'context_drift';

export type HallucinationSeverity = 'benign' | 'misleading' | 'harmful' | 'dangerous';

export interface HallucinationDetection {
  id: string;
  sessionId: SessionId;
  agentId: AgentId;
  timestamp: Date;
  type: HallucinationType;
  severity: HallucinationSeverity;
  confidence: number;
  inputContext: string;
  generatedOutput: string;
  hallucinatedContent: string;
  groundTruth?: string;
  evidence: HallucinationEvidence[];
  remediation?: HallucinationRemediation;
}

export interface HallucinationEvidence {
  type: 'factual_check' | 'source_verification' | 'consistency_check' | 'semantic_analysis';
  method: string;
  result: 'confirmed' | 'refuted' | 'uncertain';
  confidence: number;
  details: Record<string, unknown>;
}

export interface HallucinationRemediation {
  action: 'correct' | 'redact' | 'flag' | 'reject';
  correctedOutput?: string;
  explanation: string;
  approvedBy?: string;
  approvedAt?: Date;
}

export interface HallucinationAuditConfig {
  enabled: boolean;
  detectionMethods: string[];
  samplingRate: number;
  severityThreshold: HallucinationSeverity;
  autoRemediate: boolean;
  escalationThreshold: number;
  retentionDays: number;
}

export interface HallucinationAuditReport {
  period: { start: Date; end: Date };
  totalGenerations: number;
  totalDetections: number;
  detectionRate: number;
  byType: Record<HallucinationType, number>;
  bySeverity: Record<HallucinationSeverity, number>;
  byAgent: Record<AgentId, number>;
  topPatterns: HallucinationPattern[];
  recommendations: string[];
}

export interface HallucinationPattern {
  pattern: string;
  frequency: number;
  types: HallucinationType[];
  affectedAgents: AgentId[];
  suggestedMitigation: string;
}

// ============================================================================
// Auto-Rollback Types
// ============================================================================

export type RollbackTrigger =
  | 'policy_violation'
  | 'hallucination_threshold'
  | 'error_rate_exceeded'
  | 'latency_degradation'
  | 'safety_breach'
  | 'manual_trigger'
  | 'circuit_breaker';

export type RollbackScope = 'agent' | 'fleet' | 'chain' | 'session' | 'global';
export type RollbackStatus = 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface RollbackConfig {
  enabled: boolean;
  triggers: RollbackTriggerConfig[];
  scope: RollbackScope;
  retentionCheckpoints: number;
  autoApprove: boolean;
  notifyChannels: string[];
  dryRunFirst: boolean;
}

export interface RollbackTriggerConfig {
  trigger: RollbackTrigger;
  threshold: number;
  window: number;
  cooldown: number;
  enabled: boolean;
}

export interface Rollback {
  id: string;
  trigger: RollbackTrigger;
  scope: RollbackScope;
  status: RollbackStatus;
  initiatedAt: Date;
  completedAt?: Date;
  initiatedBy: string;
  reason: string;
  affectedAgents: AgentId[];
  affectedFleets: FleetId[];
  checkpointId: string;
  targetState: RollbackState;
  currentState: RollbackState;
  steps: RollbackStep[];
  verification?: RollbackVerification;
}

export interface RollbackState {
  version: string;
  configHash: string;
  timestamp: Date;
  snapshot: Record<string, unknown>;
}

export interface RollbackStep {
  id: string;
  sequence: number;
  action: string;
  status: RollbackStatus;
  startedAt?: Date;
  completedAt?: Date;
  result?: string;
  error?: string;
}

export interface RollbackVerification {
  verified: boolean;
  verifiedAt: Date;
  verifiedBy: string;
  checks: RollbackCheck[];
  overallHealth: 'healthy' | 'degraded' | 'unhealthy';
}

export interface RollbackCheck {
  name: string;
  passed: boolean;
  result: string;
  metrics?: Record<string, number>;
}

export interface Checkpoint {
  id: string;
  createdAt: Date;
  createdBy: string;
  scope: RollbackScope;
  agentId?: AgentId;
  fleetId?: FleetId;
  state: RollbackState;
  metadata: Record<string, unknown>;
  expiresAt: Date;
}

// ============================================================================
// IC FY28 Validation Compliance Types
// ============================================================================

export interface ICFY28ComplianceConfig {
  enabled: boolean;
  validationLevel: 'basic' | 'enhanced' | 'full';
  requiredAttestations: string[];
  auditFrequency: 'continuous' | 'daily' | 'weekly' | 'monthly';
  reportingEndpoint?: string;
}

export interface ICFY28ValidationResult {
  timestamp: Date;
  overallCompliant: boolean;
  validationLevel: string;
  controls: ICFY28Control[];
  findings: ICFY28Finding[];
  attestations: ICFY28Attestation[];
  nextValidation: Date;
}

export interface ICFY28Control {
  id: string;
  name: string;
  category: 'identity' | 'access' | 'data' | 'audit' | 'supply_chain' | 'ai_safety';
  status: 'compliant' | 'non_compliant' | 'partial' | 'not_applicable';
  evidence: string[];
  remediation?: string;
}

export interface ICFY28Finding {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  control: string;
  description: string;
  remediation: string;
  dueDate: Date;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
}

export interface ICFY28Attestation {
  type: string;
  attestedBy: string;
  attestedAt: Date;
  validUntil: Date;
  signature: string;
  claims: Record<string, unknown>;
}

// ============================================================================
// AI Provenance Types (Extended SLSA)
// ============================================================================

export interface AIProvenance {
  id: ProvenanceId;
  type: 'model' | 'prompt' | 'chain' | 'output' | 'decision';
  createdAt: Date;
  slsaLevel: 'SLSA_0' | 'SLSA_1' | 'SLSA_2' | 'SLSA_3' | 'SLSA_4';
  subject: AIProvenanceSubject;
  buildDefinition: AIBuildDefinition;
  runDetails: AIRunDetails;
  cosignBundle?: CosignBundle;
  attestations: AIAttestation[];
}

export interface AIProvenanceSubject {
  name: string;
  digest: {
    sha256: string;
    sha512?: string;
  };
  annotations?: Record<string, string>;
}

export interface AIBuildDefinition {
  buildType: string;
  externalParameters: {
    modelId?: string;
    promptVersion?: string;
    chainId?: string;
    temperature?: number;
    maxTokens?: number;
  };
  internalParameters?: Record<string, unknown>;
  resolvedDependencies: AIResolvedDependency[];
}

export interface AIResolvedDependency {
  uri: string;
  digest: Record<string, string>;
  name?: string;
  annotations?: Record<string, string>;
}

export interface AIRunDetails {
  builder: {
    id: string;
    version?: Record<string, string>;
  };
  metadata: {
    invocationId: string;
    startedOn: string;
    finishedOn: string;
    agentId?: AgentId;
    sessionId?: SessionId;
  };
  byproducts?: AIByproduct[];
}

export interface AIByproduct {
  name: string;
  digest: Record<string, string>;
  content?: string;
  annotations?: Record<string, string>;
}

export interface AIAttestation {
  type: 'safety' | 'accuracy' | 'bias' | 'security' | 'compliance' | 'review';
  attestedBy: string;
  attestedAt: Date;
  predicateType: string;
  predicate: Record<string, unknown>;
  signature: string;
}

export interface CosignBundle {
  payload: string;
  payloadType: string;
  signatures: CosignSignature[];
  verificationMaterial?: {
    publicKey?: string;
    x509CertificateChain?: string[];
  };
}

export interface CosignSignature {
  keyid: string;
  sig: string;
}

// ============================================================================
// Dashboard & Metrics Types
// ============================================================================

export interface GovernanceDashboardMetrics {
  timestamp: Date;
  fleet: FleetMetrics;
  policy: PolicyMetrics;
  incidents: IncidentMetrics;
  hallucinations: HallucinationMetrics;
  rollbacks: RollbackMetrics;
  compliance: ComplianceMetrics;
}

export interface FleetMetrics {
  totalAgents: number;
  activeAgents: number;
  byTrustLevel: Record<AgentTrustLevel, number>;
  byClassification: Record<AgentClassification, number>;
  healthScore: number;
}

export interface PolicyMetrics {
  evaluationsTotal: number;
  evaluationsAllowed: number;
  evaluationsDenied: number;
  averageLatencyMs: number;
  cacheHitRate: number;
  topDenialReasons: Array<{ reason: string; count: number }>;
}

export interface IncidentMetrics {
  activeIncidents: number;
  resolvedLast24h: number;
  mttr: number; // Mean Time to Resolve
  bySeverity: Record<IncidentSeverity, number>;
  byType: Record<IncidentType, number>;
}

export interface HallucinationMetrics {
  detectionRate: number;
  totalDetections: number;
  bySeverity: Record<HallucinationSeverity, number>;
  remediationRate: number;
  topPatterns: Array<{ pattern: string; count: number }>;
}

export interface RollbackMetrics {
  totalRollbacks: number;
  successfulRollbacks: number;
  failedRollbacks: number;
  averageRecoveryTime: number;
  byTrigger: Record<RollbackTrigger, number>;
}

export interface ComplianceMetrics {
  overallScore: number;
  icfy28Compliant: boolean;
  slsaLevel: string;
  lastAudit: Date;
  openFindings: number;
  criticalFindings: number;
}

// ============================================================================
// Event Types for Audit Trail
// ============================================================================

export interface GovernanceEvent {
  id: string;
  timestamp: Date;
  type: GovernanceEventType;
  source: string;
  agentId?: AgentId;
  fleetId?: FleetId;
  sessionId?: SessionId;
  actor: string;
  action: string;
  resource: string;
  outcome: 'success' | 'failure' | 'partial';
  classification: AgentClassification;
  details: Record<string, unknown>;
  provenance?: ProvenanceId;
}

export type GovernanceEventType =
  | 'policy_evaluation'
  | 'policy_violation'
  | 'incident_detected'
  | 'incident_resolved'
  | 'hallucination_detected'
  | 'hallucination_remediated'
  | 'rollback_initiated'
  | 'rollback_completed'
  | 'compliance_check'
  | 'attestation_created'
  | 'chain_executed'
  | 'agent_provisioned'
  | 'agent_terminated';
