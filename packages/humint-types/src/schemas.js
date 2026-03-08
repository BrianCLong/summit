"use strict";
/**
 * HUMINT Zod Validation Schemas
 *
 * Type-safe validation for all HUMINT operations.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UpdateTaskingSchema = exports.CreateTaskingSchema = exports.UpdateHandlerSchema = exports.CreateHandlerSchema = exports.SourceSearchCriteriaSchema = exports.UpdateSourceSchema = exports.CreateSourceSchema = exports.CompensationSchema = exports.AccessCapabilitySchema = exports.CoverIdentitySchema = exports.ContactMethodSchema = exports.PolicyLabelsSchema = exports.DebriefStatusSchema = exports.DebriefTypeSchema = exports.HandlingCaveatSchema = exports.ClassificationLevelSchema = exports.RiskLevelSchema = exports.AccessTypeSchema = exports.InformationRatingSchema = exports.CredibilityRatingSchema = exports.SourceStatusSchema = exports.SourceTypeSchema = void 0;
exports.validateCryptonym = validateCryptonym;
exports.calculateCredibilityScore = calculateCredibilityScore;
exports.isContactOverdue = isContactOverdue;
const zod_1 = require("zod");
const constants_js_1 = require("./constants.js");
// ============================================================================
// Primitive Schemas
// ============================================================================
exports.SourceTypeSchema = zod_1.z.enum(Object.keys(constants_js_1.SOURCE_TYPES));
exports.SourceStatusSchema = zod_1.z.enum(Object.keys(constants_js_1.SOURCE_STATUS));
exports.CredibilityRatingSchema = zod_1.z.enum(Object.keys(constants_js_1.CREDIBILITY_RATINGS));
exports.InformationRatingSchema = zod_1.z.enum(Object.keys(constants_js_1.INFORMATION_RATINGS));
exports.AccessTypeSchema = zod_1.z.enum(Object.keys(constants_js_1.ACCESS_TYPES));
exports.RiskLevelSchema = zod_1.z.enum(Object.keys(constants_js_1.RISK_LEVELS));
exports.ClassificationLevelSchema = zod_1.z.enum(Object.keys(constants_js_1.CLASSIFICATION_LEVELS));
exports.HandlingCaveatSchema = zod_1.z.enum(Object.keys(constants_js_1.HANDLING_CAVEATS));
exports.DebriefTypeSchema = zod_1.z.enum(Object.keys(constants_js_1.DEBRIEF_TYPES));
exports.DebriefStatusSchema = zod_1.z.enum(Object.keys(constants_js_1.DEBRIEF_STATUS));
// ============================================================================
// Composite Schemas
// ============================================================================
exports.PolicyLabelsSchema = zod_1.z.object({
    classification: exports.ClassificationLevelSchema,
    caveats: zod_1.z.array(exports.HandlingCaveatSchema),
    releasableTo: zod_1.z.array(zod_1.z.string().min(1)),
    originatorControl: zod_1.z.boolean(),
    legalBasis: zod_1.z.string().min(1),
    needToKnow: zod_1.z.array(zod_1.z.string().min(1)),
    retentionPeriod: zod_1.z.number().int().positive(),
    expirationDate: zod_1.z.coerce.date().optional(),
});
exports.ContactMethodSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.enum([
        'SECURE_PHONE',
        'DEAD_DROP',
        'BRUSH_PASS',
        'SIGNAL',
        'EMAIL',
        'IN_PERSON',
        'VIRTUAL',
    ]),
    identifier: zod_1.z.string().min(1),
    protocol: zod_1.z.string().min(1),
    scheduleWindow: zod_1.z
        .object({
        timezone: zod_1.z.string(),
        dayOfWeek: zod_1.z.array(zod_1.z.number().int().min(0).max(6)),
        startHour: zod_1.z.number().int().min(0).max(23),
        endHour: zod_1.z.number().int().min(0).max(23),
    })
        .optional(),
    isActive: zod_1.z.boolean(),
    lastUsed: zod_1.z.coerce.date().optional(),
});
exports.CoverIdentitySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    alias: zod_1.z.string().min(1).max(100),
    documentation: zod_1.z.array(zod_1.z.string()),
    backstory: zod_1.z.string().min(1),
    validFrom: zod_1.z.coerce.date(),
    validTo: zod_1.z.coerce.date().optional(),
    isCompromised: zod_1.z.boolean().default(false),
});
exports.AccessCapabilitySchema = zod_1.z.object({
    type: exports.AccessTypeSchema,
    target: zod_1.z.string().min(1),
    targetType: zod_1.z.enum([
        'PERSON',
        'ORGANIZATION',
        'LOCATION',
        'SYSTEM',
        'DOCUMENT',
    ]),
    level: zod_1.z.enum(['FULL', 'PARTIAL', 'LIMITED', 'HISTORICAL']),
    validFrom: zod_1.z.coerce.date(),
    validTo: zod_1.z.coerce.date().optional(),
    reliability: zod_1.z.number().min(0).max(100),
    lastVerified: zod_1.z.coerce.date().optional(),
});
exports.CompensationSchema = zod_1.z.object({
    type: zod_1.z.enum([
        'SALARY',
        'STIPEND',
        'PER_REPORT',
        'EXPENSES_ONLY',
        'NONE',
    ]),
    amount: zod_1.z.number().positive().optional(),
    currency: zod_1.z.string().length(3).optional(),
    frequency: zod_1.z
        .enum(['MONTHLY', 'QUARTERLY', 'PER_MEETING', 'AD_HOC'])
        .optional(),
});
// ============================================================================
// Source CRUD Schemas
// ============================================================================
/**
 * Schema for creating a new HUMINT source
 */
