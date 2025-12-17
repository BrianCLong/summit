/**
 * Data Factory Service - Core Type Definitions
 *
 * This module defines all TypeScript types used throughout the data factory service
 * for dataset management, labeling workflows, and training data curation.
 */

import { z } from 'zod';

// ============================================================================
// Enums and Constants
// ============================================================================

export const SplitType = {
  TRAIN: 'train',
  DEV: 'dev',
  TEST: 'test',
  VALIDATION: 'validation',
} as const;

export type SplitType = (typeof SplitType)[keyof typeof SplitType];

export const TaskType = {
  ENTITY_MATCH: 'entity_match',
  ENTITY_NO_MATCH: 'entity_no_match',
  CLUSTER_REVIEW: 'cluster_review',
  CLAIM_ASSESSMENT: 'claim_assessment',
  SAFETY_DECISION: 'safety_decision',
  RELATIONSHIP_VALIDATION: 'relationship_validation',
  TEXT_CLASSIFICATION: 'text_classification',
  NAMED_ENTITY_RECOGNITION: 'named_entity_recognition',
  SEQUENCE_LABELING: 'sequence_labeling',
} as const;

export type TaskType = (typeof TaskType)[keyof typeof TaskType];

export const LabelStatus = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  NEEDS_REVIEW: 'needs_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

export type LabelStatus = (typeof LabelStatus)[keyof typeof LabelStatus];

export const DatasetStatus = {
  DRAFT: 'draft',
  ACTIVE: 'active',
  ARCHIVED: 'archived',
  DEPRECATED: 'deprecated',
} as const;

export type DatasetStatus = (typeof DatasetStatus)[keyof typeof DatasetStatus];

export const AnnotatorRole = {
  ANNOTATOR: 'annotator',
  REVIEWER: 'reviewer',
  ADMIN: 'admin',
  QUALITY_LEAD: 'quality_lead',
} as const;

export type AnnotatorRole = (typeof AnnotatorRole)[keyof typeof AnnotatorRole];

export const JobStatus = {
  QUEUED: 'queued',
  ASSIGNED: 'assigned',
  IN_PROGRESS: 'in_progress',
  SUBMITTED: 'submitted',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  ESCALATED: 'escalated',
} as const;

export type JobStatus = (typeof JobStatus)[keyof typeof JobStatus];

export const LicenseType = {
  INTERNAL: 'internal',
  PUBLIC_DOMAIN: 'public_domain',
  CC_BY: 'cc_by',
  CC_BY_SA: 'cc_by_sa',
  CC_BY_NC: 'cc_by_nc',
  PROPRIETARY: 'proprietary',
  RESTRICTED: 'restricted',
  GOVERNMENT: 'government',
} as const;

export type LicenseType = (typeof LicenseType)[keyof typeof LicenseType];

export const ExportFormat = {
  JSONL: 'jsonl',
  PARQUET: 'parquet',
  CSV: 'csv',
  JSON: 'json',
} as const;

export type ExportFormat = (typeof ExportFormat)[keyof typeof ExportFormat];

// ============================================================================
// Provenance and Metadata Types
// ============================================================================

export interface SourceProvenance {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  collectionDate: Date;
  collectionMethod: string;
  originalFormat: string;
  transformationHistory: TransformationRecord[];
}

export interface TransformationRecord {
  id: string;
  timestamp: Date;
  operation: string;
  parameters: Record<string, unknown>;
  executedBy: string;
  inputHash: string;
  outputHash: string;
}

export interface LicenseMetadata {
  licenseId: string;
  licenseType: LicenseType;
  licenseText?: string;
  licenseUrl?: string;
  attributionRequired: boolean;
  commercialUseAllowed: boolean;
  derivativeWorksAllowed: boolean;
  sharingAllowed: boolean;
  expirationDate?: Date;
}

export interface JurisdictionMetadata {
  jurisdiction: string;
  dataLocalizationRequired: boolean;
  retentionPolicyId: string;
  retentionDays: number;
  complianceFrameworks: string[];
  exportRestrictions: string[];
}

