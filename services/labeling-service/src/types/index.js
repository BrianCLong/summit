"use strict";
/**
 * Type definitions for the labeling service
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DecisionLedgerExportSchema = exports.DecisionLedgerEntrySchema = exports.InterRaterAgreementSchema = exports.AuditEventSchema = exports.AdjudicationSchema = exports.CreateAdjudicationSchema = exports.QueueSchema = exports.CreateQueueSchema = exports.ReviewSchema = exports.CreateReviewSchema = exports.LabelSchema = exports.CreateLabelSchema = exports.AuditEventType = exports.UserRole = exports.QueueStatus = exports.LabelStatus = void 0;
const zod_1 = require("zod");
// ============================================================================
// Enums
// ============================================================================
var LabelStatus;
(function (LabelStatus) {
    LabelStatus["PENDING"] = "pending";
    LabelStatus["IN_REVIEW"] = "in_review";
    LabelStatus["APPROVED"] = "approved";
    LabelStatus["REJECTED"] = "rejected";
    LabelStatus["NEEDS_ADJUDICATION"] = "needs_adjudication";
    LabelStatus["ADJUDICATED"] = "adjudicated";
})(LabelStatus || (exports.LabelStatus = LabelStatus = {}));
var QueueStatus;
(function (QueueStatus) {
    QueueStatus["ACTIVE"] = "active";
    QueueStatus["PAUSED"] = "paused";
    QueueStatus["COMPLETED"] = "completed";
})(QueueStatus || (exports.QueueStatus = QueueStatus = {}));
var UserRole;
(function (UserRole) {
    UserRole["LABELER"] = "labeler";
    UserRole["REVIEWER"] = "reviewer";
    UserRole["ADJUDICATOR"] = "adjudicator";
    UserRole["ADMIN"] = "admin";
})(UserRole || (exports.UserRole = UserRole = {}));
var AuditEventType;
(function (AuditEventType) {
    AuditEventType["LABEL_CREATED"] = "label_created";
    AuditEventType["LABEL_REVIEWED"] = "label_reviewed";
    AuditEventType["LABEL_APPROVED"] = "label_approved";
    AuditEventType["LABEL_REJECTED"] = "label_rejected";
    AuditEventType["ADJUDICATION_REQUESTED"] = "adjudication_requested";
    AuditEventType["ADJUDICATION_COMPLETED"] = "adjudication_completed";
    AuditEventType["QUEUE_CREATED"] = "queue_created";
    AuditEventType["QUEUE_ASSIGNED"] = "queue_assigned";
    AuditEventType["POLICY_CHECK"] = "policy_check";
})(AuditEventType || (exports.AuditEventType = AuditEventType = {}));
// ============================================================================
// Zod Schemas
// ============================================================================
const anyRecord = () => zod_1.z.record(zod_1.z.string(), zod_1.z.any());
// Label Schemas
exports.CreateLabelSchema = zod_1.z.object({
    entityId: zod_1.z.string(),
    entityType: zod_1.z.enum(['entity', 'relation', 'document', 'image', 'other']),
    labelType: zod_1.z.string(), // e.g., 'sentiment', 'category', 'ner_tag'
    labelValue: zod_1.z.any(), // Can be string, number, array, or object
    confidence: zod_1.z.number().min(0).max(1).optional(),
    metadata: anyRecord().optional(),
    sourceEvidence: zod_1.z.array(zod_1.z.string()).optional(), // Evidence IDs
    reasoning: zod_1.z.string().optional(),
});
exports.LabelSchema = zod_1.z.object({
    id: zod_1.z.string(),
    entityId: zod_1.z.string(),
    entityType: zod_1.z.enum(['entity', 'relation', 'document', 'image', 'other']),
    labelType: zod_1.z.string(),
    labelValue: zod_1.z.any(),
    confidence: zod_1.z.number().optional(),
    status: zod_1.z.nativeEnum(LabelStatus),
    metadata: anyRecord().optional(),
    sourceEvidence: zod_1.z.array(zod_1.z.string()),
    reasoning: zod_1.z.string().optional(),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    reviewedBy: zod_1.z.string().optional(),
    reviewedAt: zod_1.z.string().datetime().optional(),
    queueId: zod_1.z.string().optional(),
});
// Review Schemas
exports.CreateReviewSchema = zod_1.z.object({
    labelId: zod_1.z.string(),
    approved: zod_1.z.boolean(),
    feedback: zod_1.z.string().optional(),
    suggestedValue: zod_1.z.any().optional(),
    reasoning: zod_1.z.string().optional(),
});
exports.ReviewSchema = zod_1.z.object({
    id: zod_1.z.string(),
    labelId: zod_1.z.string(),
    reviewerId: zod_1.z.string(),
    approved: zod_1.z.boolean(),
    feedback: zod_1.z.string().optional(),
    suggestedValue: zod_1.z.any().optional(),
    reasoning: zod_1.z.string().optional(),
    createdAt: zod_1.z.string().datetime(),
    signature: zod_1.z.string().optional(),
});
// Queue Schemas
exports.CreateQueueSchema = zod_1.z.object({
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    entityType: zod_1.z.enum(['entity', 'relation', 'document', 'image', 'other']).optional(),
    labelType: zod_1.z.string().optional(),
    assignedTo: zod_1.z.array(zod_1.z.string()).optional(), // User IDs
    requiredReviews: zod_1.z.number().min(1).default(2),
    metadata: anyRecord().optional(),
});
exports.QueueSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    entityType: zod_1.z.enum(['entity', 'relation', 'document', 'image', 'other']).optional(),
    labelType: zod_1.z.string().optional(),
    assignedTo: zod_1.z.array(zod_1.z.string()),
    requiredReviews: zod_1.z.number(),
    status: zod_1.z.nativeEnum(QueueStatus),
    metadata: anyRecord().optional(),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    completedAt: zod_1.z.string().datetime().optional(),
});
// Adjudication Schemas
exports.CreateAdjudicationSchema = zod_1.z.object({
    labelId: zod_1.z.string(),
    conflictingReviews: zod_1.z.array(zod_1.z.string()), // Review IDs
    reason: zod_1.z.string(),
});
exports.AdjudicationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    labelId: zod_1.z.string(),
    conflictingReviews: zod_1.z.array(zod_1.z.string()),
    reason: zod_1.z.string(),
    assignedTo: zod_1.z.string().optional(),
    resolution: zod_1.z.any().optional(),
    resolutionReasoning: zod_1.z.string().optional(),
    resolvedBy: zod_1.z.string().optional(),
    resolvedAt: zod_1.z.string().datetime().optional(),
    createdAt: zod_1.z.string().datetime(),
    signature: zod_1.z.string().optional(),
});
// Audit Trail Schemas
exports.AuditEventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    eventType: zod_1.z.nativeEnum(AuditEventType),
    userId: zod_1.z.string(),
    entityId: zod_1.z.string().optional(),
    labelId: zod_1.z.string().optional(),
    reviewId: zod_1.z.string().optional(),
    adjudicationId: zod_1.z.string().optional(),
    queueId: zod_1.z.string().optional(),
    beforeState: anyRecord().optional(),
    afterState: anyRecord().optional(),
    reasoning: zod_1.z.string().optional(),
    metadata: anyRecord().optional(),
    timestamp: zod_1.z.string().datetime(),
    signature: zod_1.z.string(), // Cryptographic signature
    signatureAlgorithm: zod_1.z.string().default('ed25519'),
    publicKey: zod_1.z.string().optional(),
});
// Inter-Rater Agreement Schemas
exports.InterRaterAgreementSchema = zod_1.z.object({
    labelType: zod_1.z.string(),
    entityType: zod_1.z.enum(['entity', 'relation', 'document', 'image', 'other']).optional(),
    raters: zod_1.z.array(zod_1.z.string()),
    sampleSize: zod_1.z.number(),
    cohensKappa: zod_1.z.number().optional(),
    fleissKappa: zod_1.z.number().optional(),
    percentAgreement: zod_1.z.number(),
    confusionMatrix: anyRecord().optional(),
    calculatedAt: zod_1.z.string().datetime(),
    metadata: anyRecord().optional(),
});
// Decision Ledger Schemas
exports.DecisionLedgerEntrySchema = zod_1.z.object({
    id: zod_1.z.string(),
    labelId: zod_1.z.string(),
    entityId: zod_1.z.string(),
    entityType: zod_1.z.enum(['entity', 'relation', 'document', 'image', 'other']),
    finalLabel: zod_1.z.any(),
    createdBy: zod_1.z.string(),
    reviewedBy: zod_1.z.array(zod_1.z.string()),
    adjudicatedBy: zod_1.z.string().optional(),
    sourceEvidence: zod_1.z.array(zod_1.z.string()),
    reasoning: zod_1.z.string().optional(),
    auditTrail: zod_1.z.array(zod_1.z.string()), // Audit event IDs
    timestamp: zod_1.z.string().datetime(),
    signature: zod_1.z.string(),
});
exports.DecisionLedgerExportSchema = zod_1.z.object({
    exportId: zod_1.z.string(),
    entries: zod_1.z.array(exports.DecisionLedgerEntrySchema),
    metadata: zod_1.z.object({
        exportedBy: zod_1.z.string(),
        exportedAt: zod_1.z.string().datetime(),
        totalEntries: zod_1.z.number(),
        filters: anyRecord().optional(),
    }),
    signature: zod_1.z.string(),
    merkleRoot: zod_1.z.string(),
});
