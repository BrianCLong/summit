"use strict";
/**
 * Data Factory Service - Zod Validation Schemas
 *
 * Comprehensive validation schemas for all data factory entities.
 * These schemas are used for request validation and data integrity.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GovernanceViolationSchema = exports.CreateAnnotatorRequestSchema = exports.AnnotatorSchema = exports.AnnotatorMetricsSchema = exports.PaginationParamsSchema = exports.ExportMetadataSchema = exports.CreateExportRequestSchema = exports.RedactionRuleSchema = exports.ExportFilterSchema = exports.CreateWorkflowRequestSchema = exports.LabelingWorkflowSchema = exports.WorkflowStageSchema = exports.CompletionCriteriaSchema = exports.QualitySettingsSchema = exports.AssignJobRequestSchema = exports.LabelingJobSchema = exports.ReviewLabelRequestSchema = exports.SubmitLabelRequestSchema = exports.LabelSetSchema = exports.LabelSchema = exports.LabelSpanSchema = exports.CreateSampleRequestSchema = exports.SampleSchema = exports.SampleMetadataSchema = exports.SampleContentSchema = exports.ClaimDataSchema = exports.RelationshipDataSchema = exports.EntityPairSchema = exports.EntityDataSchema = exports.UpdateDatasetRequestSchema = exports.CreateDatasetRequestSchema = exports.DatasetSchema = exports.DatasetSplitSchema = exports.QualityMetricsSchema = exports.PolicyProfileSchema = exports.DatasetSchemaSchema = exports.SchemaFieldSchema = exports.FieldConstraintsSchema = exports.JurisdictionMetadataSchema = exports.LicenseMetadataSchema = exports.SourceProvenanceSchema = exports.TransformationRecordSchema = exports.ExportFormatSchema = exports.LicenseTypeSchema = exports.JobStatusSchema = exports.AnnotatorRoleSchema = exports.DatasetStatusSchema = exports.LabelStatusSchema = exports.TaskTypeSchema = exports.SplitTypeSchema = void 0;
exports.EligibilityResultSchema = exports.GovernanceCheckSchema = void 0;
const zod_1 = require("zod");
const index_js_1 = require("../types/index.js");
// ============================================================================
// Enum Schemas
// ============================================================================
exports.SplitTypeSchema = zod_1.z.enum([
    index_js_1.SplitType.TRAIN,
    index_js_1.SplitType.DEV,
    index_js_1.SplitType.TEST,
    index_js_1.SplitType.VALIDATION,
]);
exports.TaskTypeSchema = zod_1.z.enum([
    index_js_1.TaskType.ENTITY_MATCH,
    index_js_1.TaskType.ENTITY_NO_MATCH,
    index_js_1.TaskType.CLUSTER_REVIEW,
    index_js_1.TaskType.CLAIM_ASSESSMENT,
    index_js_1.TaskType.SAFETY_DECISION,
    index_js_1.TaskType.RELATIONSHIP_VALIDATION,
    index_js_1.TaskType.TEXT_CLASSIFICATION,
    index_js_1.TaskType.NAMED_ENTITY_RECOGNITION,
    index_js_1.TaskType.SEQUENCE_LABELING,
]);
exports.LabelStatusSchema = zod_1.z.enum([
    index_js_1.LabelStatus.PENDING,
    index_js_1.LabelStatus.IN_PROGRESS,
    index_js_1.LabelStatus.COMPLETED,
    index_js_1.LabelStatus.NEEDS_REVIEW,
    index_js_1.LabelStatus.APPROVED,
    index_js_1.LabelStatus.REJECTED,
]);
exports.DatasetStatusSchema = zod_1.z.enum([
    index_js_1.DatasetStatus.DRAFT,
    index_js_1.DatasetStatus.ACTIVE,
    index_js_1.DatasetStatus.ARCHIVED,
    index_js_1.DatasetStatus.DEPRECATED,
]);
exports.AnnotatorRoleSchema = zod_1.z.enum([
    index_js_1.AnnotatorRole.ANNOTATOR,
    index_js_1.AnnotatorRole.REVIEWER,
    index_js_1.AnnotatorRole.ADMIN,
    index_js_1.AnnotatorRole.QUALITY_LEAD,
]);
exports.JobStatusSchema = zod_1.z.enum([
    index_js_1.JobStatus.QUEUED,
    index_js_1.JobStatus.ASSIGNED,
    index_js_1.JobStatus.IN_PROGRESS,
    index_js_1.JobStatus.SUBMITTED,
    index_js_1.JobStatus.UNDER_REVIEW,
    index_js_1.JobStatus.APPROVED,
    index_js_1.JobStatus.REJECTED,
    index_js_1.JobStatus.ESCALATED,
]);
exports.LicenseTypeSchema = zod_1.z.enum([
    index_js_1.LicenseType.INTERNAL,
    index_js_1.LicenseType.PUBLIC_DOMAIN,
    index_js_1.LicenseType.CC_BY,
    index_js_1.LicenseType.CC_BY_SA,
    index_js_1.LicenseType.CC_BY_NC,
    index_js_1.LicenseType.PROPRIETARY,
    index_js_1.LicenseType.RESTRICTED,
    index_js_1.LicenseType.GOVERNMENT,
]);
exports.ExportFormatSchema = zod_1.z.enum([
    index_js_1.ExportFormat.JSONL,
    index_js_1.ExportFormat.PARQUET,
    index_js_1.ExportFormat.CSV,
    index_js_1.ExportFormat.JSON,
]);
// ============================================================================
// Provenance Schemas
// ============================================================================
exports.TransformationRecordSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.coerce.date(),
    operation: zod_1.z.string().min(1).max(255),
    parameters: zod_1.z.record(zod_1.z.unknown()),
    executedBy: zod_1.z.string().min(1),
    inputHash: zod_1.z.string().min(1),
    outputHash: zod_1.z.string().min(1),
});
exports.SourceProvenanceSchema = zod_1.z.object({
    sourceId: zod_1.z.string().min(1),
    sourceName: zod_1.z.string().min(1).max(255),
    sourceType: zod_1.z.string().min(1).max(100),
    collectionDate: zod_1.z.coerce.date(),
    collectionMethod: zod_1.z.string().min(1).max(255),
    originalFormat: zod_1.z.string().min(1).max(100),
    transformationHistory: zod_1.z.array(exports.TransformationRecordSchema).default([]),
});
exports.LicenseMetadataSchema = zod_1.z.object({
    licenseId: zod_1.z.string().min(1),
    licenseType: exports.LicenseTypeSchema,
    licenseText: zod_1.z.string().optional(),
    licenseUrl: zod_1.z.string().url().optional(),
    attributionRequired: zod_1.z.boolean(),
    commercialUseAllowed: zod_1.z.boolean(),
    derivativeWorksAllowed: zod_1.z.boolean(),
    sharingAllowed: zod_1.z.boolean(),
    expirationDate: zod_1.z.coerce.date().optional(),
});
exports.JurisdictionMetadataSchema = zod_1.z.object({
    jurisdiction: zod_1.z.string().min(1).max(100),
    dataLocalizationRequired: zod_1.z.boolean(),
    retentionPolicyId: zod_1.z.string().min(1),
    retentionDays: zod_1.z.number().int().positive(),
    complianceFrameworks: zod_1.z.array(zod_1.z.string()).default([]),
    exportRestrictions: zod_1.z.array(zod_1.z.string()).default([]),
});
// ============================================================================
// Schema Definition Schemas
// ============================================================================
exports.FieldConstraintsSchema = zod_1.z.object({
    minLength: zod_1.z.number().int().nonnegative().optional(),
    maxLength: zod_1.z.number().int().positive().optional(),
    pattern: zod_1.z.string().optional(),
    enum: zod_1.z.array(zod_1.z.string()).optional(),
    min: zod_1.z.number().optional(),
    max: zod_1.z.number().optional(),
});
exports.SchemaFieldSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    type: zod_1.z.enum(['string', 'number', 'boolean', 'array', 'object', 'date']),
    required: zod_1.z.boolean(),
    description: zod_1.z.string().max(500).optional(),
    constraints: exports.FieldConstraintsSchema.optional(),
});
exports.DatasetSchemaSchema = zod_1.z.object({
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
    inputFields: zod_1.z.array(exports.SchemaFieldSchema).min(1),
    labelFields: zod_1.z.array(exports.SchemaFieldSchema).min(1),
    metadataFields: zod_1.z.array(exports.SchemaFieldSchema).default([]),
});
// ============================================================================
// Policy Schemas
// ============================================================================
exports.PolicyProfileSchema = zod_1.z.object({
    profileId: zod_1.z.string().min(1),
    profileName: zod_1.z.string().min(1).max(255),
    allowedUseCases: zod_1.z.array(zod_1.z.string()),
    prohibitedUseCases: zod_1.z.array(zod_1.z.string()),
    requiredRedactions: zod_1.z.array(zod_1.z.string()),
    piiHandling: zod_1.z.enum(['remove', 'mask', 'encrypt', 'allow']),
    sensitivityLevel: zod_1.z.enum(['public', 'internal', 'confidential', 'restricted']),
    auditLevel: zod_1.z.enum(['minimal', 'standard', 'comprehensive']),
});
exports.QualityMetricsSchema = zod_1.z.object({
    interAnnotatorAgreement: zod_1.z.number().min(0).max(1).optional(),
    goldenQuestionAccuracy: zod_1.z.number().min(0).max(1).optional(),
    averageLabelTime: zod_1.z.number().nonnegative().optional(),
    rejectionRate: zod_1.z.number().min(0).max(1).optional(),
    escalationRate: zod_1.z.number().min(0).max(1).optional(),
    labelDistribution: zod_1.z.record(zod_1.z.number()),
});
// ============================================================================
// Dataset Schemas
// ============================================================================
exports.DatasetSplitSchema = zod_1.z.object({
    splitType: exports.SplitTypeSchema,
    sampleCount: zod_1.z.number().int().nonnegative(),
    percentage: zod_1.z.number().min(0).max(100),
    seed: zod_1.z.number().int(),
    stratifyBy: zod_1.z.string().optional(),
});
exports.DatasetSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(2000),
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+$/),
    status: exports.DatasetStatusSchema,
    taskType: exports.TaskTypeSchema,
    useCase: zod_1.z.string().min(1).max(255),
    modelTarget: zod_1.z.string().max(255).optional(),
    sampleCount: zod_1.z.number().int().nonnegative(),
    labeledSampleCount: zod_1.z.number().int().nonnegative(),
    splits: zod_1.z.array(exports.DatasetSplitSchema),
    provenance: exports.SourceProvenanceSchema,
    license: exports.LicenseMetadataSchema,
    jurisdiction: exports.JurisdictionMetadataSchema,
    policyProfile: exports.PolicyProfileSchema,
    schema: exports.DatasetSchemaSchema,
    qualityMetrics: exports.QualityMetricsSchema,
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    createdBy: zod_1.z.string().min(1),
    createdAt: zod_1.z.coerce.date(),
    updatedAt: zod_1.z.coerce.date(),
    publishedAt: zod_1.z.coerce.date().optional(),
});
exports.CreateDatasetRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(2000),
    taskType: exports.TaskTypeSchema,
    useCase: zod_1.z.string().min(1).max(255),
    modelTarget: zod_1.z.string().max(255).optional(),
    license: exports.LicenseMetadataSchema,
    jurisdiction: exports.JurisdictionMetadataSchema,
    policyProfileId: zod_1.z.string().min(1),
    schema: exports.DatasetSchemaSchema,
    tags: zod_1.z.array(zod_1.z.string()).default([]),
});
exports.UpdateDatasetRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255).optional(),
    description: zod_1.z.string().max(2000).optional(),
    status: exports.DatasetStatusSchema.optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    policyProfileId: zod_1.z.string().min(1).optional(),
});
// ============================================================================
// Sample Schemas
// ============================================================================
exports.EntityDataSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    type: zod_1.z.string().min(1),
    name: zod_1.z.string().min(1),
    properties: zod_1.z.record(zod_1.z.unknown()),
});
exports.EntityPairSchema = zod_1.z.object({
    entityA: exports.EntityDataSchema,
    entityB: exports.EntityDataSchema,
});
exports.RelationshipDataSchema = zod_1.z.object({
    sourceEntityId: zod_1.z.string().min(1),
    targetEntityId: zod_1.z.string().min(1),
    relationshipType: zod_1.z.string().min(1),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    properties: zod_1.z.record(zod_1.z.unknown()),
});
exports.ClaimDataSchema = zod_1.z.object({
    id: zod_1.z.string().min(1),
    claimText: zod_1.z.string().min(1),
    source: zod_1.z.string().min(1),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    supportingEvidence: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.SampleContentSchema = zod_1.z.object({
    text: zod_1.z.string().optional(),
    entities: zod_1.z.array(exports.EntityPairSchema).optional(),
    relationships: zod_1.z.array(exports.RelationshipDataSchema).optional(),
    claims: zod_1.z.array(exports.ClaimDataSchema).optional(),
    raw: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.SampleMetadataSchema = zod_1.z.object({
    sourceId: zod_1.z.string().min(1),
    sourceName: zod_1.z.string().min(1).max(255),
    collectionDate: zod_1.z.coerce.date(),
    originalFormat: zod_1.z.string().min(1).max(100),
    hash: zod_1.z.string().min(1),
    size: zod_1.z.number().int().nonnegative(),
    language: zod_1.z.string().max(10).optional(),
    domain: zod_1.z.string().max(100).optional(),
    customFields: zod_1.z.record(zod_1.z.unknown()).default({}),
});
exports.SampleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    datasetId: zod_1.z.string().uuid(),
    externalId: zod_1.z.string().optional(),
    content: exports.SampleContentSchema,
    metadata: exports.SampleMetadataSchema,
    labels: zod_1.z.array(zod_1.z.lazy(() => exports.LabelSetSchema)).default([]),
    split: exports.SplitTypeSchema.optional(),
    status: exports.LabelStatusSchema,
    isGolden: zod_1.z.boolean(),
    expectedLabel: zod_1.z.record(zod_1.z.unknown()).optional(),
    priority: zod_1.z.number().int().min(0).max(100),
    createdAt: zod_1.z.coerce.date(),
    updatedAt: zod_1.z.coerce.date(),
});
exports.CreateSampleRequestSchema = zod_1.z.object({
    datasetId: zod_1.z.string().uuid(),
    externalId: zod_1.z.string().optional(),
    content: exports.SampleContentSchema,
    metadata: zod_1.z.object({
        sourceId: zod_1.z.string().min(1),
        sourceName: zod_1.z.string().min(1).max(255),
        collectionDate: zod_1.z.coerce.date(),
        originalFormat: zod_1.z.string().min(1).max(100),
        language: zod_1.z.string().max(10).optional(),
        domain: zod_1.z.string().max(100).optional(),
        customFields: zod_1.z.record(zod_1.z.unknown()).default({}),
    }),
    isGolden: zod_1.z.boolean().default(false),
    expectedLabel: zod_1.z.record(zod_1.z.unknown()).optional(),
    priority: zod_1.z.number().int().min(0).max(100).default(50),
});
// ============================================================================
// Label Schemas
// ============================================================================
exports.LabelSpanSchema = zod_1.z.object({
    start: zod_1.z.number().int().nonnegative(),
    end: zod_1.z.number().int().positive(),
    label: zod_1.z.string().min(1),
    confidence: zod_1.z.number().min(0).max(1).optional(),
});
exports.LabelSchema = zod_1.z.object({
    fieldName: zod_1.z.string().min(1),
    value: zod_1.z.unknown(),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    spans: zod_1.z.array(exports.LabelSpanSchema).optional(),
});
exports.LabelSetSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    sampleId: zod_1.z.string().uuid(),
    annotatorId: zod_1.z.string().min(1),
    annotatorRole: exports.AnnotatorRoleSchema,
    taskType: exports.TaskTypeSchema,
    labels: zod_1.z.array(exports.LabelSchema).min(1),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    notes: zod_1.z.string().max(2000).optional(),
    timeSpent: zod_1.z.number().nonnegative(),
    status: exports.LabelStatusSchema,
    reviewerId: zod_1.z.string().optional(),
    reviewNotes: zod_1.z.string().max(2000).optional(),
    reviewedAt: zod_1.z.coerce.date().optional(),
    createdAt: zod_1.z.coerce.date(),
    updatedAt: zod_1.z.coerce.date(),
});
exports.SubmitLabelRequestSchema = zod_1.z.object({
    jobId: zod_1.z.string().uuid(),
    labels: zod_1.z.array(exports.LabelSchema).min(1),
    confidence: zod_1.z.number().min(0).max(1).optional(),
    notes: zod_1.z.string().max(2000).optional(),
    timeSpent: zod_1.z.number().nonnegative(),
});
exports.ReviewLabelRequestSchema = zod_1.z.object({
    labelSetId: zod_1.z.string().uuid(),
    approved: zod_1.z.boolean(),
    notes: zod_1.z.string().max(2000).optional(),
});
// ============================================================================
// Job Schemas
// ============================================================================
exports.LabelingJobSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    datasetId: zod_1.z.string().uuid(),
    sampleId: zod_1.z.string().uuid(),
    taskType: exports.TaskTypeSchema,
    annotatorId: zod_1.z.string().optional(),
    status: exports.JobStatusSchema,
    priority: zod_1.z.number().int().min(0).max(100),
    assignedAt: zod_1.z.coerce.date().optional(),
    startedAt: zod_1.z.coerce.date().optional(),
    submittedAt: zod_1.z.coerce.date().optional(),
    dueAt: zod_1.z.coerce.date().optional(),
    instructions: zod_1.z.string(),
    labelSchemaId: zod_1.z.string().min(1),
    createdAt: zod_1.z.coerce.date(),
    updatedAt: zod_1.z.coerce.date(),
});
exports.AssignJobRequestSchema = zod_1.z.object({
    annotatorId: zod_1.z.string().min(1),
    jobIds: zod_1.z.array(zod_1.z.string().uuid()).optional(),
    count: zod_1.z.number().int().positive().optional(),
    taskType: exports.TaskTypeSchema.optional(),
});
// ============================================================================
// Quality Settings Schema
// ============================================================================
exports.QualitySettingsSchema = zod_1.z.object({
    goldenQuestionFrequency: zod_1.z.number().min(0).max(1),
    minAgreementThreshold: zod_1.z.number().min(0).max(1),
    reviewSamplingRate: zod_1.z.number().min(0).max(1),
    maxAnnotationsPerSample: zod_1.z.number().int().positive(),
    disagreementResolution: zod_1.z.enum(['majority_vote', 'expert_review', 'adjudication']),
    autoApprovalThreshold: zod_1.z.number().min(0).max(1).optional(),
});
// ============================================================================
// Workflow Schemas
// ============================================================================
exports.CompletionCriteriaSchema = zod_1.z.object({
    minSamplesLabeled: zod_1.z.number().int().nonnegative().optional(),
    minAgreementThreshold: zod_1.z.number().min(0).max(1).optional(),
    minQualityScore: zod_1.z.number().min(0).max(1).optional(),
    maxTimeLimit: zod_1.z.number().int().positive().optional(),
});
exports.WorkflowStageSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    type: zod_1.z.enum(['annotation', 'review', 'adjudication', 'export']),
    requiredRole: exports.AnnotatorRoleSchema,
    minAnnotators: zod_1.z.number().int().positive(),
    samplingStrategy: zod_1.z.enum(['all', 'random', 'stratified', 'active_learning']),
    samplingRate: zod_1.z.number().min(0).max(1).optional(),
    completionCriteria: exports.CompletionCriteriaSchema,
});
exports.LabelingWorkflowSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(2000),
    datasetId: zod_1.z.string().uuid(),
    taskType: exports.TaskTypeSchema,
    stages: zod_1.z.array(exports.WorkflowStageSchema).min(1),
    currentStageIndex: zod_1.z.number().int().nonnegative(),
    status: zod_1.z.enum(['draft', 'active', 'paused', 'completed']),
    qualitySettings: exports.QualitySettingsSchema,
    createdBy: zod_1.z.string().min(1),
    createdAt: zod_1.z.coerce.date(),
    updatedAt: zod_1.z.coerce.date(),
    completedAt: zod_1.z.coerce.date().optional(),
});
exports.CreateWorkflowRequestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(255),
    description: zod_1.z.string().max(2000),
    datasetId: zod_1.z.string().uuid(),
    taskType: exports.TaskTypeSchema,
    stages: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string().min(1).max(255),
        type: zod_1.z.enum(['annotation', 'review', 'adjudication', 'export']),
        requiredRole: exports.AnnotatorRoleSchema,
        minAnnotators: zod_1.z.number().int().positive(),
        samplingStrategy: zod_1.z.enum(['all', 'random', 'stratified', 'active_learning']),
        samplingRate: zod_1.z.number().min(0).max(1).optional(),
        completionCriteria: exports.CompletionCriteriaSchema,
    })).min(1),
    qualitySettings: exports.QualitySettingsSchema,
});
// ============================================================================
// Export Schemas
// ============================================================================
exports.ExportFilterSchema = zod_1.z.object({
    splits: zod_1.z.array(exports.SplitTypeSchema).optional(),
    labelStatus: zod_1.z.array(exports.LabelStatusSchema).optional(),
    minConfidence: zod_1.z.number().min(0).max(1).optional(),
    dateRange: zod_1.z.object({
        start: zod_1.z.coerce.date(),
        end: zod_1.z.coerce.date(),
    }).optional(),
    customFilters: zod_1.z.record(zod_1.z.unknown()).optional(),
});
exports.RedactionRuleSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    fieldPath: zod_1.z.string().min(1),
    redactionType: zod_1.z.enum(['remove', 'mask', 'hash', 'generalize']),
    pattern: zod_1.z.string().optional(),
    replacement: zod_1.z.string().optional(),
});
exports.CreateExportRequestSchema = zod_1.z.object({
    datasetId: zod_1.z.string().uuid(),
    format: exports.ExportFormatSchema,
    splits: zod_1.z.array(exports.SplitTypeSchema).optional(),
    filterCriteria: exports.ExportFilterSchema.optional(),
    policyProfileId: zod_1.z.string().min(1),
});
exports.ExportMetadataSchema = zod_1.z.object({
    datasetName: zod_1.z.string(),
    datasetVersion: zod_1.z.string(),
    exportTimestamp: zod_1.z.coerce.date(),
    policyProfile: zod_1.z.string(),
    modelTarget: zod_1.z.string().optional(),
    useCase: zod_1.z.string(),
    schemaVersion: zod_1.z.string(),
    checksum: zod_1.z.string(),
    recordCount: zod_1.z.number().int().nonnegative(),
    splitDistribution: zod_1.z.record(exports.SplitTypeSchema, zod_1.z.number().int().nonnegative()),
});
// ============================================================================
// Pagination Schema
// ============================================================================
exports.PaginationParamsSchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().positive().default(1),
    pageSize: zod_1.z.coerce.number().int().positive().max(100).default(20),
    sortBy: zod_1.z.string().optional(),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// ============================================================================
// Annotator Schemas
// ============================================================================
exports.AnnotatorMetricsSchema = zod_1.z.object({
    totalLabeled: zod_1.z.number().int().nonnegative(),
    accuracy: zod_1.z.number().min(0).max(1),
    goldenQuestionAccuracy: zod_1.z.number().min(0).max(1),
    averageTimePerTask: zod_1.z.number().nonnegative(),
    agreementRate: zod_1.z.number().min(0).max(1),
    rejectionRate: zod_1.z.number().min(0).max(1),
    lastActiveAt: zod_1.z.coerce.date().optional(),
});
exports.AnnotatorSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    userId: zod_1.z.string().min(1),
    displayName: zod_1.z.string().min(1).max(255),
    email: zod_1.z.string().email(),
    role: exports.AnnotatorRoleSchema,
    taskTypes: zod_1.z.array(exports.TaskTypeSchema),
    qualifications: zod_1.z.array(zod_1.z.string()),
    performanceMetrics: exports.AnnotatorMetricsSchema,
    isActive: zod_1.z.boolean(),
    createdAt: zod_1.z.coerce.date(),
    updatedAt: zod_1.z.coerce.date(),
});
exports.CreateAnnotatorRequestSchema = zod_1.z.object({
    userId: zod_1.z.string().min(1),
    displayName: zod_1.z.string().min(1).max(255),
    email: zod_1.z.string().email(),
    role: exports.AnnotatorRoleSchema,
    taskTypes: zod_1.z.array(exports.TaskTypeSchema),
    qualifications: zod_1.z.array(zod_1.z.string()).default([]),
});
// ============================================================================
// Governance Schemas
// ============================================================================
exports.GovernanceViolationSchema = zod_1.z.object({
    code: zod_1.z.string().min(1),
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    message: zod_1.z.string(),
    fieldPath: zod_1.z.string().optional(),
    remediation: zod_1.z.string().optional(),
});
exports.GovernanceCheckSchema = zod_1.z.object({
    sampleId: zod_1.z.string().uuid(),
    datasetId: zod_1.z.string().uuid(),
    checkType: zod_1.z.string(),
    passed: zod_1.z.boolean(),
    violations: zod_1.z.array(exports.GovernanceViolationSchema),
    checkedAt: zod_1.z.coerce.date(),
    policyVersion: zod_1.z.string(),
});
exports.EligibilityResultSchema = zod_1.z.object({
    eligible: zod_1.z.boolean(),
    reasons: zod_1.z.array(zod_1.z.string()),
    requiredActions: zod_1.z.array(zod_1.z.string()),
    policyVersion: zod_1.z.string(),
    checkedAt: zod_1.z.coerce.date(),
});
