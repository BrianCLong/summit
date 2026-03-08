"use strict";
/**
 * HUMINT Debrief Workflow Types
 *
 * Types and schemas for managing source debriefing sessions.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEBRIEF_STATE_TRANSITIONS = exports.DebriefSearchCriteriaSchema = exports.ReviewDebriefSchema = exports.CompleteDebriefSchema = exports.UpdateDebriefSchema = exports.StartDebriefSchema = exports.CreateDebriefSchema = exports.AttachmentSchema = exports.PaymentRecordSchema = exports.SecurityAssessmentSchema = exports.DebriefTaskingSchema = exports.IntelligenceItemSchema = exports.DebriefLocationSchema = void 0;
exports.isValidTransition = isValidTransition;
exports.getAllowedTransitions = getAllowedTransitions;
const zod_1 = require("zod");
const schemas_js_1 = require("./schemas.js");
// ============================================================================
// Debrief Workflow Schemas
// ============================================================================
exports.DebriefLocationSchema = zod_1.z.object({
    type: zod_1.z.enum(['SAFE_HOUSE', 'NEUTRAL', 'VEHICLE', 'VIRTUAL', 'OTHER']),
    identifier: zod_1.z.string().min(1),
    coordinates: zod_1.z
        .object({
        latitude: zod_1.z.number().min(-90).max(90),
        longitude: zod_1.z.number().min(-180).max(180),
    })
        .optional(),
    securityVerified: zod_1.z.boolean(),
    notes: zod_1.z.string().optional(),
});
exports.IntelligenceItemSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    topic: zod_1.z.string().min(1).max(200),
    content: zod_1.z.string().min(1).max(10000),
    informationRating: schemas_js_1.InformationRatingSchema,
    classification: zod_1.z.enum([
        'UNCLASSIFIED',
        'CONFIDENTIAL',
        'SECRET',
        'TOP_SECRET',
        'TOP_SECRET_SCI',
    ]),
    requiresCorroboration: zod_1.z.boolean(),
    corroboratedBy: zod_1.z.array(zod_1.z.string().uuid()),
    linkedEntities: zod_1.z.array(zod_1.z.object({
        entityId: zod_1.z.string().uuid(),
        entityType: zod_1.z.string(),
        relationship: zod_1.z.string(),
    })),
    actionability: zod_1.z.enum(['IMMEDIATE', 'SHORT_TERM', 'LONG_TERM', 'BACKGROUND']),
    perishability: zod_1.z.coerce.date().optional(),
    disseminationRestrictions: zod_1.z.array(zod_1.z.string()),
});
exports.DebriefTaskingSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    description: zod_1.z.string().min(1).max(2000),
    priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    deadline: zod_1.z.coerce.date().optional(),
    assignedTo: zod_1.z.string().uuid().optional(),
    status: zod_1.z.enum(['PENDING', 'ASSIGNED', 'COMPLETED', 'CANCELLED']),
});
exports.SecurityAssessmentSchema = zod_1.z.object({
    sourceCompromiseRisk: zod_1.z.enum([
        'NONE',
        'LOW',
        'MODERATE',
        'HIGH',
        'CRITICAL',
    ]),
    operationalSecurityIssues: zod_1.z.array(zod_1.z.string()),
    counterintelligenceIndicators: zod_1.z.array(zod_1.z.string()),
    recommendedMitigations: zod_1.z.array(zod_1.z.string()),
    evaluatorNotes: zod_1.z.string(),
});
exports.PaymentRecordSchema = zod_1.z.object({
    amount: zod_1.z.number().positive(),
    currency: zod_1.z.string().length(3),
    method: zod_1.z.string().min(1),
    receiptId: zod_1.z.string().optional(),
});
exports.AttachmentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['AUDIO', 'VIDEO', 'DOCUMENT', 'IMAGE']),
    encryptedRef: zod_1.z.string().min(1),
    size: zod_1.z.number().int().positive(),
    checksum: zod_1.z.string().min(1),
});
/**
 * Schema for creating a new debrief session
 */
