/**
 * Assurance Artifacts Model
 *
 * Comprehensive type definitions for Trust Center assurance artifacts,
 * regulatory packs, control mappings, and evidence management.
 *
 * @module trust-center/types/assurance-artifacts
 */

// =============================================================================
// Core Enums
// =============================================================================

/**
 * Supported compliance frameworks
 */
export type ComplianceFramework =
  | 'SOC2_TYPE_I'
  | 'SOC2_TYPE_II'
  | 'ISO_27001'
  | 'ISO_27017'
  | 'ISO_27018'
  | 'HIPAA'
  | 'HITRUST'
  | 'FEDRAMP_LOW'
  | 'FEDRAMP_MODERATE'
  | 'FEDRAMP_HIGH'
  | 'PCI_DSS_4'
  | 'GDPR'
  | 'CCPA'
  | 'SOX'
  | 'NIST_CSF'
  | 'NIST_800_53'
  | 'NIST_800_171'
  | 'CIS_CONTROLS'
  | 'CSA_STAR';

/**
 * Artifact types for assurance documentation
 */
export type ArtifactType =
  | 'control_description'
  | 'test_procedure'
  | 'evidence_snapshot'
  | 'compliance_report'
  | 'attestation'
  | 'certification'
  | 'pentest_summary'
  | 'slo_dashboard'
  | 'policy_document'
  | 'risk_assessment'
  | 'vendor_assessment'
  | 'incident_report'
  | 'audit_log_export'
  | 'configuration_baseline';

/**
 * Status of an assurance artifact
 */
export type ArtifactStatus = 'draft' | 'published' | 'superseded' | 'archived' | 'expired';

/**
 * Data classification levels
 */
export type DataClassification =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'customer_nda';

/**
 * Evidence source types
 */
export type EvidenceSourceType =
  | 'audit_log'
  | 'configuration'
  | 'metric'
  | 'policy'
  | 'external_api'
  | 'manual_upload'
  | 'automated_test'
  | 'infrastructure';

/**
 * Test execution types
 */
export type TestType = 'automated' | 'manual' | 'hybrid';

/**
 * Test execution frequency
 */
export type TestFrequency =
  | 'continuous'
  | 'hourly'
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'quarterly'
  | 'annual'
  | 'on_demand';

/**
 * Control effectiveness status
 */
export type ControlStatus =
  | 'effective'
  | 'partially_effective'
  | 'ineffective'
  | 'not_tested'
  | 'not_applicable';

/**
 * Mapping confidence level
 */
export type MappingConfidence = 'exact' | 'partial' | 'related';

// =============================================================================
// Core Interfaces
// =============================================================================

/**
 * Actor reference for audit trail
 */
export interface ActorReference {
  type: 'user' | 'service' | 'system' | 'external';
  id: string;
  name?: string;
  email?: string;
}

/**
 * Cryptographic signature for artifact integrity
 */
export interface CryptographicSignature {
  algorithm: 'RSA-SHA256' | 'ECDSA-P256' | 'Ed25519';
  signature: string;
  publicKeyId: string;
  timestamp: string;
  timestampAuthority?: string;
}

/**
 * Redaction rule for multi-tenant evidence
 */
export interface RedactionRule {
  pattern: string;
  replacement: string;
  category: 'tenant_id' | 'internal_ip' | 'employee' | 'system' | 'secret' | 'pii';
  isRegex: boolean;
}

/**
 * Artifact scope for multi-tenant isolation
 */
export interface ArtifactScope {
  level: 'platform' | 'tenant' | 'workspace';
  tenantId?: string;
  workspaceId?: string;
  redactionRules: RedactionRule[];
}

/**
 * File attachment metadata
 */
export interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  hash: string;
  storageUrl: string;
  uploadedAt: string;
  uploadedBy: ActorReference;
}

/**
 * Framework mapping for cross-framework compliance
 */
export interface FrameworkMapping {
  framework: ComplianceFramework;
  controlId: string;
  requirement: string;
  mappingConfidence: MappingConfidence;
  notes?: string;
}

// =============================================================================
// Assurance Artifact
// =============================================================================

/**
 * Content structure for different artifact types
 */
export interface ArtifactContent {
  format: 'markdown' | 'html' | 'json' | 'pdf' | 'binary';
  body: string;
  metadata?: Record<string, unknown>;
}

/**
 * Core assurance artifact definition
 */
export interface AssuranceArtifact {
  id: string;
  type: ArtifactType;
  version: string;
  status: ArtifactStatus;

  // Metadata
  title: string;
  description: string;
  frameworkMappings: FrameworkMapping[];
  controlIds: string[];
  tags: string[];

  // Content
  content: ArtifactContent;
  attachments: Attachment[];

  // Provenance
  createdAt: string;
  createdBy: ActorReference;
  updatedAt?: string;
  updatedBy?: ActorReference;
  publishedAt?: string;
  expiresAt?: string;

  // Scoping
  scope: ArtifactScope;
  classification: DataClassification;

  // Integrity
  contentHash: string;
  signature?: CryptographicSignature;
  provenanceChainId?: string;
}

