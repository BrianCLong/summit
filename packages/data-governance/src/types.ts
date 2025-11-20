/**
 * Core types for data governance
 */

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  type: PolicyType;
  scope: PolicyScope;
  rules: PolicyRule[];
  enforcement: EnforcementConfig;
  status: 'draft' | 'active' | 'suspended' | 'deprecated';
  version: number;
  effectiveDate: Date;
  expirationDate?: Date;
  owner: string;
  approvers: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
}

export type PolicyType =
  | 'access-control'
  | 'data-retention'
  | 'data-privacy'
  | 'data-security'
  | 'data-quality'
  | 'data-classification'
  | 'data-lifecycle'
  | 'compliance';

export interface PolicyScope {
  databases?: string[];
  tables?: string[];
  columns?: string[];
  dataClassifications?: DataClassification[];
  users?: string[];
  roles?: string[];
  geographies?: string[];
}

export interface PolicyRule {
  id: string;
  condition: RuleCondition;
  action: RuleAction;
  priority: number;
  enabled: boolean;
}

export interface RuleCondition {
  type: 'attribute' | 'context' | 'time' | 'custom';
  operator: 'equals' | 'not-equals' | 'in' | 'not-in' | 'matches' | 'greater-than' | 'less-than';
  attribute?: string;
  value: any;
  customLogic?: string;
}

export interface RuleAction {
  type: 'allow' | 'deny' | 'mask' | 'encrypt' | 'audit' | 'alert' | 'transform';
  config: Record<string, any>;
}

export interface EnforcementConfig {
  mode: 'enforce' | 'monitor' | 'test';
  violationAction: 'block' | 'warn' | 'log';
  notificationChannels: string[];
  exemptions?: Exemption[];
}

export interface Exemption {
  id: string;
  reason: string;
  approver: string;
  expiresAt: Date;
  scope: PolicyScope;
}

export interface DataClassification {
  level: 'public' | 'internal' | 'confidential' | 'restricted' | 'sensitive' | 'pii';
  category?: string;
  subCategory?: string;
  regulatoryRequirements?: string[];
  retentionPeriod?: number;
  encryptionRequired: boolean;
  accessRestrictions: AccessRestriction[];
}

export interface AccessRestriction {
  role: string;
  permissions: Permission[];
  conditions?: RuleCondition[];
}

export type Permission = 'read' | 'write' | 'delete' | 'export' | 'share' | 'admin';

export interface ComplianceFramework {
  id: string;
  name: string;
  type: 'GDPR' | 'CCPA' | 'HIPAA' | 'SOC2' | 'ISO27001' | 'NIST' | 'Custom';
  requirements: ComplianceRequirement[];
  controls: ComplianceControl[];
  assessmentSchedule: string;
  status: 'compliant' | 'non-compliant' | 'partially-compliant' | 'under-review';
}

export interface ComplianceRequirement {
  id: string;
  code: string;
  description: string;
  category: string;
  mandatory: boolean;
  evidence: string[];
  policies: string[];
  controls: string[];
  status: 'met' | 'not-met' | 'not-applicable';
  lastAssessed?: Date;
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  type: 'preventive' | 'detective' | 'corrective';
  automated: boolean;
  frequency: string;
  owner: string;
  lastExecuted?: Date;
  nextExecution?: Date;
  effectiveness: number;
}

export interface AuditLog {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId: string;
  userName: string;
  resource: string;
  action: string;
  result: 'success' | 'failure' | 'denied';
  details: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  policyId?: string;
  complianceFramework?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  tags: string[];
}

export type AuditEventType =
  | 'data-access'
  | 'data-modification'
  | 'data-deletion'
  | 'policy-change'
  | 'permission-change'
  | 'export'
  | 'compliance-check'
  | 'violation';

export interface PrivacyRequest {
  id: string;
  type: PrivacyRequestType;
  subjectId: string;
  subjectEmail: string;
  status: 'pending' | 'in-progress' | 'completed' | 'rejected';
  requestedAt: Date;
  completedAt?: Date;
  details: Record<string, any>;
  approver?: string;
  affectedSystems: string[];
  dataExport?: string;
  verificationCode?: string;
}

export type PrivacyRequestType =
  | 'access'
  | 'rectification'
  | 'erasure'
  | 'portability'
  | 'restriction'
  | 'objection'
  | 'automated-decision-opt-out';

export interface DataLineage {
  id: string;
  dataAssetId: string;
  sources: DataSource[];
  transformations: Transformation[];
  destinations: DataDestination[];
  timestamp: Date;
}

export interface DataSource {
  id: string;
  type: string;
  name: string;
  location: string;
  fields: string[];
}

export interface Transformation {
  id: string;
  type: string;
  description: string;
  logic: string;
  inputFields: string[];
  outputFields: string[];
}

export interface DataDestination {
  id: string;
  type: string;
  name: string;
  location: string;
  fields: string[];
}

export interface ConsentRecord {
  id: string;
  subjectId: string;
  purpose: string;
  scope: string[];
  granted: boolean;
  grantedAt?: Date;
  revokedAt?: Date;
  expiresAt?: Date;
  source: string;
  version: number;
  metadata: Record<string, any>;
}

export interface DataRetentionPolicy {
  id: string;
  name: string;
  dataCategory: string;
  retentionPeriod: number;
  retentionUnit: 'days' | 'months' | 'years';
  deletionMethod: 'soft-delete' | 'hard-delete' | 'anonymize' | 'archive';
  legalBasis: string;
  exceptions: RetentionException[];
  status: 'active' | 'inactive';
}

export interface RetentionException {
  condition: string;
  extendedPeriod: number;
  reason: string;
}

export interface PolicyViolation {
  id: string;
  policyId: string;
  policyName: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: Date;
  userId?: string;
  resource: string;
  action: string;
  context: Record<string, any>;
  status: 'open' | 'investigating' | 'resolved' | 'false-positive';
  resolution?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
}