exports.CreateDebriefSchema = zod_1.z.object({
    sourceId: zod_1.z.string().uuid(),
    debriefType: schemas_js_1.DebriefTypeSchema,
    scheduledAt: zod_1.z.coerce.date(),
    location: exports.DebriefLocationSchema,
    objectives: zod_1.z.array(zod_1.z.string().min(1)).min(1),
    policyLabels: schemas_js_1.PolicyLabelsSchema,
    previousDebriefId: zod_1.z.string().uuid().optional(),
});
/**
 * Schema for starting a debrief session
 */
exports.StartDebriefSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    startedAt: zod_1.z.coerce.date().default(() => new Date()),
    actualLocation: exports.DebriefLocationSchema.optional(),
});
/**
 * Schema for updating an in-progress debrief
 */
exports.UpdateDebriefSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    topicsCovered: zod_1.z.array(zod_1.z.string()).optional(),
    rawNotes: zod_1.z.string().optional(),
    sourceDemeanor: zod_1.z.string().optional(),
    credibilityObservations: zod_1.z.string().optional(),
    payments: zod_1.z.array(exports.PaymentRecordSchema).optional(),
    attachments: zod_1.z.array(exports.AttachmentSchema).optional(),
});
/**
 * Schema for completing a debrief session
 */
exports.CompleteDebriefSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    endedAt: zod_1.z.coerce.date(),
    processedNotes: zod_1.z.string().min(1),
    intelligenceItems: zod_1.z.array(exports.IntelligenceItemSchema),
    taskings: zod_1.z.array(exports.DebriefTaskingSchema),
    securityAssessment: exports.SecurityAssessmentSchema,
});
/**
 * Schema for reviewing/approving a debrief
 */
exports.ReviewDebriefSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    approved: zod_1.z.boolean(),
    reviewNotes: zod_1.z.string().min(1),
    modifications: zod_1.z
        .object({
        intelligenceItems: zod_1.z.array(exports.IntelligenceItemSchema).optional(),
        taskings: zod_1.z.array(exports.DebriefTaskingSchema).optional(),
    })
        .optional(),
});
/**
 * Schema for debrief search criteria
 */
exports.DebriefSearchCriteriaSchema = zod_1.z.object({
    sourceId: zod_1.z.string().uuid().optional(),
    handlerId: zod_1.z.string().uuid().optional(),
    debriefTypes: zod_1.z.array(schemas_js_1.DebriefTypeSchema).optional(),
    statuses: zod_1.z.array(schemas_js_1.DebriefStatusSchema).optional(),
    scheduledAfter: zod_1.z.coerce.date().optional(),
    scheduledBefore: zod_1.z.coerce.date().optional(),
    hasIntelligence: zod_1.z.boolean().optional(),
    hasActionableIntel: zod_1.z.boolean().optional(),
    limit: zod_1.z.number().int().positive().max(100).default(20),
    offset: zod_1.z.number().int().nonnegative().default(0),
});
// ============================================================================
// Workflow State Machine
// ============================================================================
/**
 * Valid state transitions for debrief workflow
 */
exports.DEBRIEF_STATE_TRANSITIONS = {
    PLANNED: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['PENDING_REVIEW', 'CANCELLED'],
    PENDING_REVIEW: ['APPROVED', 'IN_PROGRESS', 'ACTION_REQUIRED'],
    APPROVED: ['DISSEMINATED'],
    DISSEMINATED: [],
    CANCELLED: [],
    ACTION_REQUIRED: ['IN_PROGRESS', 'CANCELLED'],
};
/**
 * Check if a state transition is valid
 */
function isValidTransition(from, to) {
    const validTargets = exports.DEBRIEF_STATE_TRANSITIONS[from];
    return validTargets?.includes(to) ?? false;
}
/**
 * Get allowed next states for a given status
 */
function getAllowedTransitions(status) {
    return exports.DEBRIEF_STATE_TRANSITIONS[status] ?? [];
}
