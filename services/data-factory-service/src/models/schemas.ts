/**
 * Data Factory Service - Zod Validation Schemas
 *
 * Comprehensive validation schemas for all data factory entities.
 * These schemas are used for request validation and data integrity.
 */

import { z } from 'zod';
import {
  SplitType,
  TaskType,
  LabelStatus,
  DatasetStatus,
  AnnotatorRole,
  JobStatus,
  LicenseType,
  ExportFormat,
} from '../types/index.js';

// ============================================================================
// Enum Schemas
// ============================================================================

export const SplitTypeSchema = z.enum([
  SplitType.TRAIN,
  SplitType.DEV,
  SplitType.TEST,
  SplitType.VALIDATION,
]);

export const TaskTypeSchema = z.enum([
  TaskType.ENTITY_MATCH,
  TaskType.ENTITY_NO_MATCH,
  TaskType.CLUSTER_REVIEW,
  TaskType.CLAIM_ASSESSMENT,
  TaskType.SAFETY_DECISION,
  TaskType.RELATIONSHIP_VALIDATION,
  TaskType.TEXT_CLASSIFICATION,
  TaskType.NAMED_ENTITY_RECOGNITION,
  TaskType.SEQUENCE_LABELING,
]);

export const LabelStatusSchema = z.enum([
  LabelStatus.PENDING,
  LabelStatus.IN_PROGRESS,
  LabelStatus.COMPLETED,
  LabelStatus.NEEDS_REVIEW,
  LabelStatus.APPROVED,
  LabelStatus.REJECTED,
]);

export const DatasetStatusSchema = z.enum([
  DatasetStatus.DRAFT,
  DatasetStatus.ACTIVE,
  DatasetStatus.ARCHIVED,
  DatasetStatus.DEPRECATED,
]);

export const AnnotatorRoleSchema = z.enum([
  AnnotatorRole.ANNOTATOR,
  AnnotatorRole.REVIEWER,
  AnnotatorRole.ADMIN,
  AnnotatorRole.QUALITY_LEAD,
]);

export const JobStatusSchema = z.enum([
  JobStatus.QUEUED,
  JobStatus.ASSIGNED,
  JobStatus.IN_PROGRESS,
  JobStatus.SUBMITTED,
  JobStatus.UNDER_REVIEW,
  JobStatus.APPROVED,
  JobStatus.REJECTED,
  JobStatus.ESCALATED,
]);

export const LicenseTypeSchema = z.enum([
  LicenseType.INTERNAL,
  LicenseType.PUBLIC_DOMAIN,
  LicenseType.CC_BY,
  LicenseType.CC_BY_SA,
  LicenseType.CC_BY_NC,
  LicenseType.PROPRIETARY,
  LicenseType.RESTRICTED,
  LicenseType.GOVERNMENT,
]);

export const ExportFormatSchema = z.enum([
  ExportFormat.JSONL,
  ExportFormat.PARQUET,
  ExportFormat.CSV,
  ExportFormat.JSON,
]);

// ============================================================================
// Provenance Schemas
// ============================================================================

export const TransformationRecordSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.coerce.date(),
  operation: z.string().min(1).max(255),
  parameters: z.record(z.unknown()),
  executedBy: z.string().min(1),
  inputHash: z.string().min(1),
  outputHash: z.string().min(1),
});

export const SourceProvenanceSchema = z.object({
  sourceId: z.string().min(1),
  sourceName: z.string().min(1).max(255),
  sourceType: z.string().min(1).max(100),
  collectionDate: z.coerce.date(),
  collectionMethod: z.string().min(1).max(255),
  originalFormat: z.string().min(1).max(100),
  transformationHistory: z.array(TransformationRecordSchema).default([]),
});

export const LicenseMetadataSchema = z.object({
  licenseId: z.string().min(1),
  licenseType: LicenseTypeSchema,
  licenseText: z.string().optional(),
  licenseUrl: z.string().url().optional(),
  attributionRequired: z.boolean(),
  commercialUseAllowed: z.boolean(),
  derivativeWorksAllowed: z.boolean(),
  sharingAllowed: z.boolean(),
  expirationDate: z.coerce.date().optional(),
});

export const JurisdictionMetadataSchema = z.object({
  jurisdiction: z.string().min(1).max(100),
  dataLocalizationRequired: z.boolean(),
  retentionPolicyId: z.string().min(1),
  retentionDays: z.number().int().positive(),
  complianceFrameworks: z.array(z.string()).default([]),
  exportRestrictions: z.array(z.string()).default([]),
});

// ============================================================================
// Schema Definition Schemas
// ============================================================================

