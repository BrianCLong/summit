/**
 * Enterprise Compliance Framework Types
 * Supports FedRAMP, NIST 800-53, ISO 27001, SOC 2, GDPR, CCPA
 */

export enum ComplianceFramework {
  FEDRAMP_LOW = 'fedramp_low',
  FEDRAMP_MODERATE = 'fedramp_moderate',
  FEDRAMP_HIGH = 'fedramp_high',
  NIST_800_53_REV5 = 'nist_800_53_rev5',
  ISO_27001_2022 = 'iso_27001_2022',
  SOC2_TYPE_II = 'soc2_type_ii',
  GDPR = 'gdpr',
  CCPA = 'ccpa',
  HIPAA = 'hipaa',
  PCI_DSS = 'pci_dss',
}

export enum ControlFamily {
  ACCESS_CONTROL = 'AC',
  AWARENESS_TRAINING = 'AT',
  AUDIT_ACCOUNTABILITY = 'AU',
  SECURITY_ASSESSMENT = 'CA',
  CONFIGURATION_MANAGEMENT = 'CM',
  CONTINGENCY_PLANNING = 'CP',
  IDENTIFICATION_AUTH = 'IA',
  INCIDENT_RESPONSE = 'IR',
  MAINTENANCE = 'MA',
  MEDIA_PROTECTION = 'MP',
  PHYSICAL_ENVIRONMENTAL = 'PE',
  PLANNING = 'PL',
  PERSONNEL_SECURITY = 'PS',
  RISK_ASSESSMENT = 'RA',
  SYSTEM_SERVICES_ACQUISITION = 'SA',
  SYSTEM_COMMUNICATIONS_PROTECTION = 'SC',
  SYSTEM_INFORMATION_INTEGRITY = 'SI',
}

export enum ControlStatus {
  NOT_IMPLEMENTED = 'not_implemented',
  PARTIALLY_IMPLEMENTED = 'partially_implemented',
  IMPLEMENTED = 'implemented',
  NOT_APPLICABLE = 'not_applicable',
  INHERITED = 'inherited',
}

export enum ComplianceStatus {
  COMPLIANT = 'compliant',
  NON_COMPLIANT = 'non_compliant',
  PARTIALLY_COMPLIANT = 'partially_compliant',
  NOT_ASSESSED = 'not_assessed',
}

export enum DataClassification {
  UNCLASSIFIED = 'unclassified',
  CONFIDENTIAL = 'confidential',
  SECRET = 'secret',
  TOP_SECRET = 'top_secret',
  // Traffic Light Protocol
  TLP_CLEAR = 'tlp_clear',
  TLP_GREEN = 'tlp_green',
  TLP_AMBER = 'tlp_amber',
  TLP_AMBER_STRICT = 'tlp_amber_strict',
  TLP_RED = 'tlp_red',
  // Business classifications
  PUBLIC = 'public',
  INTERNAL = 'internal',
  RESTRICTED = 'restricted',
  HIGHLY_RESTRICTED = 'highly_restricted',
}

export enum PIICategory {
  NONE = 'none',
  NAME = 'name',
  EMAIL = 'email',
  PHONE = 'phone',
  SSN = 'ssn',
  ADDRESS = 'address',
  FINANCIAL = 'financial',
  HEALTH = 'health',
  BIOMETRIC = 'biometric',
  GOVERNMENT_ID = 'government_id',
}

export interface ComplianceControl {
  id: string;
  framework: ComplianceFramework;
  family: ControlFamily;
  number: string; // e.g., "AC-2", "AC-3"
  title: string;
  description: string;
  baseline: 'low' | 'moderate' | 'high';
  status: ControlStatus;
  implementation: string;
  evidence: string[];
  responsibleParty: string;
  lastAssessed?: Date;
  nextAssessment?: Date;
  notes?: string;
}

export interface AuditEvent {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  action: string;
  resource: string;
  resourceId?: string;
  outcome: 'success' | 'failure';
  ipAddress?: string;
  userAgent?: string;
  classification?: DataClassification;
  sensitivity?: string;
  details?: Record<string, unknown>;
  merkleHash?: string; // For tamper-proof storage
  blockNumber?: number; // For blockchain-like audit trail
  previousHash?: string; // Link to previous audit event
}