exports.CreateSourceSchema = zod_1.z.object({
    cryptonym: zod_1.z
        .string()
        .min(3)
        .max(50)
        .regex(/^[A-Z][A-Z0-9_-]*$/, 'Cryptonym must start with letter and contain only uppercase letters, numbers, hyphens, and underscores'),
    sourceType: exports.SourceTypeSchema,
    handlerId: zod_1.z.string().uuid(),
    alternateHandlerId: zod_1.z.string().uuid().optional(),
    credibilityRating: exports.CredibilityRatingSchema.default('F'),
    riskLevel: exports.RiskLevelSchema.default('MODERATE'),
    areaOfOperation: zod_1.z.array(zod_1.z.string().min(1)).min(1),
    topicalAccess: zod_1.z.array(zod_1.z.string().min(1)),
    accessCapabilities: zod_1.z.array(exports.AccessCapabilitySchema).optional().default([]),
    contactMethods: zod_1.z.array(exports.ContactMethodSchema).min(1),
    coverIdentities: zod_1.z.array(exports.CoverIdentitySchema).optional().default([]),
    recruitmentDate: zod_1.z.coerce.date(),
    languages: zod_1.z.array(zod_1.z.string().min(2).max(50)),
    specialCapabilities: zod_1.z.array(zod_1.z.string()).optional().default([]),
    compensation: exports.CompensationSchema,
    motivationFactors: zod_1.z.array(zod_1.z.string().min(1)),
    vulnerabilities: zod_1.z.array(zod_1.z.string()).optional().default([]),
    policyLabels: exports.PolicyLabelsSchema,
    notes: zod_1.z.string().optional().default(''),
});
/**
 * Schema for updating an existing source
 */
exports.UpdateSourceSchema = exports.CreateSourceSchema.partial().extend({
    id: zod_1.z.string().uuid(),
    status: exports.SourceStatusSchema.optional(),
    credibilityScore: zod_1.z.number().min(0).max(100).optional(),
    credibilityTrend: zod_1.z
        .enum(['IMPROVING', 'STABLE', 'DECLINING'])
        .optional(),
    nextScheduledContact: zod_1.z.coerce.date().optional(),
    personEntityId: zod_1.z.string().uuid().optional(),
});
/**
 * Schema for source search criteria
 */
