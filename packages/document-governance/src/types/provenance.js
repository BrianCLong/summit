"use strict";
/**
 * AI Provenance and Metadata Type Definitions
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceReportSchema = exports.ProvenanceQuerySchema = exports.DataLineageEntrySchema = exports.DocumentTransformationSchema = exports.ContentExtractionMetadataSchema = exports.AIProvenanceMetadataSchema = exports.AIAssistSessionSchema = exports.AIModelSchema = exports.CreationSourceSchema = void 0;
const zod_1 = require("zod");
// Creation Source Schema
exports.CreationSourceSchema = zod_1.z.enum(['human', 'ai', 'hybrid', 'automated', 'imported']);
// AI Model Schema
exports.AIModelSchema = zod_1.z.enum([
    'gpt-4',
    'gpt-4-turbo',
    'gpt-4o',
    'gpt-3.5-turbo',
    'claude-3-opus',
    'claude-3-sonnet',
    'claude-3-haiku',
    'claude-3.5-sonnet',
    'claude-code',
    'gemini-pro',
    'gemini-ultra',
    'llama-3',
    'mistral-large',
    'other',
]);
// AI Assist Session Schema
exports.AIAssistSessionSchema = zod_1.z.object({
    tool: zod_1.z.string(),
    model: exports.AIModelSchema.optional(),
    session_id: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    prompt_summary: zod_1.z.string().optional(),
    output_summary: zod_1.z.string().optional(),
    tokens_used: zod_1.z.number().optional(),
    duration_ms: zod_1.z.number().optional(),
});
// AI Provenance Metadata Schema
exports.AIProvenanceMetadataSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    document_id: zod_1.z.string().uuid(),
    created_by: exports.CreationSourceSchema,
    ai_model: exports.AIModelSchema.optional(),
    ai_model_version: zod_1.z.string().optional(),
    ai_assist_sessions: zod_1.z.array(exports.AIAssistSessionSchema).default([]),
    source_documents: zod_1.z.array(zod_1.z.string()).default([]),
    source_urls: zod_1.z.array(zod_1.z.string().url()).default([]),
    retrieval_augmented: zod_1.z.boolean().default(false),
    rag_sources: zod_1.z.array(zod_1.z.object({
        source_type: zod_1.z.enum(['document', 'database', 'api', 'web', 'knowledge_base']),
        source_id: zod_1.z.string(),
        source_name: zod_1.z.string(),
        relevance_score: zod_1.z.number().optional(),
    })).default([]),
    reviewed_by_human: zod_1.z.boolean().default(false),
    human_reviewer_id: zod_1.z.string().optional(),
    human_reviewer_role: zod_1.z.string().optional(),
    review_timestamp: zod_1.z.string().datetime().optional(),
    review_notes: zod_1.z.string().optional(),
    sign_off_required: zod_1.z.boolean().default(false),
    sign_off_obtained: zod_1.z.boolean().default(false),
    sign_off_by: zod_1.z.string().optional(),
    sign_off_role: zod_1.z.string().optional(),
    sign_off_timestamp: zod_1.z.string().datetime().optional(),
    confidence_score: zod_1.z.number().min(0).max(1).optional(),
    accuracy_verified: zod_1.z.boolean().default(false),
    verification_method: zod_1.z.string().optional(),
    created_at: zod_1.z.string().datetime(),
    updated_at: zod_1.z.string().datetime(),
});
// Content Extraction Metadata Schema
exports.ContentExtractionMetadataSchema = zod_1.z.object({
    extraction_method: zod_1.z.enum(['manual', 'ocr', 'nlp', 'structured_extraction', 'api']),
    source_format: zod_1.z.string(),
    extraction_timestamp: zod_1.z.string().datetime(),
    extraction_confidence: zod_1.z.number().min(0).max(1).optional(),
    extracted_fields: zod_1.z.array(zod_1.z.object({
        field_name: zod_1.z.string(),
        field_value: zod_1.z.any(),
        confidence: zod_1.z.number().min(0).max(1).optional(),
        source_location: zod_1.z.string().optional(),
    })),
    extraction_errors: zod_1.z.array(zod_1.z.object({
        field_name: zod_1.z.string().optional(),
        error_type: zod_1.z.string(),
        error_message: zod_1.z.string(),
    })).default([]),
});
// Document Transformation Schema
exports.DocumentTransformationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    document_id: zod_1.z.string().uuid(),
    transformation_type: zod_1.z.enum([
        'format_conversion',
        'content_extraction',
        'summarization',
        'translation',
        'anonymization',
        'redaction',
        'enrichment',
        'classification',
    ]),
    input_format: zod_1.z.string().optional(),
    output_format: zod_1.z.string().optional(),
    transformation_tool: zod_1.z.string(),
    transformation_config: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    performed_by: zod_1.z.string(),
    performed_at: zod_1.z.string().datetime(),
    ai_assisted: zod_1.z.boolean().default(false),
    ai_model: exports.AIModelSchema.optional(),
    quality_score: zod_1.z.number().min(0).max(1).optional(),
    notes: zod_1.z.string().optional(),
});
// Data Lineage Entry Schema
exports.DataLineageEntrySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    document_id: zod_1.z.string().uuid(),
    lineage_type: zod_1.z.enum(['source', 'derived', 'merged', 'split', 'transformed', 'imported', 'exported']),
    related_document_id: zod_1.z.string().uuid().optional(),
    external_source: zod_1.z.string().optional(),
    external_destination: zod_1.z.string().optional(),
    operation: zod_1.z.string(),
    performed_by: zod_1.z.string(),
    performed_at: zod_1.z.string().datetime(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
// Provenance Query Schema
exports.ProvenanceQuerySchema = zod_1.z.object({
    document_id: zod_1.z.string().uuid().optional(),
    created_by: exports.CreationSourceSchema.optional(),
    ai_model: exports.AIModelSchema.optional(),
    reviewed_by_human: zod_1.z.boolean().optional(),
    sign_off_obtained: zod_1.z.boolean().optional(),
    created_after: zod_1.z.string().datetime().optional(),
    created_before: zod_1.z.string().datetime().optional(),
    include_lineage: zod_1.z.boolean().default(false),
    include_transformations: zod_1.z.boolean().default(false),
    limit: zod_1.z.number().min(1).max(100).default(20),
    offset: zod_1.z.number().min(0).default(0),
});
// Provenance Report Schema
exports.ProvenanceReportSchema = zod_1.z.object({
    document_id: zod_1.z.string().uuid(),
    document_title: zod_1.z.string(),
    provenance: exports.AIProvenanceMetadataSchema,
    lineage: zod_1.z.array(exports.DataLineageEntrySchema),
    transformations: zod_1.z.array(exports.DocumentTransformationSchema),
    chain_of_custody: zod_1.z.array(zod_1.z.object({
        action: zod_1.z.string(),
        actor: zod_1.z.string(),
        timestamp: zod_1.z.string().datetime(),
        details: zod_1.z.string().optional(),
    })),
});
