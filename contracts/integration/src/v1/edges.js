"use strict";
/**
 * Edge Schemas v1
 * Defines canonical relationship types for the IntelGraph model
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EdgeV1 = exports.OwnsEdgeV1 = exports.WorksForEdgeV1 = exports.AssociatedWithEdgeV1 = exports.RelationshipTypeV1 = void 0;
exports.isAssociatedWith = isAssociatedWith;
exports.isWorksFor = isWorksFor;
exports.isOwns = isOwns;
const zod_1 = require("zod");
const provenance_js_1 = require("./provenance.js");
/**
 * Relationship types for ASSOCIATED_WITH edge
 */
exports.RelationshipTypeV1 = zod_1.z.enum([
    'colleague',
    'family',
    'business',
    'friend',
    'mentor',
    'advisor',
    'partner',
    'unknown',
]);
/**
 * ASSOCIATED_WITH Edge - Generic association between persons
 */
exports.AssociatedWithEdgeV1 = zod_1.z.object({
    id: zod_1.z.string().uuid().describe('Unique identifier (UUID v4)'),
    type: zod_1.z.literal('ASSOCIATED_WITH').describe('Edge type discriminator'),
    version: zod_1.z.literal('v1').describe('Schema version'),
    from: zod_1.z.string().uuid().describe('Source entity ID (Person)'),
    to: zod_1.z.string().uuid().describe('Target entity ID (Person)'),
    attributes: zod_1.z.object({
        relationshipType: exports.RelationshipTypeV1.default('unknown').describe('Nature of the relationship'),
        strength: zod_1.z
            .number()
            .min(0)
            .max(1)
            .default(0.5)
            .describe('Relationship strength (0.0 = weak, 1.0 = strong)'),
        description: zod_1.z.string().max(1000).optional().describe('Description of the relationship'),
        startDate: zod_1.z.string().date().optional().describe('When the relationship started (YYYY-MM-DD)'),
        endDate: zod_1.z.string().date().optional().describe('When the relationship ended (YYYY-MM-DD)'),
    }),
    metadata: provenance_js_1.EdgeMetadataV1.describe('Provenance and confidence metadata'),
});
/**
 * WORKS_FOR Edge - Person to Organization employment relationship
 */
exports.WorksForEdgeV1 = zod_1.z.object({
    id: zod_1.z.string().uuid().describe('Unique identifier (UUID v4)'),
    type: zod_1.z.literal('WORKS_FOR').describe('Edge type discriminator'),
    version: zod_1.z.literal('v1').describe('Schema version'),
    from: zod_1.z.string().uuid().describe('Person entity ID'),
    to: zod_1.z.string().uuid().describe('Organization entity ID'),
    attributes: zod_1.z.object({
        title: zod_1.z.string().max(200).optional().describe('Job title'),
        department: zod_1.z.string().max(200).optional().describe('Department or team'),
        startDate: zod_1.z.string().date().optional().describe('Employment start date (YYYY-MM-DD)'),
        endDate: zod_1.z.string().date().optional().describe('Employment end date (YYYY-MM-DD)'),
        isCurrent: zod_1.z.boolean().default(true).describe('Whether this is current employment'),
    }),
    metadata: provenance_js_1.EdgeMetadataV1.describe('Provenance and confidence metadata'),
});
/**
 * OWNS Edge - Ownership relationship (Person/Organization to Organization)
 */
exports.OwnsEdgeV1 = zod_1.z.object({
    id: zod_1.z.string().uuid().describe('Unique identifier (UUID v4)'),
    type: zod_1.z.literal('OWNS').describe('Edge type discriminator'),
    version: zod_1.z.literal('v1').describe('Schema version'),
    from: zod_1.z.string().uuid().describe('Owner entity ID (Person or Organization)'),
    to: zod_1.z.string().uuid().describe('Owned entity ID (Organization)'),
    attributes: zod_1.z.object({
        ownershipPercentage: zod_1.z.number().min(0).max(100).optional().describe('Percentage owned'),
        ownershipType: zod_1.z.enum(['full', 'partial', 'majority', 'minority', 'unknown']).default('unknown'),
        startDate: zod_1.z.string().date().optional().describe('Ownership start date (YYYY-MM-DD)'),
    }),
    metadata: provenance_js_1.EdgeMetadataV1.describe('Provenance and confidence metadata'),
});
/**
 * Generic Edge - Union type for all edge types
 */
exports.EdgeV1 = zod_1.z.discriminatedUnion('type', [
    exports.AssociatedWithEdgeV1,
    exports.WorksForEdgeV1,
    exports.OwnsEdgeV1,
]);
/**
 * Edge type helpers for narrowing
 */
function isAssociatedWith(edge) {
    return edge.type === 'ASSOCIATED_WITH';
}
function isWorksFor(edge) {
    return edge.type === 'WORKS_FOR';
}
function isOwns(edge) {
    return edge.type === 'OWNS';
}
