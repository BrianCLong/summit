"use strict";
// @ts-nocheck
/**
 * Validation Schemas for Canonical Model
 *
 * Provides Zod schemas for validating:
 * - Entity types
 * - Relationship types
 * - Policy labels (with cross-field validation)
 * - Bitemporal fields
 * - Provenance chains
 *
 * @module graph-core/canonical/validation
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueryCostLimits = exports.NeighborhoodQuerySchema = exports.PaginationSchema = exports.TemporalQuerySchema = exports.RelationshipStoredSchema = exports.RelationshipInputSchema = exports.EntityStoredSchema = exports.EntityInputSchema = exports.BitemporalFieldsSchema = exports.ProvenanceChainSchema = exports.ProvenanceAssertionSchema = exports.PolicyLabelsSchema = exports.ProvenanceActionSchema = exports.VerificationStatusSchema = exports.RetentionClassSchema = exports.ClearanceLevelSchema = exports.SensitivityLevelSchema = exports.RelationshipTypeSchema = exports.EntityTypeSchema = void 0;
exports.getDefaultPolicyLabels = getDefaultPolicyLabels;
exports.getDefaultProvenanceChain = getDefaultProvenanceChain;
exports.validateEntityInput = validateEntityInput;
exports.validateRelationshipInput = validateRelationshipInput;
exports.validatePolicyLabels = validatePolicyLabels;
exports.validateNeighborhoodQuery = validateNeighborhoodQuery;
const zod_1 = require("zod");
const types_js_1 = require("./types.js");
// =============================================================================
// ENUM SCHEMAS
// =============================================================================
exports.EntityTypeSchema = zod_1.z.nativeEnum(types_js_1.CanonicalEntityType);
exports.RelationshipTypeSchema = zod_1.z.nativeEnum(types_js_1.CanonicalRelationshipType);
exports.SensitivityLevelSchema = zod_1.z.nativeEnum(types_js_1.SensitivityLevel);
exports.ClearanceLevelSchema = zod_1.z.nativeEnum(types_js_1.ClearanceLevel);
exports.RetentionClassSchema = zod_1.z.nativeEnum(types_js_1.RetentionClass);
exports.VerificationStatusSchema = zod_1.z.nativeEnum(types_js_1.VerificationStatus);
exports.ProvenanceActionSchema = zod_1.z.nativeEnum(types_js_1.ProvenanceAction);
// =============================================================================
// POLICY LABELS SCHEMA (7 Mandatory Fields)
// =============================================================================
/**
 * Policy Labels validation schema
 *
 * Enforces:
 * - All 7 fields are required
 * - Valid enum values
 * - legalBasis required and non-empty when sensitivity > INTERNAL
 */
exports.PolicyLabelsSchema = zod_1.z
    .object({
    origin: zod_1.z
        .string()
        .min(1, 'origin is required and cannot be empty')
        .describe('Source attribution - where this data originated'),
    sensitivity: exports.SensitivityLevelSchema.describe('Data classification level'),
    clearance: exports.ClearanceLevelSchema.describe('Minimum clearance required to access'),
    legalBasis: zod_1.z
        .string()
        .describe('Legal authority for processing'),
    needToKnow: zod_1.z
        .array(zod_1.z.string())
        .default([])
        .describe('Compartmentation tags - additional access restrictions'),
    purposeLimitation: zod_1.z
        .array(zod_1.z.string())
        .default([])
        .describe('Allowable purposes for this data'),
    retentionClass: exports.RetentionClassSchema.describe('Data lifecycle tier'),
})
    .refine((data) => {
    // If sensitivity > INTERNAL, legalBasis must be non-empty
    if ((0, types_js_1.requiresLegalBasis)(data.sensitivity)) {
        return data.legalBasis.trim().length > 0;
    }
    return true;
}, {
    message: 'legalBasis is required and must be non-empty when sensitivity is higher than INTERNAL',
    path: ['legalBasis'],
});
// =============================================================================
// PROVENANCE SCHEMAS
// =============================================================================
exports.ProvenanceAssertionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    timestamp: zod_1.z.coerce.date(),
    actor: zod_1.z.string().min(1, 'actor is required'),
    action: exports.ProvenanceActionSchema,
    input: zod_1.z.array(zod_1.z.string()),
    output: zod_1.z.array(zod_1.z.string()),
    method: zod_1.z.string().min(1, 'method is required'),
    parameters: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    modelVersion: zod_1.z.string().optional(),
    confidence: zod_1.z.number().min(0).max(1),
    evidence: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.ProvenanceChainSchema = zod_1.z.object({
    sourceId: zod_1.z.string().min(1, 'sourceId is required'),
    assertions: zod_1.z.array(exports.ProvenanceAssertionSchema).default([]),
    verificationStatus: exports.VerificationStatusSchema.default(types_js_1.VerificationStatus.UNVERIFIED),
    trustScore: zod_1.z.number().min(0).max(1).default(0.5),
});
// =============================================================================
// BITEMPORAL SCHEMAS
// =============================================================================
/**
 * Bitemporal fields validation
 *
 * Rules:
 * - validTo must be after validFrom (if both specified)
 * - recordedAt is always required
 */
