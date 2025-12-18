/**
 * Document Type Definitions for Business Document Governance
 */

import { z } from 'zod';

// Classification levels
export const ClassificationLevelSchema = z.enum([
  'Public',
  'Internal',
  'Confidential',
  'Restricted',
  'HighlyRestricted',
  'Classified_Internal',
  'Classified_Regulated',
]);

export type ClassificationLevel = z.infer<typeof ClassificationLevelSchema>;

// Risk levels
export const RiskLevelSchema = z.enum(['Low', 'Medium', 'High', 'Critical']);

export type RiskLevel = z.infer<typeof RiskLevelSchema>;

// Lifecycle types
export const LifecycleTypeSchema = z.enum([
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

export type LifecycleType = z.infer<typeof LifecycleTypeSchema>;

// Document categories
export const DocumentCategorySchema = z.enum([
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

export type DocumentCategory = z.infer<typeof DocumentCategorySchema>;

// Document Type Definition Schema
export const DocumentTypeDefinitionSchema = z.object({
  id: z.string().regex(/^doc\.[a-z_]+$/),
  name: z.string().min(1).max(200),
  category: DocumentCategorySchema,
  subcategory: z.string().optional(),
  description: z.string().max(1000),
  confidentiality: ClassificationLevelSchema,
  lifecycle: LifecycleTypeSchema,
  retention_period: z.string(),
  owner_department: z.string(),
  requires_signatures: z.array(z.string()).default([]),
  legal_basis: z.array(z.string()).default([]),
  risk_level: RiskLevelSchema,
});

export type DocumentTypeDefinition = z.infer<typeof DocumentTypeDefinitionSchema>;

// Document Instance Schema
export const DocumentInstanceSchema = z.object({
  id: z.string().uuid(),
  document_type_id: z.string().regex(/^doc\.[a-z_]+$/),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  version: z.string().default('1.0.0'),
  status: z.string(),
  classification: ClassificationLevelSchema,
  owner_id: z.string(),
  owner_department: z.string(),
  created_by: z.string(),
  created_at: z.string().datetime(),
  updated_by: z.string(),
  updated_at: z.string().datetime(),
  effective_date: z.string().datetime().optional(),
  expiration_date: z.string().datetime().optional(),
  review_date: z.string().datetime().optional(),
  file_path: z.string().optional(),
  file_hash: z.string().optional(),
  file_size: z.number().optional(),
  mime_type: z.string().optional(),
  tags: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).default({}),
});

export type DocumentInstance = z.infer<typeof DocumentInstanceSchema>;

// Document Version Schema
export const DocumentVersionSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  version: z.string(),
  status: z.string(),
  changes_summary: z.string().optional(),
  created_by: z.string(),
  created_at: z.string().datetime(),
  file_path: z.string().optional(),
  file_hash: z.string().optional(),
  previous_version_id: z.string().uuid().optional(),
});

export type DocumentVersion = z.infer<typeof DocumentVersionSchema>;

// Signature Schema
export const SignatureSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  signer_id: z.string(),
  signer_name: z.string(),
  signer_role: z.string(),
  signature_type: z.enum(['digital', 'electronic', 'wet_ink', 'docusign', 'adobe_sign']),
  signed_at: z.string().datetime(),
  ip_address: z.string().optional(),
  certificate_id: z.string().optional(),
  signature_data: z.string().optional(),
  is_valid: z.boolean().default(true),
});

export type Signature = z.infer<typeof SignatureSchema>;

// Document Attachment Schema
export const DocumentAttachmentSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  name: z.string(),
  description: z.string().optional(),
  file_path: z.string(),
  file_hash: z.string(),
  file_size: z.number(),
  mime_type: z.string(),
  uploaded_by: z.string(),
  uploaded_at: z.string().datetime(),
});

export type DocumentAttachment = z.infer<typeof DocumentAttachmentSchema>;

// Document Access Log Schema
export const DocumentAccessLogSchema = z.object({
  id: z.string().uuid(),
  document_id: z.string().uuid(),
  user_id: z.string(),
  action: z.enum(['view', 'download', 'edit', 'delete', 'share', 'print', 'export']),
  timestamp: z.string().datetime(),
  ip_address: z.string().optional(),
  user_agent: z.string().optional(),
  details: z.record(z.string(), z.any()).optional(),
});

export type DocumentAccessLog = z.infer<typeof DocumentAccessLogSchema>;

// Document Search Query Schema
export const DocumentSearchQuerySchema = z.object({
  query: z.string().optional(),
  document_type_ids: z.array(z.string()).optional(),
  categories: z.array(DocumentCategorySchema).optional(),
  classifications: z.array(ClassificationLevelSchema).optional(),
  statuses: z.array(z.string()).optional(),
  owner_departments: z.array(z.string()).optional(),
  owner_ids: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  created_after: z.string().datetime().optional(),
  created_before: z.string().datetime().optional(),
  updated_after: z.string().datetime().optional(),
  updated_before: z.string().datetime().optional(),
  effective_after: z.string().datetime().optional(),
  effective_before: z.string().datetime().optional(),
  expiring_within_days: z.number().optional(),
  risk_levels: z.array(RiskLevelSchema).optional(),
  compliance_standards: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
  sort_by: z.string().default('updated_at'),
  sort_order: z.enum(['asc', 'desc']).default('desc'),
});

export type DocumentSearchQuery = z.infer<typeof DocumentSearchQuerySchema>;

// Document Search Result Schema
export const DocumentSearchResultSchema = z.object({
  documents: z.array(DocumentInstanceSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  has_more: z.boolean(),
});

export type DocumentSearchResult = z.infer<typeof DocumentSearchResultSchema>;