export const FieldConstraintsSchema = z.object({
  minLength: z.number().int().nonnegative().optional(),
  maxLength: z.number().int().positive().optional(),
  pattern: z.string().optional(),
  enum: z.array(z.string()).optional(),
  min: z.number().optional(),
  max: z.number().optional(),
});

export const SchemaFieldSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['string', 'number', 'boolean', 'array', 'object', 'date']),
  required: z.boolean(),
  description: z.string().max(500).optional(),
  constraints: FieldConstraintsSchema.optional(),
});

export const DatasetSchemaSchema = z.object({
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  inputFields: z.array(SchemaFieldSchema).min(1),
  labelFields: z.array(SchemaFieldSchema).min(1),
  metadataFields: z.array(SchemaFieldSchema).default([]),
});

// ============================================================================
// Policy Schemas
// ============================================================================

export const PolicyProfileSchema = z.object({
  profileId: z.string().min(1),
  profileName: z.string().min(1).max(255),
  allowedUseCases: z.array(z.string()),
  prohibitedUseCases: z.array(z.string()),
  requiredRedactions: z.array(z.string()),
  piiHandling: z.enum(['remove', 'mask', 'encrypt', 'allow']),
  sensitivityLevel: z.enum(['public', 'internal', 'confidential', 'restricted']),
  auditLevel: z.enum(['minimal', 'standard', 'comprehensive']),
});

export const QualityMetricsSchema = z.object({
  interAnnotatorAgreement: z.number().min(0).max(1).optional(),
  goldenQuestionAccuracy: z.number().min(0).max(1).optional(),
  averageLabelTime: z.number().nonnegative().optional(),
  rejectionRate: z.number().min(0).max(1).optional(),
  escalationRate: z.number().min(0).max(1).optional(),
  labelDistribution: z.record(z.number()),
});

// ============================================================================
// Dataset Schemas
// ============================================================================

export const DatasetSplitSchema = z.object({
  splitType: SplitTypeSchema,
  sampleCount: z.number().int().nonnegative(),
  percentage: z.number().min(0).max(100),
  seed: z.number().int(),
  stratifyBy: z.string().optional(),
});

export const DatasetSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000),
  version: z.string().regex(/^\d+\.\d+\.\d+$/),
  status: DatasetStatusSchema,
  taskType: TaskTypeSchema,
  useCase: z.string().min(1).max(255),
  modelTarget: z.string().max(255).optional(),
  sampleCount: z.number().int().nonnegative(),
  labeledSampleCount: z.number().int().nonnegative(),
  splits: z.array(DatasetSplitSchema),
  provenance: SourceProvenanceSchema,
  license: LicenseMetadataSchema,
  jurisdiction: JurisdictionMetadataSchema,
  policyProfile: PolicyProfileSchema,
  schema: DatasetSchemaSchema,
  qualityMetrics: QualityMetricsSchema,
  tags: z.array(z.string()).default([]),
  createdBy: z.string().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  publishedAt: z.coerce.date().optional(),
});

export const CreateDatasetRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000),
  taskType: TaskTypeSchema,
  useCase: z.string().min(1).max(255),
  modelTarget: z.string().max(255).optional(),
  license: LicenseMetadataSchema,
  jurisdiction: JurisdictionMetadataSchema,
  policyProfileId: z.string().min(1),
  schema: DatasetSchemaSchema,
  tags: z.array(z.string()).default([]),
});

export const UpdateDatasetRequestSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(2000).optional(),
  status: DatasetStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  policyProfileId: z.string().min(1).optional(),
});

// ============================================================================
// Sample Schemas
// ============================================================================

export const EntityDataSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  name: z.string().min(1),
  properties: z.record(z.unknown()),
});

export const EntityPairSchema = z.object({
  entityA: EntityDataSchema,
  entityB: EntityDataSchema,
});

export const RelationshipDataSchema = z.object({
  sourceEntityId: z.string().min(1),
  targetEntityId: z.string().min(1),
  relationshipType: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
  properties: z.record(z.unknown()),
});

export const ClaimDataSchema = z.object({
  id: z.string().min(1),
  claimText: z.string().min(1),
  source: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
  supportingEvidence: z.array(z.string()).optional(),
});

export const SampleContentSchema = z.object({
  text: z.string().optional(),
  entities: z.array(EntityPairSchema).optional(),
  relationships: z.array(RelationshipDataSchema).optional(),
  claims: z.array(ClaimDataSchema).optional(),
  raw: z.record(z.unknown()).optional(),
});

export const SampleMetadataSchema = z.object({
  sourceId: z.string().min(1),
  sourceName: z.string().min(1).max(255),
  collectionDate: z.coerce.date(),
  originalFormat: z.string().min(1).max(100),
  hash: z.string().min(1),
  size: z.number().int().nonnegative(),
  language: z.string().max(10).optional(),
  domain: z.string().max(100).optional(),
  customFields: z.record(z.unknown()).default({}),
});

