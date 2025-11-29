export type StorageSystem =
  | 'postgres'
  | 'neo4j'
  | 's3'
  | 'object-store'
  | 'elasticsearch'
  | 'blob';

export type DataClassificationLevel =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'regulated';

export interface DatasetMetadata {
  datasetId: string;
  name: string;
  description?: string;
  dataType:
    | 'audit'
    | 'analytics'
    | 'telemetry'
    | 'communications'
    | 'ml-training'
    | 'custom';
  containsPersonalData: boolean;
  containsFinancialData?: boolean;
  containsHealthData?: boolean;
  jurisdictions: string[];
  tags: string[];
  storageSystems: StorageSystem[];
  owner: string;
  createdAt: Date;
  recordCount?: number;
}

export interface RetentionPolicyTemplate {
  id: string;
  name: string;
  description: string;
  classificationLevel: DataClassificationLevel;
  retentionDays: number;
  legalHoldAllowed: boolean;
  purgeGraceDays: number;
  storageTargets: StorageSystem[];
  defaultSafeguards: string[];
  applicableDataTypes: DatasetMetadata['dataType'][];
}

export interface ClassificationResult {
  level: DataClassificationLevel;
  recommendedTemplateId: string;
  rationale: string[];
}

export interface AppliedRetentionPolicy {
  datasetId: string;
  templateId: string;
  retentionDays: number;
  purgeGraceDays: number;
  legalHoldAllowed: boolean;
  storageTargets: StorageSystem[];
  classificationLevel: DataClassificationLevel;
  safeguards: string[];
  appliedAt: Date;
  appliedBy: string;
}

export interface LegalHold {
  datasetId: string;
  reason: string;
  requestedBy: string;
  createdAt: Date;
  expiresAt?: Date;
  scope: 'full' | 'partial';
}

export interface RetentionSchedule {
  datasetId: string;
  intervalMs: number;
  nextRun: Date;
  lastRun?: Date;
  policyId: string;
}

export interface ArchivalWorkflow {
  datasetId: string;
  initiatedBy: string;
  initiatedAt: Date;
  targetLocation: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  details?: Record<string, any>;
}

export interface RetentionAuditEvent {
  event: string;
  datasetId: string;
  policyId?: string;
  severity: 'info' | 'warn' | 'error';
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

export interface RetentionRecord {
  metadata: DatasetMetadata;
  policy: AppliedRetentionPolicy;
  legalHold?: LegalHold;
  schedule?: RetentionSchedule;
  archiveHistory: ArchivalWorkflow[];
  lastEvaluatedAt: Date;
}

/**
 * Redaction operation types
 */
export type RedactionOperation =
  | 'mask' // Replace with *** or similar
  | 'hash' // Replace with hash of value
  | 'delete' // Remove field entirely
  | 'anonymize' // Replace with anonymized value
  | 'pseudonymize' // Replace with consistent pseudonym
  | 'truncate' // Shorten to safe length
  | 'generalize'; // Replace with general category

/**
 * Redaction policy for specific fields or data types
 */
export interface RedactionPolicy {
  id: string;
  name: string;
  description: string;
  enabled: boolean;

  /** Conditions that trigger this policy */
  triggers: {
    dataClassification?: DataClassificationLevel[];
    jurisdictions?: string[];
    dataTypes?: DatasetMetadata['dataType'][];
    tags?: string[];
  };

  /** Rules for what to redact */
  rules: RedactionRule[];

  /** Priority for rule evaluation (higher = first) */
  priority: number;

  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

/**
 * Individual redaction rule
 */
export interface RedactionRule {
  id: string;
  fieldPattern: string; // Glob pattern or regex for field names
  operation: RedactionOperation;

  /** Storage systems this rule applies to */
  storageTargets: StorageSystem[];

  /** Conditions for this specific rule */
  conditions?: {
    valuePattern?: string; // Pattern to match field value
    fieldType?: string; // e.g., 'email', 'phone', 'ssn', 'credit_card'
  };

  /** Parameters for the redaction operation */
  parameters?: {
    maskChar?: string; // For 'mask' operation
    hashAlgorithm?: string; // For 'hash' operation
    preserveLength?: boolean;
    preserveFormat?: boolean;
  };

  /** Whether to keep a hash stub for provenance */
  keepHashStub?: boolean;
}

/**
 * RTBF (Right-To-Be-Forgotten) request states
 */
export type RTBFRequestState =
  | 'submitted' // Initial submission
  | 'validating' // Validating request
  | 'pending_approval' // Waiting for approval
  | 'approved' // Approved, ready for execution
  | 'rejected' // Rejected
  | 'executing' // Currently executing
  | 'completed' // Successfully completed
  | 'failed' // Failed during execution
  | 'cancelled'; // Cancelled by user or admin

/**
 * RTBF request scope types
 */
export type RTBFScope =
  | 'user_data' // All data for a specific user
  | 'dataset' // Specific dataset
  | 'entity' // Specific entity in graph
  | 'timerange' // Data within time range
  | 'custom'; // Custom scope with filters

/**
 * RTBF request
 */
export interface RTBFRequest {
  id: string;
  state: RTBFRequestState;
  scope: RTBFScope;

