"use strict";
/**
 * Document Relationship Type Definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.RelationshipValidationResultSchema = exports.DocumentGraphSchema = exports.DocumentGraphEdgeSchema = exports.DocumentGraphNodeSchema = exports.RelationshipQuerySchema = exports.DocumentRelationshipSchema = exports.RelationshipTypeDefinitionSchema = exports.RelationshipTypeIdSchema = void 0;
const zod_1 = require("zod");
// Relationship types
exports.RelationshipTypeIdSchema = zod_1.z.enum([
    'rel.GOVERNS',
    'rel.GOVERNED_BY',
    'rel.DERIVES_FROM',
    'rel.DERIVED_INTO',
    'rel.REQUIRES',
    'rel.REQUIRED_BY',
    'rel.SUPERSEDES',
    'rel.SUPERSEDED_BY',
    'rel.INFORMS',
    'rel.INFORMED_BY',
    'rel.EVIDENCES',
    'rel.EVIDENCED_BY',
    'rel.OWNED_BY',
    'rel.OWNS',
    'rel.AMENDS',
    'rel.AMENDED_BY',
    'rel.REFERENCES',
    'rel.REFERENCED_BY',
    'rel.CONFLICTS_WITH',
    'rel.ATTACHES_TO',
    'rel.HAS_ATTACHMENT',
    'rel.IMPLEMENTS',
    'rel.IMPLEMENTED_BY',
]);
// Relationship Type Definition Schema
exports.RelationshipTypeDefinitionSchema = zod_1.z.object({
    id: exports.RelationshipTypeIdSchema,
    name: zod_1.z.string(),
    description: zod_1.z.string(),
    symmetric: zod_1.z.boolean().default(false),
    transitive: zod_1.z.boolean().default(false),
    inverse: exports.RelationshipTypeIdSchema.optional(),
    valid_pairs: zod_1.z.array(zod_1.z.object({
        from: zod_1.z.string(),
        to: zod_1.z.string(),
        description: zod_1.z.string().optional(),
    })).optional(),
    notes: zod_1.z.string().optional(),
});
// Document Relationship Instance Schema
exports.DocumentRelationshipSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    relationship_type: exports.RelationshipTypeIdSchema,
    source_document_id: zod_1.z.string().uuid(),
    target_document_id: zod_1.z.string().uuid(),
    description: zod_1.z.string().optional(),
    created_by: zod_1.z.string(),
    created_at: zod_1.z.string().datetime(),
    updated_by: zod_1.z.string().optional(),
    updated_at: zod_1.z.string().datetime().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
    is_active: zod_1.z.boolean().default(true),
});
// Relationship Query Schema
exports.RelationshipQuerySchema = zod_1.z.object({
    document_id: zod_1.z.string().uuid().optional(),
    relationship_types: zod_1.z.array(exports.RelationshipTypeIdSchema).optional(),
    direction: zod_1.z.enum(['outgoing', 'incoming', 'both']).default('both'),
    depth: zod_1.z.number().min(1).max(10).default(1),
    include_inactive: zod_1.z.boolean().default(false),
    limit: zod_1.z.number().min(1).max(100).default(50),
    offset: zod_1.z.number().min(0).default(0),
});
// Document Graph Node Schema
exports.DocumentGraphNodeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    document_type_id: zod_1.z.string(),
    title: zod_1.z.string(),
    status: zod_1.z.string(),
    classification: zod_1.z.string(),
    risk_level: zod_1.z.string().optional(),
});
// Document Graph Edge Schema
exports.DocumentGraphEdgeSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    relationship_type: exports.RelationshipTypeIdSchema,
    source_id: zod_1.z.string().uuid(),
    target_id: zod_1.z.string().uuid(),
    description: zod_1.z.string().optional(),
});
// Document Graph Schema
exports.DocumentGraphSchema = zod_1.z.object({
    nodes: zod_1.z.array(exports.DocumentGraphNodeSchema),
    edges: zod_1.z.array(exports.DocumentGraphEdgeSchema),
    center_document_id: zod_1.z.string().uuid().optional(),
});
// Relationship Validation Result
exports.RelationshipValidationResultSchema = zod_1.z.object({
    valid: zod_1.z.boolean(),
    errors: zod_1.z.array(zod_1.z.string()),
    warnings: zod_1.z.array(zod_1.z.string()),
});