export const SampleSchema = z.object({
  id: z.string().uuid(),
  datasetId: z.string().uuid(),
  externalId: z.string().optional(),
  content: SampleContentSchema,
  metadata: SampleMetadataSchema,
  labels: z.array(z.lazy(() => LabelSetSchema)).default([]),
  split: SplitTypeSchema.optional(),
  status: LabelStatusSchema,
  isGolden: z.boolean(),
  expectedLabel: z.record(z.unknown()).optional(),
  priority: z.number().int().min(0).max(100),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateSampleRequestSchema = z.object({
  datasetId: z.string().uuid(),
  externalId: z.string().optional(),
  content: SampleContentSchema,
  metadata: z.object({
    sourceId: z.string().min(1),
    sourceName: z.string().min(1).max(255),
    collectionDate: z.coerce.date(),
    originalFormat: z.string().min(1).max(100),
    language: z.string().max(10).optional(),
    domain: z.string().max(100).optional(),
    customFields: z.record(z.unknown()).default({}),
  }),
  isGolden: z.boolean().default(false),
  expectedLabel: z.record(z.unknown()).optional(),
  priority: z.number().int().min(0).max(100).default(50),
});

// ============================================================================
// Label Schemas
// ============================================================================

export const LabelSpanSchema = z.object({
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  label: z.string().min(1),
  confidence: z.number().min(0).max(1).optional(),
});

export const LabelSchema = z.object({
  fieldName: z.string().min(1),
  value: z.unknown(),
  confidence: z.number().min(0).max(1).optional(),
  spans: z.array(LabelSpanSchema).optional(),
});

export const LabelSetSchema = z.object({
  id: z.string().uuid(),
  sampleId: z.string().uuid(),
  annotatorId: z.string().min(1),
  annotatorRole: AnnotatorRoleSchema,
  taskType: TaskTypeSchema,
  labels: z.array(LabelSchema).min(1),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().max(2000).optional(),
  timeSpent: z.number().nonnegative(),
  status: LabelStatusSchema,
  reviewerId: z.string().optional(),
  reviewNotes: z.string().max(2000).optional(),
  reviewedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const SubmitLabelRequestSchema = z.object({
  jobId: z.string().uuid(),
  labels: z.array(LabelSchema).min(1),
  confidence: z.number().min(0).max(1).optional(),
  notes: z.string().max(2000).optional(),
  timeSpent: z.number().nonnegative(),
});

export const ReviewLabelRequestSchema = z.object({
  labelSetId: z.string().uuid(),
  approved: z.boolean(),
  notes: z.string().max(2000).optional(),
});

// ============================================================================
// Job Schemas
// ============================================================================

export const LabelingJobSchema = z.object({
  id: z.string().uuid(),
  datasetId: z.string().uuid(),
  sampleId: z.string().uuid(),
  taskType: TaskTypeSchema,
  annotatorId: z.string().optional(),
  status: JobStatusSchema,
  priority: z.number().int().min(0).max(100),
  assignedAt: z.coerce.date().optional(),
  startedAt: z.coerce.date().optional(),
  submittedAt: z.coerce.date().optional(),
  dueAt: z.coerce.date().optional(),
  instructions: z.string(),
  labelSchemaId: z.string().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const AssignJobRequestSchema = z.object({
  annotatorId: z.string().min(1),
  jobIds: z.array(z.string().uuid()).optional(),
  count: z.number().int().positive().optional(),
  taskType: TaskTypeSchema.optional(),
});

// ============================================================================
// Quality Settings Schema
// ============================================================================

export const QualitySettingsSchema = z.object({
  goldenQuestionFrequency: z.number().min(0).max(1),
  minAgreementThreshold: z.number().min(0).max(1),
  reviewSamplingRate: z.number().min(0).max(1),
  maxAnnotationsPerSample: z.number().int().positive(),
  disagreementResolution: z.enum(['majority_vote', 'expert_review', 'adjudication']),
  autoApprovalThreshold: z.number().min(0).max(1).optional(),
});

// ============================================================================
// Workflow Schemas
// ============================================================================

export const CompletionCriteriaSchema = z.object({
  minSamplesLabeled: z.number().int().nonnegative().optional(),
  minAgreementThreshold: z.number().min(0).max(1).optional(),
  minQualityScore: z.number().min(0).max(1).optional(),
  maxTimeLimit: z.number().int().positive().optional(),
});

export const WorkflowStageSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  type: z.enum(['annotation', 'review', 'adjudication', 'export']),
  requiredRole: AnnotatorRoleSchema,
  minAnnotators: z.number().int().positive(),
  samplingStrategy: z.enum(['all', 'random', 'stratified', 'active_learning']),
  samplingRate: z.number().min(0).max(1).optional(),
  completionCriteria: CompletionCriteriaSchema,
});

export const LabelingWorkflowSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(2000),
  datasetId: z.string().uuid(),
  taskType: TaskTypeSchema,
  stages: z.array(WorkflowStageSchema).min(1),
  currentStageIndex: z.number().int().nonnegative(),
  status: z.enum(['draft', 'active', 'paused', 'completed']),
  qualitySettings: QualitySettingsSchema,
  createdBy: z.string().min(1),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  completedAt: z.coerce.date().optional(),
});

export const CreateWorkflowRequestSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(2000),
  datasetId: z.string().uuid(),
  taskType: TaskTypeSchema,
  stages: z.array(
    z.object({
      name: z.string().min(1).max(255),
      type: z.enum(['annotation', 'review', 'adjudication', 'export']),
      requiredRole: AnnotatorRoleSchema,
      minAnnotators: z.number().int().positive(),
      samplingStrategy: z.enum(['all', 'random', 'stratified', 'active_learning']),
      samplingRate: z.number().min(0).max(1).optional(),
      completionCriteria: CompletionCriteriaSchema,
    })
  ).min(1),
  qualitySettings: QualitySettingsSchema,
});