export interface DataAsset {
  id: string;
  name: string;
  description: string;
  classification: DataClassification;
  owner: string;
  custodian: string;
  location: string;
  retentionPeriod: number; // days
  retentionPolicy: string;
  legalHold: boolean;
  piiCategories: PIICategory[];
  encryptionRequired: boolean;
  backupRequired: boolean;
  lastReviewed?: Date;
  nextReview?: Date;
  tags?: string[];
}

export interface RetentionPolicy {
  id: string;
  name: string;
  description: string;
  retentionPeriod: number; // days
  archivalPeriod?: number; // days
  destructionMethod: 'secure_delete' | 'crypto_erase' | 'physical_destruction';
  legalBasis: string;
  applicableClassifications: DataClassification[];
  autoArchive: boolean;
  autoDestroy: boolean;
  approvalRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ChainOfCustody {
  id: string;
  evidenceId: string;
  evidenceName: string;
  timestamp: Date;
  action: 'collected' | 'transferred' | 'analyzed' | 'archived' | 'destroyed';
  fromCustodian: string;
  toCustodian: string;
  location: string;
  purpose: string;
  digitalSignature?: string;
  witnessSignature?: string;
  hash: string; // Hash of evidence at time of custody change
  forensicTimestamp?: string; // RFC 3161 timestamp
  notes?: string;
}

export interface PolicyViolation {
  id: string;
  timestamp: Date;
  policyId: string;
  policyName: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  userId?: string;
  resource: string;
  description: string;
  detectedBy: 'automatic' | 'manual';
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  remediationAction?: string;
  remediatedBy?: string;
  remediatedAt?: Date;
  notes?: string;
}

export interface ComplianceReport {
  id: string;
  framework: ComplianceFramework;
  reportType: 'gap_analysis' | 'control_effectiveness' | 'audit_readiness' | 'executive_summary';
  generatedAt: Date;
  generatedBy: string;
  period: {
    start: Date;
    end: Date;
  };
  overallStatus: ComplianceStatus;
  metrics: {
    totalControls: number;
    implementedControls: number;
    partiallyImplementedControls: number;
    notImplementedControls: number;
    compliancePercentage: number;
  };
  findings: ComplianceFinding[];
  recommendations: string[];
  nextReviewDate?: Date;
}

export interface ComplianceFinding {
  id: string;
  controlId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  impact: string;
  recommendation: string;
  status: 'open' | 'in_progress' | 'resolved' | 'accepted_risk';
  assignedTo?: string;
  dueDate?: Date;
  resolvedAt?: Date;
}

export interface GDPRDataSubjectRequest {
  id: string;
  requestType: 'access' | 'rectification' | 'erasure' | 'portability' | 'restriction' | 'objection';
  subjectId: string;
  subjectEmail: string;
  requestedAt: Date;
  status: 'received' | 'verified' | 'processing' | 'completed' | 'rejected';
  completedAt?: Date;
  verificationMethod: string;
  dataExported?: string; // Path to export file
  deletionConfirmed?: boolean;
  processingNotes?: string;
  legalBasis?: string;
}

export interface SoDConflict {
  id: string;
  userId: string;
  role1: string;
  role2: string;
  conflictType: 'incompatible_roles' | 'approval_conflict' | 'dual_control_violation';
  description: string;
  detectedAt: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'resolved' | 'exception_granted';
  resolutionNotes?: string;
  exceptionApprovedBy?: string;
  exceptionExpiry?: Date;
}

export interface SecurityPolicy {
  id: string;
  name: string;
  version: string;
  description: string;
  framework: ComplianceFramework;
  controlIds: string[];
  rules: PolicyRule[];
  effectiveDate: Date;
  expiryDate?: Date;
  approvedBy: string;
  approvedAt: Date;
  status: 'draft' | 'active' | 'deprecated';
  enforcementLevel: 'advisory' | 'warning' | 'blocking';
}

export interface PolicyRule {
  id: string;
  condition: string; // Expression or condition to evaluate
  action: 'allow' | 'deny' | 'alert' | 'log';
  severity: 'low' | 'medium' | 'high' | 'critical';
  autoRemediate: boolean;
  remediationScript?: string;
}

export interface ConsentRecord {
  id: string;
  userId: string;
  purpose: string;
  consentType: 'explicit' | 'implicit' | 'opt_in' | 'opt_out';
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  version: string; // Version of privacy policy
  ipAddress?: string;
  userAgent?: string;
  evidence?: string; // Proof of consent
}
