"use strict";
/**
 * Validation utilities for canonical entities
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrganizationPropsSchema = exports.PersonPropsSchema = exports.BaseEntitySchema = exports.BitemporalFieldsSchema = exports.SourceReferenceSchema = exports.EntityTypeSchema = exports.ClassificationLevelSchema = void 0;
exports.validateEntity = validateEntity;
exports.validateBitemporalConsistency = validateBitemporalConsistency;
exports.createEntity = createEntity;
const zod_1 = require("zod");
// -----------------------------------------------------------------------------
// Base Schemas
// -----------------------------------------------------------------------------
exports.ClassificationLevelSchema = zod_1.z.enum([
    'UNCLASSIFIED',
    'CUI',
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
]);
exports.EntityTypeSchema = zod_1.z.enum([
    'Person',
    'Organization',
    'Asset',
    'Location',
    'Event',
    'Document',
    'Claim',
    'Case',
]);
exports.SourceReferenceSchema = zod_1.z.object({
    sourceId: zod_1.z.string().min(1),
    sourceRecordId: zod_1.z.string().min(1),
    sourceType: zod_1.z.string().min(1),
    ingestedAt: zod_1.z.date(),
    sourceHash: zod_1.z.string().optional(),
});
exports.BitemporalFieldsSchema = zod_1.z.object({
    validFrom: zod_1.z.date().nullable(),
    validTo: zod_1.z.date().nullable(),
    observedAt: zod_1.z.date().nullable(),
    recordedAt: zod_1.z.date(),
});
exports.BaseEntitySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    canonicalId: zod_1.z.string().uuid().nullable(),
    entityType: exports.EntityTypeSchema,
    confidence: zod_1.z.number().min(0).max(1),
    source: zod_1.z.string().min(1),
    sources: zod_1.z.array(exports.SourceReferenceSchema),
    classification: exports.ClassificationLevelSchema,
    compartments: zod_1.z.array(zod_1.z.string()),
    investigationIds: zod_1.z.array(zod_1.z.string().uuid()),
    tenantId: zod_1.z.string().min(1),
    createdBy: zod_1.z.string().min(1),
    updatedBy: zod_1.z.string().nullable(),
    updatedAt: zod_1.z.date().nullable(),
    props: zod_1.z.record(zod_1.z.unknown()),
    tags: zod_1.z.array(zod_1.z.string()),
    validFrom: zod_1.z.date().nullable(),
    validTo: zod_1.z.date().nullable(),
    observedAt: zod_1.z.date().nullable(),
    recordedAt: zod_1.z.date(),
});
// -----------------------------------------------------------------------------
// Entity-Specific Schemas
// -----------------------------------------------------------------------------
exports.PersonPropsSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    firstName: zod_1.z.string().optional(),
    lastName: zod_1.z.string().optional(),
    middleName: zod_1.z.string().optional(),
    aliases: zod_1.z.array(zod_1.z.string()).optional(),
    dateOfBirth: zod_1.z.date().optional(),
    dateOfDeath: zod_1.z.date().optional(),
    nationalities: zod_1.z.array(zod_1.z.string()).optional(),
    gender: zod_1.z.enum(['male', 'female', 'other', 'unknown']).optional(),
    identifications: zod_1.z
        .array(zod_1.z.object({
        type: zod_1.z.string(),
        value: zod_1.z.string(),
        issuingCountry: zod_1.z.string().optional(),
        expiryDate: zod_1.z.date().optional(),
    }))
        .optional(),
    contacts: zod_1.z
        .array(zod_1.z.object({
        type: zod_1.z.enum(['email', 'phone', 'address', 'social']),
        value: zod_1.z.string(),
        isPrimary: zod_1.z.boolean().optional(),
    }))
        .optional(),
    occupation: zod_1.z.string().optional(),
    employer: zod_1.z.string().optional(),
    riskIndicators: zod_1.z.array(zod_1.z.string()).optional(),
    isPEP: zod_1.z.boolean().optional(),
    sanctionsMatches: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.OrganizationPropsSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    tradingNames: zod_1.z.array(zod_1.z.string()).optional(),
    orgType: zod_1.z
        .enum(['corporation', 'llc', 'partnership', 'nonprofit', 'government', 'other'])
        .optional(),
    industry: zod_1.z.string().optional(),
    registrationNumber: zod_1.z.string().optional(),
    taxId: zod_1.z.string().optional(),
    incorporationDate: zod_1.z.date().optional(),
    dissolutionDate: zod_1.z.date().optional(),
    incorporationCountry: zod_1.z.string().optional(),
    headquarters: zod_1.z.string().optional(),
    website: zod_1.z.string().url().optional(),
    employeeCount: zod_1.z.number().positive().optional(),
    revenue: zod_1.z
        .object({
        amount: zod_1.z.number(),
        currency: zod_1.z.string(),
        year: zod_1.z.number(),
    })
        .optional(),
    ticker: zod_1.z.string().optional(),
    lei: zod_1.z.string().optional(),
    riskIndicators: zod_1.z.array(zod_1.z.string()).optional(),
    sanctionsMatches: zod_1.z.array(zod_1.z.string()).optional(),
});
// Add other entity schemas as needed...
// -----------------------------------------------------------------------------
// Validation Functions
// -----------------------------------------------------------------------------
/**
 * Validate an entity against its schema
 */
function validateEntity(entity) {
    const result = exports.BaseEntitySchema.safeParse(entity);
    if (!result.success) {
        return {
            valid: false,
            errors: result.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        };
    }
    return {
        valid: true,
        errors: [],
        entity: result.data,
    };
}
/**
 * Validate bitemporal consistency
 */
function validateBitemporalConsistency(fields) {
    const errors = [];
    // validTo must be after validFrom
    if (fields.validFrom && fields.validTo && fields.validTo < fields.validFrom) {
        errors.push('validTo must be after validFrom');
    }
    // observedAt should be before or equal to recordedAt
    if (fields.observedAt && fields.observedAt > fields.recordedAt) {
        errors.push('observedAt should not be after recordedAt');
    }
    return {
        valid: errors.length === 0,
        errors,
    };
}
/**
 * Create a new entity with proper defaults
 */
function createEntity(entityType, props, options) {
    const now = new Date();
    return {
        entityType,
        props,
        confidence: 1.0,
        source: options.source,
        sources: [
            {
                sourceId: options.source,
                sourceRecordId: 'manual',
                sourceType: 'manual',
                ingestedAt: now,
            },
        ],
        classification: options.classification || 'UNCLASSIFIED',
        compartments: [],
        investigationIds: options.investigationIds || [],
        tenantId: options.tenantId,
        createdBy: options.createdBy,
        updatedBy: null,
        updatedAt: null,
        tags: [],
        validFrom: null,
        validTo: null,
        observedAt: null,
        recordedAt: now,
        canonicalId: null,
    };
}
