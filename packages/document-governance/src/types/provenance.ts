/**
 * AI Provenance and Metadata Type Definitions
 */

import { z } from 'zod';

// Creation Source Schema
export const CreationSourceSchema = z.enum(['human', 'ai', 'hybrid', 'automated', 'imported']);

export type CreationSource = z.infer<typeof CreationSourceSchema>;

// AI Model Schema
export const AIModelSchema = z.enum([
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

export type AIModel = z.infer<typeof AIModelSchema>;

// AI Assist Session Schema
export const AIAssistSessionSchema = z.object({
  tool: z.string(),
  model: AIModelSchema.optional(),
  session_id: z.string(),
  timestamp: z.string().datetime(),
  prompt_summary: z.string().optional(),
  output_summary: z.string().optional(),
  tokens_used: z.number().optional(),
  duration_ms: z.number().optional(),
});

export type AIAssistSession = z.infer<typeof AIAssistSessionSchema>;

// AI Provenance Metadata Schema
export const AIProvenanceMetadataSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  created_by: CreationSourceSchema,
  ai_model: AIModelSchema.optional(),
  ai_model_version: z.string().optional(),
  ai_assist_sessions: z.array(AIAssistSessionSchema).default([]),
  source_documents: z.array(z.string()).default([]),
  source_urls: z.array(z.string().url()).default([]),
  retrieval_augmented: z.boolean().default(false),
  rag_sources: z.array(z.object({
    source_type: z.enum(['document', 'database', 'api', 'web', 'knowledge_base']),
    source_id: z.string(),
    source_name: z.string(),
    relevance_score: z.number().optional(),
  })).default([]),
  reviewed_by_human: z.boolean().default(false),
  human_reviewer_id: z.string().optional(),
  human_reviewer_role: z.string().optional(),
  review_timestamp: z.string().datetime().optional(),
  review_notes: z.string().optional(),
  sign_off_required: z.boolean().default(false),
  sign_off_obtained: z.boolean().default(false),
  sign_off_by: z.string().optional(),
  sign_off_role: z.string().optional(),
  sign_off_timestamp: z.string().datetime().optional(),
  confidence_score: z.number().min(0).max(1).optional(),
  accuracy_verified: z.boolean().default(false),
  verification_method: z.string().optional(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
});

export type AIProvenanceMetadata = z.infer<typeof AIProvenanceMetadataSchema>;

// Content Extraction Metadata Schema
export const ContentExtractionMetadataSchema = z.object({
  extraction_method: z.enum(['manual', 'ocr', 'nlp', 'structured_extraction', 'api']),
  source_format: z.string(),
  extraction_timestamp: z.string().datetime(),
  extraction_confidence: z.number().min(0).max(1).optional(),
  extracted_fields: z.array(z.object({
    field_name: z.string(),
    field_value: z.any(),
    confidence: z.number().min(0).max(1).optional(),
    source_location: z.string().optional(),
  })),
  extraction_errors: z.array(z.object({
    field_name: z.string().optional(),
    error_type: z.string(),
    error_message: z.string(),
  })).default([]),
});

export type ContentExtractionMetadata = z.infer<typeof ContentExtractionMetadataSchema>;

// Document Transformation Schema
export const DocumentTransformationSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  transformation_type: z.enum([
    'format_conversion',
    'content_extraction',
    'summarization',
    'translation',
    'anonymization',
    'redaction',
    'enrichment',
    'classification',
  ]),
  input_format: z.string().optional(),
  output_format: z.string().optional(),
  transformation_tool: z.string(),
  transformation_config: z.record(z.string(), z.any()).optional(),
  performed_by: z.string(),
  performed_at: z.string().datetime(),
  ai_assisted: z.boolean().default(false),
  ai_model: AIModelSchema.optional(),
  quality_score: z.number().min(0).max(1).optional(),
  notes: z.string().optional(),
});

export type DocumentTransformation = z.infer<typeof DocumentTransformationSchema>;

// Data Lineage Entry Schema
export const DataLineageEntrySchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  lineage_type: z.enum(['source', 'derived', 'merged', 'split', 'transformed', 'imported', 'exported']),
  related_document_id: z.string().uuid().optional(),
  external_source: z.string().optional(),
  external_destination: z.string().optional(),
  operation: z.string(),
  performed_by: z.string(),
  performed_at: z.string().datetime(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type DataLineageEntry = z.infer<typeof DataLineageEntrySchema>;

// Provenance Query Schema
export const ProvenanceQuerySchema = z.object({
  document_id: z.string().uuid().optional(),
  created_by: CreationSourceSchema.optional(),
  ai_model: AIModelSchema.optional(),
  reviewed_by_human: z.boolean().optional(),
  sign_off_obtained: z.boolean().optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  include_lineage: z.boolean().default(false),
  include_transformations: z.boolean().default(false),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type ProvenanceQuery = z.infer<typeof ProvenanceQuerySchema>;

// Provenance Report Schema
export const ProvenanceReportSchema = z.object({
  document_id: z.string().uuid(),
  document_title: z.string(),
  provenance: AIProvenanceMetadataSchema,
  lineage: z.array(DataLineageEntrySchema),
  transformations: z.array(DocumentTransformationSchema),
  chain_of_custody: z.array(z.object({
    action: z.string(),
    actor: z.string(),
    timestamp: z.string().datetime(),
    details: z.string().optional(),
  })),
});

export type ProvenanceReport = z.infer<typeof ProvenanceReportSchema>;