export interface RetentionPolicy {
  policyId: string;
  policyName: string;
  retentionDays: number;
  archiveAfterDays?: number;
  deleteAfterDays?: number;
  auditRequired: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Dataset Types
// ============================================================================

export interface Dataset {
  id: string;
  name: string;
  description: string;
  version: string;
  status: DatasetStatus;
  taskType: TaskType;
  useCase: string;
  modelTarget?: string;
  sampleCount: number;
  labeledSampleCount: number;
  splits: DatasetSplit[];
  provenance: SourceProvenance;
  license: LicenseMetadata;
  jurisdiction: JurisdictionMetadata;
  policyProfile: PolicyProfile;
  schema: DatasetSchema;
  qualityMetrics: QualityMetrics;
  tags: string[];
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  publishedAt?: Date;
}

export interface DatasetSplit {
  splitType: SplitType;
  sampleCount: number;
  percentage: number;
  seed: number;
  stratifyBy?: string;
}

export interface DatasetSchema {
  version: string;
  inputFields: SchemaField[];
  labelFields: SchemaField[];
  metadataFields: SchemaField[];
}

export interface SchemaField {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  required: boolean;
  description?: string;
  constraints?: FieldConstraints;
}

export interface FieldConstraints {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  enum?: string[];
  min?: number;
  max?: number;
}

export interface QualityMetrics {
  interAnnotatorAgreement?: number;
  goldenQuestionAccuracy?: number;
  averageLabelTime?: number;
  rejectionRate?: number;
  escalationRate?: number;
  labelDistribution: Record<string, number>;
}

export interface PolicyProfile {
  profileId: string;
  profileName: string;
  allowedUseCases: string[];
  prohibitedUseCases: string[];
  requiredRedactions: string[];
  piiHandling: 'remove' | 'mask' | 'encrypt' | 'allow';
  sensitivityLevel: 'public' | 'internal' | 'confidential' | 'restricted';
  auditLevel: 'minimal' | 'standard' | 'comprehensive';
}

// ============================================================================
// Sample Types
// ============================================================================

export interface Sample {
  id: string;
  datasetId: string;
  externalId?: string;
  content: SampleContent;
  metadata: SampleMetadata;
  labels: LabelSet[];
  split?: SplitType;
  status: LabelStatus;
  isGolden: boolean;
  expectedLabel?: Record<string, unknown>;
  priority: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SampleContent {
  text?: string;
  entities?: EntityPair[];
  relationships?: RelationshipData[];
  claims?: ClaimData[];
  raw?: Record<string, unknown>;
}

export interface EntityPair {
  entityA: EntityData;
  entityB: EntityData;
}

export interface EntityData {
  id: string;
  type: string;
  name: string;
  properties: Record<string, unknown>;
}

export interface RelationshipData {
  sourceEntityId: string;
  targetEntityId: string;
  relationshipType: string;
  confidence?: number;
  properties: Record<string, unknown>;
}

export interface ClaimData {
  id: string;
  claimText: string;
  source: string;
  confidence?: number;
  supportingEvidence?: string[];
}

export interface SampleMetadata {
  sourceId: string;
  sourceName: string;
  collectionDate: Date;
  originalFormat: string;
  hash: string;
  size: number;
  language?: string;
  domain?: string;
  customFields: Record<string, unknown>;
}

// ============================================================================
// Label Types
// ============================================================================

export interface LabelSet {
  id: string;
  sampleId: string;
  annotatorId: string;
  annotatorRole: AnnotatorRole;
  taskType: TaskType;
  labels: Label[];
  confidence?: number;
  notes?: string;
  timeSpent: number;
  status: LabelStatus;
  reviewerId?: string;
  reviewNotes?: string;
  reviewedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Label {
  fieldName: string;
  value: unknown;
  confidence?: number;
  spans?: LabelSpan[];
}

export interface LabelSpan {
  start: number;
  end: number;
  label: string;
  confidence?: number;
}

// ============================================================================
// Labeling Job Types
// ============================================================================

export interface LabelingJob {
  id: string;
  datasetId: string;
  sampleId: string;
  taskType: TaskType;
  annotatorId?: string;
  status: JobStatus;
  priority: number;
  assignedAt?: Date;
  startedAt?: Date;
  submittedAt?: Date;
  dueAt?: Date;
  instructions: string;
  labelSchemaId: string;
  previousLabels?: LabelSet[];
  createdAt: Date;
  updatedAt: Date;
}

export interface LabelingQueue {
  id: string;
  name: string;
  datasetId: string;
  taskType: TaskType;
  totalJobs: number;
  pendingJobs: number;
  assignedJobs: number;
  completedJobs: number;
  annotatorIds: string[];
  qualitySettings: QualitySettings;
  createdAt: Date;
  updatedAt: Date;
}

export interface QualitySettings {
  goldenQuestionFrequency: number;
  minAgreementThreshold: number;
  reviewSamplingRate: number;
  maxAnnotationsPerSample: number;
  disagreementResolution: 'majority_vote' | 'expert_review' | 'adjudication';
  autoApprovalThreshold?: number;
}

// ============================================================================
// Annotator Types
// ============================================================================

export interface Annotator {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  role: AnnotatorRole;
  taskTypes: TaskType[];
  qualifications: string[];
  performanceMetrics: AnnotatorMetrics;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AnnotatorMetrics {
  totalLabeled: number;
  accuracy: number;
  goldenQuestionAccuracy: number;
  averageTimePerTask: number;
  agreementRate: number;
  rejectionRate: number;
  lastActiveAt?: Date;
}

// ============================================================================
// Workflow Types
// ============================================================================

export interface LabelingWorkflow {
  id: string;
  name: string;
  description: string;
  datasetId: string;
  taskType: TaskType;
  stages: WorkflowStage[];
  currentStageIndex: number;
  status: 'draft' | 'active' | 'paused' | 'completed';
  qualitySettings: QualitySettings;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}

export interface WorkflowStage {
  id: string;
  name: string;
  type: 'annotation' | 'review' | 'adjudication' | 'export';
  requiredRole: AnnotatorRole;
  minAnnotators: number;
  samplingStrategy: 'all' | 'random' | 'stratified' | 'active_learning';
  samplingRate?: number;
  completionCriteria: CompletionCriteria;
}

export interface CompletionCriteria {
  minSamplesLabeled?: number;
  minAgreementThreshold?: number;
  minQualityScore?: number;
  maxTimeLimit?: number;
}

// ============================================================================
// Export Types
// ============================================================================

export interface DatasetExport {
  id: string;
  datasetId: string;
  datasetVersion: string;
  format: ExportFormat;
  splits: SplitType[];
  filterCriteria?: ExportFilter;
  redactionRules: RedactionRule[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  filePath?: string;
  fileSize?: number;
  fileHash?: string;
  sampleCount: number;
  exportedBy: string;
  policyProfileId: string;
  metadata: ExportMetadata;
  createdAt: Date;
  completedAt?: Date;
}

export interface ExportFilter {
  splits?: SplitType[];
  labelStatus?: LabelStatus[];
  minConfidence?: number;
  dateRange?: {
    start: Date;
    end: Date;
  };
  customFilters?: Record<string, unknown>;
}

export interface RedactionRule {
  id: string;
  fieldPath: string;
  redactionType: 'remove' | 'mask' | 'hash' | 'generalize';
  pattern?: string;
  replacement?: string;
}

export interface ExportMetadata {
  datasetName: string;
  datasetVersion: string;
  exportTimestamp: Date;
  policyProfile: string;
  modelTarget?: string;
  useCase: string;
  schemaVersion: string;
  checksum: string;
  recordCount: number;
  splitDistribution: Record<SplitType, number>;
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateDatasetRequest {
  name: string;
  description: string;
  taskType: TaskType;
  useCase: string;
  modelTarget?: string;
  license: LicenseMetadata;
  jurisdiction: JurisdictionMetadata;
  policyProfileId: string;
  schema: DatasetSchema;
  tags?: string[];
}

export interface UpdateDatasetRequest {
  name?: string;
  description?: string;
  status?: DatasetStatus;
  tags?: string[];
  policyProfileId?: string;
}

export interface CreateSampleRequest {
  datasetId: string;
  externalId?: string;
  content: SampleContent;
  metadata: Omit<SampleMetadata, 'hash' | 'size'>;
  isGolden?: boolean;
  expectedLabel?: Record<string, unknown>;
  priority?: number;
}

export interface SubmitLabelRequest {
  jobId: string;
  labels: Label[];
  confidence?: number;
  notes?: string;
  timeSpent: number;
}

export interface ReviewLabelRequest {
  labelSetId: string;
  approved: boolean;
  notes?: string;
}

export interface CreateExportRequest {
  datasetId: string;
  format: ExportFormat;
  splits?: SplitType[];
  filterCriteria?: ExportFilter;
  policyProfileId: string;
}

export interface AssignJobRequest {
  annotatorId: string;
  jobIds?: string[];
  count?: number;
  taskType?: TaskType;
}

// ============================================================================
// Pagination Types
// ============================================================================

export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    totalItems: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

// ============================================================================
// Governance Types
// ============================================================================

export interface GovernanceCheck {
  sampleId: string;
  datasetId: string;
  checkType: string;
  passed: boolean;
  violations: GovernanceViolation[];
  checkedAt: Date;
  policyVersion: string;
}

export interface GovernanceViolation {
  code: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  fieldPath?: string;
  remediation?: string;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  requiredActions: string[];
  policyVersion: string;
  checkedAt: Date;
}

// ============================================================================
// Audit Types
// ============================================================================

export interface AuditEntry {
  id: string;
  entityType: 'dataset' | 'sample' | 'label' | 'export' | 'workflow';
  entityId: string;
  action: string;
  actorId: string;
  actorRole: string;
  timestamp: Date;
  previousState?: Record<string, unknown>;
  newState?: Record<string, unknown>;
  metadata: Record<string, unknown>;
}