exports.SourceSearchCriteriaSchema = zod_1.z.object({
    cryptonym: zod_1.z.string().optional(),
    sourceTypes: zod_1.z.array(exports.SourceTypeSchema).optional(),
    statuses: zod_1.z.array(exports.SourceStatusSchema).optional(),
    handlerId: zod_1.z.string().uuid().optional(),
    minCredibilityScore: zod_1.z.number().min(0).max(100).optional(),
    maxCredibilityScore: zod_1.z.number().min(0).max(100).optional(),
    credibilityRatings: zod_1.z.array(exports.CredibilityRatingSchema).optional(),
    riskLevels: zod_1.z.array(exports.RiskLevelSchema).optional(),
    areasOfOperation: zod_1.z.array(zod_1.z.string()).optional(),
    topicalAccess: zod_1.z.array(zod_1.z.string()).optional(),
    languages: zod_1.z.array(zod_1.z.string()).optional(),
    hasRecentContact: zod_1.z.boolean().optional(),
    recentContactDays: zod_1.z.number().int().positive().optional(),
    classification: exports.ClassificationLevelSchema.optional(),
    limit: zod_1.z.number().int().positive().max(100).default(20),
    offset: zod_1.z.number().int().nonnegative().default(0),
    sortBy: zod_1.z
        .enum(['cryptonym', 'credibilityScore', 'lastContactDate', 'createdAt'])
        .default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// ============================================================================
// Handler Schemas
// ============================================================================
exports.CreateHandlerSchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    employeeId: zod_1.z.string().min(1),
    clearanceLevel: exports.ClassificationLevelSchema,
    maxSourceCapacity: zod_1.z.number().int().positive().default(10),
    specializations: zod_1.z.array(zod_1.z.string()),
    languages: zod_1.z.array(zod_1.z.string()),
    region: zod_1.z.string().min(1),
    supervisorId: zod_1.z.string().uuid(),
});
exports.UpdateHandlerSchema = exports.CreateHandlerSchema.partial().extend({
    id: zod_1.z.string().uuid(),
    isActive: zod_1.z.boolean().optional(),
});
// ============================================================================
// Tasking Schemas
// ============================================================================
exports.CreateTaskingSchema = zod_1.z.object({
    sourceId: zod_1.z.string().uuid(),
    requirementId: zod_1.z.string().uuid(),
    taskDescription: zod_1.z.string().min(10).max(5000),
    priority: zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
    deadline: zod_1.z.coerce.date().optional(),
    policyLabels: exports.PolicyLabelsSchema,
});
exports.UpdateTaskingSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    status: zod_1.z
        .enum([
        'ASSIGNED',
        'ACKNOWLEDGED',
        'IN_PROGRESS',
        'COMPLETED',
        'FAILED',
        'CANCELLED',
    ])
        .optional(),
    result: zod_1.z.string().optional(),
});
// ============================================================================
// Validation Helpers
// ============================================================================
/**
 * Validate a cryptonym format
 */
function validateCryptonym(cryptonym) {
    return /^[A-Z][A-Z0-9_-]{2,49}$/.test(cryptonym);
}
/**
 * Calculate composite credibility score
 */
function calculateCredibilityScore(sourceRating, infoRating, corroborationPercentage) {
    const sourceScore = constants_js_1.CREDIBILITY_RATINGS[sourceRating].score;
    const infoScore = constants_js_1.INFORMATION_RATINGS[infoRating].score;
    // Weighted calculation: 40% source reliability, 40% info reliability, 20% corroboration
    return Math.round(sourceScore * 0.4 + infoScore * 0.4 + corroborationPercentage * 0.2);
}
/**
 * Determine if source needs contact based on last contact date
 */
function isContactOverdue(lastContactDate, thresholdDays = 30) {
    if (!lastContactDate)
        return true;
    const daysSinceContact = Math.floor((Date.now() - lastContactDate.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceContact > thresholdDays;
}