// ============================================================================
// Export Schemas
// ============================================================================

export const ExportFilterSchema = z.object({
  splits: z.array(SplitTypeSchema).optional(),
  labelStatus: z.array(LabelStatusSchema).optional(),
  minConfidence: z.number().min(0).max(1).optional(),
  dateRange: z.object({
    start: z.coerce.date(),
    end: z.coerce.date(),
  }).optional(),
  customFilters: z.record(z.unknown()).optional(),
});

export const RedactionRuleSchema = z.object({
  id: z.string().uuid(),
  fieldPath: z.string().min(1),
  redactionType: z.enum(['remove', 'mask', 'hash', 'generalize']),
  pattern: z.string().optional(),
  replacement: z.string().optional(),
});

export const CreateExportRequestSchema = z.object({
  datasetId: z.string().uuid(),
  format: ExportFormatSchema,
  splits: z.array(SplitTypeSchema).optional(),
  filterCriteria: ExportFilterSchema.optional(),
  policyProfileId: z.string().min(1),
});

export const ExportMetadataSchema = z.object({
  datasetName: z.string(),
  datasetVersion: z.string(),
  exportTimestamp: z.coerce.date(),
  policyProfile: z.string(),
  modelTarget: z.string().optional(),
  useCase: z.string(),
  schemaVersion: z.string(),
  checksum: z.string(),
  recordCount: z.number().int().nonnegative(),
  splitDistribution: z.record(SplitTypeSchema, z.number().int().nonnegative()),
});

// ============================================================================
// Pagination Schema
// ============================================================================

export const PaginationParamsSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// ============================================================================
// Annotator Schemas
// ============================================================================

export const AnnotatorMetricsSchema = z.object({
  totalLabeled: z.number().int().nonnegative(),
  accuracy: z.number().min(0).max(1),
  goldenQuestionAccuracy: z.number().min(0).max(1),
  averageTimePerTask: z.number().nonnegative(),
  agreementRate: z.number().min(0).max(1),
  rejectionRate: z.number().min(0).max(1),
  lastActiveAt: z.coerce.date().optional(),
});

export const AnnotatorSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().min(1),
  displayName: z.string().min(1).max(255),
  email: z.string().email(),
  role: AnnotatorRoleSchema,
  taskTypes: z.array(TaskTypeSchema),
  qualifications: z.array(z.string()),
  performanceMetrics: AnnotatorMetricsSchema,
  isActive: z.boolean(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export const CreateAnnotatorRequestSchema = z.object({
  userId: z.string().min(1),
  displayName: z.string().min(1).max(255),
  email: z.string().email(),
  role: AnnotatorRoleSchema,
  taskTypes: z.array(TaskTypeSchema),
  qualifications: z.array(z.string()).default([]),
});

// ============================================================================
// Governance Schemas
// ============================================================================

export const GovernanceViolationSchema = z.object({
  code: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  message: z.string(),
  fieldPath: z.string().optional(),
  remediation: z.string().optional(),
});

export const GovernanceCheckSchema = z.object({
  sampleId: z.string().uuid(),
  datasetId: z.string().uuid(),
  checkType: z.string(),
  passed: z.boolean(),
  violations: z.array(GovernanceViolationSchema),
  checkedAt: z.coerce.date(),
  policyVersion: z.string(),
});

export const EligibilityResultSchema = z.object({
  eligible: z.boolean(),
  reasons: z.array(z.string()),
  requiredActions: z.array(z.string()),
  policyVersion: z.string(),
  checkedAt: z.coerce.date(),
});
