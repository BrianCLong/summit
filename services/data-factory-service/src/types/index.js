"use strict";
// @ts-nocheck
/**
 * Data Factory Service - Core Type Definitions
 *
 * This module defines all TypeScript types used throughout the data factory service
 * for dataset management, labeling workflows, and training data curation.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportFormat = exports.LicenseType = exports.JobStatus = exports.AnnotatorRole = exports.DatasetStatus = exports.LabelStatus = exports.TaskType = exports.SplitType = void 0;
// ============================================================================
// Enums and Constants
// ============================================================================
exports.SplitType = {
    TRAIN: 'train',
    DEV: 'dev',
    TEST: 'test',
    VALIDATION: 'validation',
};
exports.TaskType = {
    ENTITY_MATCH: 'entity_match',
    ENTITY_NO_MATCH: 'entity_no_match',
    CLUSTER_REVIEW: 'cluster_review',
    CLAIM_ASSESSMENT: 'claim_assessment',
    SAFETY_DECISION: 'safety_decision',
    RELATIONSHIP_VALIDATION: 'relationship_validation',
    TEXT_CLASSIFICATION: 'text_classification',
    NAMED_ENTITY_RECOGNITION: 'named_entity_recognition',
    SEQUENCE_LABELING: 'sequence_labeling',
};
exports.LabelStatus = {
    PENDING: 'pending',
    IN_PROGRESS: 'in_progress',
    COMPLETED: 'completed',
    NEEDS_REVIEW: 'needs_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
};
exports.DatasetStatus = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    ARCHIVED: 'archived',
    DEPRECATED: 'deprecated',
};
exports.AnnotatorRole = {
    ANNOTATOR: 'annotator',
    REVIEWER: 'reviewer',
    ADMIN: 'admin',
    QUALITY_LEAD: 'quality_lead',
};
exports.JobStatus = {
    QUEUED: 'queued',
    ASSIGNED: 'assigned',
    IN_PROGRESS: 'in_progress',
    SUBMITTED: 'submitted',
    UNDER_REVIEW: 'under_review',
    APPROVED: 'approved',
    REJECTED: 'rejected',
    ESCALATED: 'escalated',
};
exports.LicenseType = {
    INTERNAL: 'internal',
    PUBLIC_DOMAIN: 'public_domain',
    CC_BY: 'cc_by',
    CC_BY_SA: 'cc_by_sa',
    CC_BY_NC: 'cc_by_nc',
    PROPRIETARY: 'proprietary',
    RESTRICTED: 'restricted',
    GOVERNMENT: 'government',
};
exports.ExportFormat = {
    JSONL: 'jsonl',
    PARQUET: 'parquet',
    CSV: 'csv',
    JSON: 'json',
};