exports.BitemporalFieldsSchema = zod_1.z
    .object({
    validFrom: zod_1.z.coerce.date().nullable().default(null),
    validTo: zod_1.z.coerce.date().nullable().default(null),
    observedAt: zod_1.z.coerce.date().nullable().default(null),
    recordedAt: zod_1.z.coerce.date().default(() => new Date()),
})
    .refine((data) => {
    if (data.validFrom && data.validTo) {
        return data.validTo > data.validFrom;
    }
    return true;
}, {
    message: 'validTo must be after validFrom',
    path: ['validTo'],
});
// =============================================================================
// ENTITY INPUT SCHEMA
// =============================================================================
/**
 * Default policy labels for entities without explicit labels
 */
function getDefaultPolicyLabels() {
    return {
        origin: 'unknown',
        sensitivity: types_js_1.SensitivityLevel.INTERNAL,
        clearance: types_js_1.ClearanceLevel.AUTHORIZED,
        legalBasis: '',
        needToKnow: [],
        purposeLimitation: [],
        retentionClass: types_js_1.RetentionClass.MEDIUM_TERM,
    };
}
/**
 * Default provenance chain for new entities
 */
function getDefaultProvenanceChain(source) {
    return {
        sourceId: source,
        assertions: [],
        verificationStatus: types_js_1.VerificationStatus.UNVERIFIED,
        trustScore: 0.5,
    };
}
/**
 * Entity creation/update input schema
 */
exports.EntityInputSchema = zod_1.z
    .object({
    // Identity
    id: zod_1.z.string().uuid().optional(),
    canonicalId: zod_1.z.string().uuid().nullable().optional(),
    tenantId: zod_1.z.string().min(1).default('default'),
    // Core
    entityType: exports.EntityTypeSchema,
    label: zod_1.z.string().min(1, 'label is required'),
    description: zod_1.z.string().optional(),
    // Properties
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    customMetadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    // Quality
    confidence: zod_1.z.number().min(0).max(1).default(0.5),
    source: zod_1.z.string().min(1).default('api'),
    // Provenance
    provenance: exports.ProvenanceChainSchema.optional(),
    // Policy (required fields enforced by PolicyLabelsSchema)
    policyLabels: exports.PolicyLabelsSchema.optional(),
    // Bitemporal
    validFrom: zod_1.z.coerce.date().nullable().optional(),
    validTo: zod_1.z.coerce.date().nullable().optional(),
    observedAt: zod_1.z.coerce.date().nullable().optional(),
    // Audit
    createdBy: zod_1.z.string().min(1).default('system'),
    // Categorization
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    // Context
    investigationId: zod_1.z.string().optional(),
    caseId: zod_1.z.string().optional(),
})
    .transform((data) => ({
    ...data,
    policyLabels: data.policyLabels ?? getDefaultPolicyLabels(),
    provenance: data.provenance ?? getDefaultProvenanceChain(data.source),
    validFrom: data.validFrom ?? null,
    validTo: data.validTo ?? null,
    observedAt: data.observedAt ?? null,
}));
/**
 * Entity stored format (with system-managed fields)
 */
exports.EntityStoredSchema = exports.EntityInputSchema.extend({
    id: zod_1.z.string().uuid(),
    recordedAt: zod_1.z.coerce.date(),
    createdAt: zod_1.z.coerce.date(),
    updatedAt: zod_1.z.coerce.date(),
    updatedBy: zod_1.z.string().optional(),
    version: zod_1.z.number().int().min(1),
});
// =============================================================================
// RELATIONSHIP INPUT SCHEMA
// =============================================================================
/**
 * Relationship creation/update input schema
 */
