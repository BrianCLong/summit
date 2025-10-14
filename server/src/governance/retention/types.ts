export type StorageSystem = 'postgres' | 'neo4j' | 's3' | 'object-store' | 'elasticsearch' | 'blob';

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
  dataType: 'audit' | 'analytics' | 'telemetry' | 'communications' | 'ml-training' | 'custom';
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
