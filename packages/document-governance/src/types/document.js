"use strict";
/**
 * Document Type Definitions for Business Document Governance
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DocumentSearchResultSchema = exports.DocumentSearchQuerySchema = exports.DocumentAccessLogSchema = exports.DocumentAttachmentSchema = exports.SignatureSchema = exports.DocumentVersionSchema = exports.DocumentInstanceSchema = exports.DocumentTypeDefinitionSchema = exports.DocumentCategorySchema = exports.LifecycleTypeSchema = exports.RiskLevelSchema = exports.ClassificationLevelSchema = void 0;
const zod_1 = require("zod");
// Classification levels
exports.ClassificationLevelSchema = zod_1.z.enum([
    'Public',
    'Internal',
    'Confidential',
    'Restricted',
    'HighlyRestricted',
    'Classified_Internal',
    'Classified_Regulated',
]);
// Risk levels
exports.RiskLevelSchema = zod_1.z.enum(['Low', 'Medium', 'High', 'Critical']);
// Lifecycle types
exports.LifecycleTypeSchema = zod_1.z.enum([
    'Contract',
    'Policy',
    'Record',
    'Versioned',
    'GovernanceCore',
    'GovernanceRecord',
    'GovernanceVersioned',
    'ExternalPolicy',
    'GeneratedArtifact',
]);
// Document categories
exports.DocumentCategorySchema = zod_1.z.enum([
    'Corporate Governance',
    'Finance',
    'HR',
    'Legal',
    'Product',
    'Engineering',
    'Operations',
    'Security',
    'AI_ML',
    'Compliance',
]);
// Document Type Definition Schema
exports.DocumentTypeDefinitionSchema = zod_1.z.object({
    id: zod_1.z.string().regex(/^doc\.[a-z_]+$/),
    name: zod_1.z.string().min(1).max(200),
    category: exports.DocumentCategorySchema,
    subcategory: zod_1.z.string().optional(),
    description: zod_1.z.string().max(1000),
    confidentiality: exports.ClassificationLevelSchema,
    lifecycle: exports.LifecycleTypeSchema,
    retention_period: zod_1.z.string(),
    owner_department: zod_1.z.string(),
    requires_signatures: zod_1.z.array(zod_1.z.string()).default([]),
    legal_basis: zod_1.z.array(zod_1.z.string()).default([]),
    risk_level: exports.RiskLevelSchema,
});
// Document Instance Schema
exports.DocumentInstanceSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    document_type_id: zod_1.z.string().regex(/^doc\.[a-z_]+$/),
    title: zod_1.z.string().min(1).max(500),
    description: zod_1.z.string().optional(),
    version: zod_1.z.string().default('1.0.0'),
    status: zod_1.z.string(),
    classification: exports.ClassificationLevelSchema,
    owner_id: zod_1.z.string(),
    owner_department: zod_1.z.string(),
    created_by: zod_1.z.string(),
    created_at: zod_1.z.string().datetime(),
    updated_by: zod_1.z.string(),
    updated_at: zod_1.z.string().datetime(),
    effective_date: zod_1.z.string().datetime().optional(),
    expiration_date: zod_1.z.string().datetime().optional(),
    review_date: zod_1.z.string().datetime().optional(),
    file_path: zod_1.z.string().optional(),
    file_hash: zod_1.z.string().optional(),
    file_size: zod_1.z.number().optional(),
    mime_type: zod_1.z.string().optional(),
    tags: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).default({}),
});
// Document Version Schema
exports.DocumentVersionSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    document_id: zod_1.z.string().uuid(),
    version: zod_1.z.string(),
    status: zod_1.z.string(),
    changes_summary: zod_1.z.string().optional(),
    created_by: zod_1.z.string(),
    created_at: zod_1.z.string().datetime(),
    file_path: zod_1.z.string().optional(),
    file_hash: zod_1.z.string().optional(),
    previous_version_id: zod_1.z.string().uuid().optional(),
});
// Signature Schema
exports.SignatureSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    document_id: zod_1.z.string().uuid(),
    signer_id: zod_1.z.string(),
    signer_name: zod_1.z.string(),
    signer_role: zod_1.z.string(),
    signature_type: zod_1.z.enum(['digital', 'electronic', 'wet_ink', 'docusign', 'adobe_sign']),
    signed_at: zod_1.z.string().datetime(),
    ip_address: zod_1.z.string().optional(),
    certificate_id: zod_1.z.string().optional(),
    signature_data: zod_1.z.string().optional(),
    is_valid: zod_1.z.boolean().default(true),
});
// Document Attachment Schema
exports.DocumentAttachmentSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    document_id: zod_1.z.string().uuid(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    file_path: zod_1.z.string(),
    file_hash: zod_1.z.string(),
    file_size: zod_1.z.number(),
    mime_type: zod_1.z.string(),
    uploaded_by: zod_1.z.string(),
    uploaded_at: zod_1.z.string().datetime(),
});
// Document Access Log Schema
exports.DocumentAccessLogSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    document_id: zod_1.z.string().uuid(),
    user_id: zod_1.z.string(),
    action: zod_1.z.enum(['view', 'download', 'edit', 'delete', 'share', 'print', 'export']),
    timestamp: zod_1.z.string().datetime(),
    ip_address: zod_1.z.string().optional(),
    user_agent: zod_1.z.string().optional(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
// Document Search Query Schema
exports.DocumentSearchQuerySchema = zod_1.z.object({
    query: zod_1.z.string().optional(),
    document_type_ids: zod_1.z.array(zod_1.z.string()).optional(),
    categories: zod_1.z.array(exports.DocumentCategorySchema).optional(),
    classifications: zod_1.z.array(exports.ClassificationLevelSchema).optional(),
    statuses: zod_1.z.array(zod_1.z.string()).optional(),
    owner_departments: zod_1.z.array(zod_1.z.string()).optional(),
    owner_ids: zod_1.z.array(zod_1.z.string()).optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    created_after: zod_1.z.string().datetime().optional(),
    created_before: zod_1.z.string().datetime().optional(),
    updated_after: zod_1.z.string().datetime().optional(),
    updated_before: zod_1.z.string().datetime().optional(),
    effective_after: zod_1.z.string().datetime().optional(),
    effective_before: zod_1.z.string().datetime().optional(),
    expiring_within_days: zod_1.z.number().optional(),
    risk_levels: zod_1.z.array(exports.RiskLevelSchema).optional(),
    compliance_standards: zod_1.z.array(zod_1.z.string()).optional(),
    limit: zod_1.z.number().min(1).max(100).default(20),
    offset: zod_1.z.number().min(0).default(0),
    sort_by: zod_1.z.string().default('updated_at'),
    sort_order: zod_1.z.enum(['asc', 'desc']).default('desc'),
});
// Document Search Result Schema
exports.DocumentSearchResultSchema = zod_1.z.object({
    documents: zod_1.z.array(exports.DocumentInstanceSchema),
    total: zod_1.z.number(),
    limit: zod_1.z.number(),
    offset: zod_1.z.number(),
    has_more: zod_1.z.boolean(),
});