// =============================================================================
// Control Definition
// =============================================================================

/**
 * Evidence source configuration
 */
export interface EvidenceSource {
  id: string;
  type: EvidenceSourceType;
  name: string;
  description?: string;

  // Source-specific configuration
  config: {
    // For audit_log
    table?: string;
    query?: string;
    fields?: string[];

    // For configuration
    path?: string;
    systems?: Array<{ name: string; config: string }>;

    // For metric
    prometheusQuery?: string;
    threshold?: number;

    // For policy
    policyPath?: string;
    verification?: string;

    // For external_api
    endpoint?: string;
    headers?: Record<string, string>;
  };

  // Retention and freshness
  retentionPeriod: string;
  refreshFrequency: TestFrequency;
  stalenessThreshold: string;
}

/**
 * Control test definition
 */
export interface ControlTest {
  id: string;
  name: string;
  description: string;
  type: TestType;
  frequency: TestFrequency;

  // Test specification
  procedure: string;
  expectedResult: string;

  // Automation details
  automation?: {
    script: string;
    schedule?: string;
    timeout?: number;
    retries?: number;
  };

  // Manual test details
  manual?: {
    assignee?: string;
    dueDate?: string;
    instructions: string;
  };
}

/**
 * Test result record
 */
export interface TestResult {
  id: string;
  testId: string;
  controlId: string;
  executedAt: string;
  executedBy: ActorReference;

  status: 'passed' | 'failed' | 'skipped' | 'error';
  details: string;
  evidence?: string[];
  duration?: number;

  // For failed tests
  failureReason?: string;
  remediationNotes?: string;
}

/**
 * Control implementation details
 */
export interface ControlImplementation {
  description: string;
  components: Array<{
    name: string;
    type: string;
    location: string;
    description: string;
  }>;
  documentation?: string[];
}

/**
 * Comprehensive control definition
 */
export interface ControlDefinition {
  id: string;
  title: string;
  description: string;
  category: string;

  // Framework mappings
  frameworkMappings: FrameworkMapping[];

  // Implementation details
  implementation: ControlImplementation;

  // Evidence configuration
  evidenceSources: EvidenceSource[];

  // Test procedures
  tests: ControlTest[];

  // Current status
  status: ControlStatus;
  lastTestedAt?: string;
  nextTestDue?: string;

  // Ownership
  owner: ActorReference;
  reviewers: ActorReference[];
}

// =============================================================================
// Regulatory Pack
// =============================================================================

/**
 * Regulatory pack metadata
 */
export interface PackMetadata {
  auditPeriod?: {
    start: string;
    end: string;
  };
  auditor?: string;
  certificationDate?: string;
  expirationDate?: string;
  version: string;
  changelog?: Array<{
    version: string;
    date: string;
    changes: string[];
  }>;
}

/**
 * Pack artifact reference
 */
export interface PackArtifact {
  id: string;
  type: ArtifactType;
  name: string;
  description: string;
  access: DataClassification;
  path: string;
  hash?: string;
}

/**
 * Control within a regulatory pack
 */
export interface PackControl {
  id: string;
  controlDefinitionId: string;
  title: string;
  description: string;
  category: string;

  // Pack-specific overrides
  evidenceSources: EvidenceSource[];
  tests: ControlTest[];

  // External mappings
  mappings: FrameworkMapping[];
}

/**
 * Regulatory pack definition
 */
export interface RegulatoryPack {
  id: string;
  name: string;
  description: string;
  framework: ComplianceFramework;
  version: string;
  status: 'active' | 'draft' | 'deprecated' | 'archived';

  // Pack contents
  controls: PackControl[];
  artifacts: PackArtifact[];
  metadata: PackMetadata;

  // Update tracking
  createdAt: string;
  updatedAt: string;
  lastEvidenceRefresh?: string;
}

/**
 * Pack summary for listing
 */
export interface RegulatoryPackSummary {
  id: string;
  name: string;
  framework: ComplianceFramework;
  version: string;
  status: 'active' | 'draft' | 'deprecated' | 'archived';
  controlCount: number;
  lastUpdated: string;
}

// =============================================================================
// Evidence Management
// =============================================================================

/**
 * Evidence snapshot from a source
 */
export interface EvidenceSnapshot {
  id: string;
  sourceId: string;
  controlId: string;

  // Capture details
  capturedAt: string;
  capturedBy: ActorReference;
  expiresAt?: string;

  // Content
  content: unknown;
  contentHash: string;
  contentSize: number;

  // Redaction
  redactionApplied: boolean;
  redactionRules?: string[];

  // Integrity
  signature?: CryptographicSignature;
  provenanceChainId?: string;
}

/**
 * Evidence request from customer
 */
export interface EvidenceRequest {
  id: string;
  tenantId: string;
  requestedBy: ActorReference;
  requestedAt: string;

  // Request details
  controlIds: string[];
  frameworkId?: ComplianceFramework;
  dateRange?: {
    start: string;
    end: string;
  };
  purpose: string;

  // Processing
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'expired';
  processedAt?: string;
  expiresAt?: string;