  /** Who submitted the request */
  requester: {
    userId?: string;
    email?: string;
    type: 'user' | 'admin' | 'system' | 'legal';
  };

  /** What data to forget */
  target: {
    userId?: string; // For user_data scope
    datasetIds?: string[]; // For dataset scope
    entityIds?: string[]; // For entity scope
    timeRange?: {
      from: Date;
      to: Date;
    };
    filters?: Record<string, any>; // For custom scope
  };

  /** Legal/business justification */
  justification: {
    legalBasis?: string; // e.g., "GDPR Article 17"
    jurisdiction?: string;
    reason: string;
    supportingDocuments?: string[];
  };

  /** Approval workflow */
  approval?: {
    approvedBy?: string;
    approvedAt?: Date;
    rejectedBy?: string;
    rejectedAt?: Date;
    rejectionReason?: string;
    requiredApprovers?: string[];
    approvalNotes?: string;
  };

  /** Execution tracking */
  execution?: {
    jobIds: string[];
    startedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
    errorMessage?: string;
  };

  /** Whether to use soft delete or hard delete */
  deletionType: 'soft' | 'hard';

  /** Whether to apply redaction instead of deletion */
  useRedaction?: boolean;
  redactionPolicyId?: string;

  /** Dry-run mode for preview */
  dryRun?: boolean;
  dryRunResults?: RTBFDryRunResults;

  /** Impact assessment */
  impact?: {
    estimatedRecordCount: number;
    affectedSystems: StorageSystem[];
    dependentEntities?: string[];
    warnings?: string[];
  };

  /** Audit trail */
  auditEvents: RTBFAuditEvent[];

  createdAt: Date;
  updatedAt: Date;
}

/**
 * RTBF audit event for tracking request lifecycle
 */
export interface RTBFAuditEvent {
  timestamp: Date;
  eventType: string;
  actor: string;
  details: Record<string, any>;
  correlationId?: string;
}

/**
 * RTBF dry-run results
 */
export interface RTBFDryRunResults {
  executedAt: Date;
  affectedRecords: {
    storageSystem: StorageSystem;
    recordCount: number;
    sampleRecords?: any[];
    tables?: string[];
    labels?: string[];
    buckets?: string[];
  }[];
  estimatedDuration: number; // milliseconds
  warnings: string[];
  errors: string[];
  provenanceTombstones: number;
  redactionOperations?: {
    operation: RedactionOperation;
    fieldCount: number;
  }[];
}

/**
 * RTBF job for actual execution
 */
export interface RTBFJob {
  id: string;
  requestId: string;
  storageSystem: StorageSystem;
  state: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

  /** What this job will do */
  operation: {
    type: 'delete' | 'redact' | 'anonymize';
    targets: {
      table?: string;
      label?: string;
      bucket?: string;
      prefix?: string;
      query?: string;
    };
    parameters?: Record<string, any>;
  };

  /** Execution tracking */
  execution: {
    startedAt?: Date;
    completedAt?: Date;
    failedAt?: Date;
    duration?: number;
    recordsProcessed: number;
    recordsAffected: number;
    errorMessage?: string;
    retryCount: number;
  };

  /** Provenance tracking */
  provenance: {
    tombstonesCreated: number;
    hashStubsCreated: number;
    provenanceManifestId?: string;
  };

  /** Receipts and verification */
  receipts?: {
    receiptId: string;
    receiptHash: string;
    receiptPath?: string;
    verifiedAt?: Date;
  };

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Resource reference for policy evaluation
 */
export interface ResourceReference {
  resourceType: 'dataset' | 'entity' | 'relationship' | 'investigation' | 'user' | 'file';
  resourceId: string;
  storageSystems: StorageSystem[];
  metadata?: Record<string, any>;
}

/**
 * Context for policy evaluation
 */
export interface PolicyEvaluationContext {
  /** Who is requesting the policy */
  requester?: {
    userId?: string;
    role?: string;
    permissions?: string[];
  };

  /** Time context */
  evaluationTime?: Date;

  /** Compliance requirements */
  jurisdictions?: string[];
  complianceFrameworks?: string[];

  /** Data characteristics */
  dataClassification?: DataClassificationLevel;
  sensitivityTags?: string[];

  /** Additional context */
  caseId?: string;
  investigationId?: string;
  purpose?: string;
}

/**
 * Effective policy result
 */
export interface EffectivePolicy {
  /** Retention settings */
  retention: {
    retentionDays: number;
    purgeGraceDays: number;
    nextPurgeDate?: Date;
  };

  /** Redaction settings */
  redaction?: {
    policies: RedactionPolicy[];
    rules: RedactionRule[];
  };

  /** Legal hold status */
  legalHold?: {
    active: boolean;
    reason?: string;
    expiresAt?: Date;
  };

  /** Computed from */
  appliedPolicies: {
    policyId: string;
    policyName: string;
    priority: number;
    reason: string;
  }[];

  /** Warnings or conflicts */
  warnings?: string[];

  evaluatedAt: Date;
}