exports.RelationshipInputSchema = zod_1.z
    .object({
    // Identity
    id: zod_1.z.string().uuid().optional(),
    tenantId: zod_1.z.string().min(1).default('default'),
    // Structure
    type: exports.RelationshipTypeSchema,
    label: zod_1.z.string().optional(),
    description: zod_1.z.string().optional(),
    fromEntityId: zod_1.z.string().uuid('fromEntityId must be a valid UUID'),
    toEntityId: zod_1.z.string().uuid('toEntityId must be a valid UUID'),
    directed: zod_1.z.boolean().default(true),
    weight: zod_1.z.number().min(0).max(1).optional(),
    // Properties
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).default({}),
    customMetadata: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    // Quality
    confidence: zod_1.z.number().min(0).max(1).default(0.5),
    source: zod_1.z.string().min(1).default('api'),
    // Provenance
    provenance: exports.ProvenanceChainSchema.optional(),
    // Policy (required fields enforced by PolicyLabelsSchema)
    policyLabels: exports.PolicyLabelsSchema.optional(),
    // Bitemporal
    validFrom: zod_1.z.coerce.date().nullable().optional(),
    validTo: zod_1.z.coerce.date().nullable().optional(),
    observedAt: zod_1.z.coerce.date().nullable().optional(),
    since: zod_1.z.coerce.date().optional(),
    until: zod_1.z.coerce.date().optional(),
    // Audit
    createdBy: zod_1.z.string().min(1).default('system'),
    // Context
    investigationId: zod_1.z.string().optional(),
    caseId: zod_1.z.string().optional(),
})
    .refine((data) => data.fromEntityId !== data.toEntityId, {
    message: 'Self-loops not allowed: fromEntityId cannot equal toEntityId',
    path: ['toEntityId'],
})
    .transform((data) => ({
    ...data,
    policyLabels: data.policyLabels ?? getDefaultPolicyLabels(),
    provenance: data.provenance ?? getDefaultProvenanceChain(data.source),
    validFrom: data.validFrom ?? null,
    validTo: data.validTo ?? null,
    observedAt: data.observedAt ?? null,
}));
/**
 * Relationship stored format (with system-managed fields)
 */
exports.RelationshipStoredSchema = exports.RelationshipInputSchema.extend({
    id: zod_1.z.string().uuid(),
    recordedAt: zod_1.z.coerce.date(),
    createdAt: zod_1.z.coerce.date(),
    updatedAt: zod_1.z.coerce.date(),
    updatedBy: zod_1.z.string().optional(),
    version: zod_1.z.number().int().min(1),
});
// =============================================================================
// QUERY SCHEMAS
// =============================================================================
/**
 * Temporal query parameters
 */
exports.TemporalQuerySchema = zod_1.z.object({
    /** Point in time for snapshot query (business time) */
    asOf: zod_1.z.coerce.date().optional(),
    /** Point in time for system time query */
    recordedAsOf: zod_1.z.coerce.date().optional(),
    /** Start of validity window */
    validFrom: zod_1.z.coerce.date().optional(),
    /** End of validity window */
    validTo: zod_1.z.coerce.date().optional(),
});
/**
 * Pagination parameters
 */
exports.PaginationSchema = zod_1.z.object({
    /** Number of items per page (max 100) */
    limit: zod_1.z.number().int().min(1).max(100).default(20),
    /** Offset for pagination */
    offset: zod_1.z.number().int().min(0).default(0),
    /** Cursor for cursor-based pagination */
    cursor: zod_1.z.string().optional(),
});
/**
 * Neighborhood query parameters
 */
exports.NeighborhoodQuerySchema = zod_1.z.object({
    /** Starting entity ID */
    entityId: zod_1.z.string().uuid(),
    /** Maximum depth to traverse */
    depth: zod_1.z.number().int().min(1).max(5).default(2),
    /** Filter by entity types */
    entityTypes: zod_1.z.array(exports.EntityTypeSchema).optional(),
    /** Filter by relationship types */
    relationshipTypes: zod_1.z.array(exports.RelationshipTypeSchema).optional(),
    /** Minimum confidence threshold */
    minConfidence: zod_1.z.number().min(0).max(1).optional(),
    /** Required clearance level */
    clearance: exports.ClearanceLevelSchema.optional(),
    /** Temporal filter */
    temporal: exports.TemporalQuerySchema.optional(),
    /** Pagination */
    pagination: exports.PaginationSchema.optional(),
});
/**
 * Query cost limits
 */
exports.QueryCostLimits = {
    MAX_NODES: 10000,
    MAX_EDGES: 50000,
    MAX_DEPTH: 5,
    MAX_RESULTS: 1000,
    TIMEOUT_MS: 30000,
};
// =============================================================================
// VALIDATION HELPERS
// =============================================================================
/**
 * Validate entity input
 */
function validateEntityInput(input) {
    return exports.EntityInputSchema.safeParse(input);
}
/**
 * Validate relationship input
 */
function validateRelationshipInput(input) {
    return exports.RelationshipInputSchema.safeParse(input);
}
/**
 * Validate policy labels
 */
function validatePolicyLabels(input) {
    return exports.PolicyLabelsSchema.safeParse(input);
}
/**
 * Validate neighborhood query
 */
function validateNeighborhoodQuery(input) {
    return exports.NeighborhoodQuerySchema.safeParse(input);
}