  // Result
  packageUrl?: string;
  packageHash?: string;
  errorMessage?: string;
}

/**
 * Control metrics from monitoring
 */
export interface ControlMetrics {
  controlId: string;
  period: {
    start: string;
    end: string;
  };

  // Effectiveness metrics
  testsExecuted: number;
  testsPassed: number;
  testsFailed: number;
  passRate: number;

  // Evidence metrics
  evidenceCount: number;
  evidenceFreshness: number; // Average age in hours

  // Trend
  trend: 'improving' | 'stable' | 'degrading';
  previousPassRate?: number;
}

// =============================================================================
// Trust Center Status
// =============================================================================

/**
 * Certification summary for public display
 */
export interface CertificationSummary {
  framework: ComplianceFramework;
  name: string;
  status: 'active' | 'pending' | 'expired';
  validFrom?: string;
  validUntil?: string;
  auditor?: string;
}

/**
 * SLO summary metrics
 */
export interface SLOSummary {
  availability: {
    target: number;
    current: number;
    period: string;
  };
  latency: {
    p50: number;
    p95: number;
    p99: number;
    target: number;
  };
  errorRate: {
    target: number;
    current: number;
  };
}

/**
 * Service health status
 */
export type HealthStatus = 'operational' | 'degraded' | 'partial_outage' | 'major_outage';

/**
 * Trust center public status
 */
export interface TrustCenterStatus {
  overallStatus: HealthStatus;
  certifications: CertificationSummary[];
  sloSummary: SLOSummary;
  lastUpdated: string;
  incidentCount: number;
  uptime: {
    last24h: number;
    last7d: number;
    last30d: number;
  };
}

/**
 * Service status for individual services
 */
export interface ServiceStatus {
  id: string;
  name: string;
  status: HealthStatus;
  uptime: number;
  latency: number;
  lastIncident?: {
    id: string;
    title: string;
    resolvedAt: string;
  };
}

// =============================================================================
// Report Generation
// =============================================================================

/**
 * Report type options
 */
export type ReportType =
  | 'compliance_summary'
  | 'control_evidence'
  | 'audit_export'
  | 'penetration_test'
  | 'vendor_assessment'
  | 'risk_assessment';

/**
 * Report format options
 */
export type ReportFormat = 'json' | 'csv' | 'pdf' | 'oscal' | 'caiq' | 'html';

/**
 * Report generation input
 */
export interface ReportGenerationInput {
  framework: ComplianceFramework;
  reportType: ReportType;
  format: ReportFormat;
  dateRange?: {
    start: string;
    end: string;
  };
  controlIds?: string[];
  includeEvidence?: boolean;
  redactionLevel?: DataClassification;
}

/**
 * Report generation job
 */
export interface ReportJob {
  id: string;
  tenantId: string;
  input: ReportGenerationInput;

  status: 'queued' | 'processing' | 'completed' | 'failed';
  progress?: number;
  startedAt?: string;
  completedAt?: string;

  result?: {
    downloadUrl: string;
    expiresAt: string;
    hash: string;
    size: number;
  };

  error?: {
    code: string;
    message: string;
  };
}

/**
 * Report job progress update
 */
export interface ReportJobProgress {
  jobId: string;
  status: ReportJob['status'];
  progress: number;
  currentStep?: string;
  estimatedCompletion?: string;
}

// =============================================================================
// Webhook Integration
// =============================================================================

/**
 * Webhook event types
 */
export type WebhookEventType =
  | 'control.status_changed'
  | 'evidence.refreshed'
  | 'certification.expiring'
  | 'report.completed'
  | 'incident.created'
  | 'incident.resolved';

/**
 * Webhook configuration
 */
export interface Webhook {
  id: string;
  tenantId: string;
  url: string;
  events: WebhookEventType[];
  secret: string;
  active: boolean;
  createdAt: string;
  lastTriggeredAt?: string;
  failureCount: number;
}

/**
 * Webhook input for registration
 */
export interface WebhookInput {
  url: string;
  events: WebhookEventType[];
  secret?: string;
}

// =============================================================================
// Control Status Update (Subscription)
// =============================================================================

/**
 * Real-time control status update
 */
export interface ControlStatusUpdate {
  controlId: string;
  previousStatus: ControlStatus;
  currentStatus: ControlStatus;
  changedAt: string;
  reason?: string;
  testResultId?: string;
}

// =============================================================================
// Assurance Ready Checklist
// =============================================================================

/**
 * Checklist item for assurance readiness
 */
export interface AssuranceChecklistItem {
  id: string;
  category: string;
  requirement: string;
  description: string;
  status: 'met' | 'partial' | 'not_met' | 'not_applicable';
  evidence?: string;
  notes?: string;
}

/**
 * Complete assurance readiness checklist
 */
export interface AssuranceChecklist {
  controlId: string;
  controlTitle: string;
  overallStatus: 'ready' | 'partial' | 'not_ready';
  items: AssuranceChecklistItem[];
  lastEvaluated: string;
  evaluatedBy: ActorReference;
}
