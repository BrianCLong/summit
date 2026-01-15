/**
 * Compliance Types
 *
 * Type definitions for the compliance automation framework.
 *
 * SOC 2 Controls: CC4.1 (Monitoring), CC4.2 (Evidence)
 *
 * @module compliance/types/Compliance
 */

// ============================================================================
// Compliance Frameworks
// ============================================================================

export enum ComplianceFramework {
  SOC2 = 'SOC2',
  ISO27001 = 'ISO27001',
  GDPR = 'GDPR',
  HIPAA = 'HIPAA',
  PCIDSS = 'PCI-DSS',
  NIST = 'NIST',
}

export type ControlStatus = 'compliant' | 'non_compliant' | 'partial' | 'not_applicable' | 'not_assessed';

export type EvidenceStatus = 'collected' | 'pending' | 'stale' | 'missing' | 'invalid';

// ============================================================================
// Control Definitions
// ============================================================================

export interface Control {
  id: string;
  framework: ComplianceFramework;
  category: string;
  name: string;
  description: string;
  requirement: string;
  automatable: boolean;
  frequency: 'continuous' | 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual';
  evidenceTypes: EvidenceType[];
  mappings?: ControlMapping[];
}

export interface ControlMapping {
  framework: ComplianceFramework;
  controlId: string;
}

export enum EvidenceType {
  SYSTEM_CONFIG = 'system_config',
  ACCESS_LOG = 'access_log',
  AUDIT_TRAIL = 'audit_trail',
  POLICY_DOCUMENT = 'policy_document',
  SCREENSHOT = 'screenshot',
  TEST_RESULT = 'test_result',
  ATTESTATION = 'attestation',
  SCAN_REPORT = 'scan_report',
  METRIC = 'metric',
  CUSTOM = 'custom',
}

// ============================================================================
// Control Assessment
// ============================================================================

export interface ControlAssessment {
  id: string;
  controlId: string;
  framework: ComplianceFramework;
  tenantId: string;
  status: ControlStatus;
  score: number; // 0-100
  lastAssessed: string;
  nextAssessment: string;
  assessedBy: 'automated' | 'manual';
  findings?: Finding[];
  evidence: EvidenceReference[];
  notes?: string;
}

export interface Finding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  remediation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted';
  createdAt: string;
  resolvedAt?: string;
}

export interface EvidenceReference {
  evidenceId: string;
  type: EvidenceType;
  collectedAt: string;
  valid: boolean;
}

// ============================================================================
// Evidence
// ============================================================================

export interface Evidence {
  id: string;
  type: EvidenceType;
  controlId: string;
  framework: ComplianceFramework;
  tenantId: string;
  title: string;
  description?: string;
  source: string;
  content: EvidenceContent;
  status: EvidenceStatus;
  collectedAt: string;
  collectedBy: string;
  expiresAt?: string;
  metadata?: Record<string, unknown>;
  hash?: string; // For integrity verification
}

export interface EvidenceContent {
  format: 'json' | 'text' | 'binary' | 'url';
  data: unknown;
  size?: number;
}

// ============================================================================
// Compliance Report
// ============================================================================

export interface ComplianceReport {
  id: string;
  framework: ComplianceFramework;
  tenantId: string;
  period: {
    start: string;
    end: string;
  };
  generatedAt: string;
  generatedBy: string;
  overallScore: number;
  status: 'compliant' | 'non_compliant' | 'partial';
  controlSummary: {
    total: number;
    compliant: number;
    nonCompliant: number;
    partial: number;
    notAssessed: number;
  };
  categoryBreakdown: CategoryBreakdown[];
  findings: Finding[];
  recommendations: string[];
}

export interface CategoryBreakdown {
  category: string;
  score: number;
  controls: {
    compliant: number;
    total: number;
  };
}

// ============================================================================
// Audit Readiness
// ============================================================================

export interface AuditReadiness {
  framework: ComplianceFramework;
  tenantId: string;
  overallScore: number;
  readinessLevel: 'ready' | 'mostly_ready' | 'needs_work' | 'not_ready';
  lastUpdated: string;
  gaps: AuditGap[];
  recommendations: string[];
  estimatedTimeToReady?: string;
}

export interface AuditGap {
  controlId: string;
  controlName: string;
  gapType: 'missing_evidence' | 'stale_evidence' | 'control_failure' | 'policy_gap';
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  remediation: string;
  effort: 'low' | 'medium' | 'high';
}

// ============================================================================
// Evidence Collection
// ============================================================================

export interface EvidenceCollectionTask {
  id: string;
  controlId: string;
  framework: ComplianceFramework;
  tenantId: string;
  evidenceType: EvidenceType;
  source: string;
  schedule: CollectionSchedule;
  lastRun?: string;
  nextRun: string;
  status: 'active' | 'paused' | 'failed';
  failureCount: number;
  lastError?: string;
}

export interface CollectionSchedule {
  type: 'interval' | 'cron';
  value: string; // e.g., "1h" for interval, "0 0 * * *" for cron
}

// ============================================================================
// Framework Metadata
// ============================================================================

export interface FrameworkMetadata {
  id: ComplianceFramework;
  name: string;
  version: string;
  description: string;
  categories: string[];
  totalControls: number;
  automationCoverage: number; // percentage
  lastUpdated: string;
}
