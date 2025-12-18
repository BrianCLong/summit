/**
 * Document Relationship Type Definitions
 */

import { z } from 'zod';

// Relationship types
export const RelationshipTypeIdSchema = z.enum([
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

export type RelationshipTypeId = z.infer<typeof RelationshipTypeIdSchema>;

// Relationship Type Definition Schema
export const RelationshipTypeDefinitionSchema = z.object({
  id: RelationshipTypeIdSchema,
  name: z.string(),
  description: z.string(),
  symmetric: z.boolean().default(false),
  transitive: z.boolean().default(false),
  inverse: RelationshipTypeIdSchema.optional(),
  valid_pairs: z.array(z.object({
    from: z.string(),
    to: z.string(),
    description: z.string().optional(),
  })).optional(),
  notes: z.string().optional(),
});

export type RelationshipTypeDefinition = z.infer<typeof RelationshipTypeDefinitionSchema>;

// Document Relationship Instance Schema
export const DocumentRelationshipSchema = z.object({
  id: z.string().uuid(),
  relationship_type: RelationshipTypeIdSchema,
  source_document_id: z.string().uuid(),
  target_document_id: z.string().uuid(),
  description: z.string().optional(),
  created_by: z.string(),
  created_at: z.string().datetime(),
  updated_by: z.string().optional(),
  updated_at: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.any()).default({}),
  is_active: z.boolean().default(true),
});

export type DocumentRelationship = z.infer<typeof DocumentRelationshipSchema>;

// Relationship Query Schema
export const RelationshipQuerySchema = z.object({
  document_id: z.string().uuid().optional(),
  relationship_types: z.array(RelationshipTypeIdSchema).optional(),
  direction: z.enum(['outgoing', 'incoming', 'both']).default('both'),
  depth: z.number().min(1).max(10).default(1),
  include_inactive: z.boolean().default(false),
  limit: z.number().min(1).max(100).default(50),
  offset: z.number().min(0).default(0),
});

export type RelationshipQuery = z.infer<typeof RelationshipQuerySchema>;

// Document Graph Node Schema
export const DocumentGraphNodeSchema = z.object({
  id: z.string().uuid(),
  document_type_id: z.string(),
  title: z.string(),
  status: z.string(),
  classification: z.string(),
  risk_level: z.string().optional(),
});

export type DocumentGraphNode = z.infer<typeof DocumentGraphNodeSchema>;

// Document Graph Edge Schema
export const DocumentGraphEdgeSchema = z.object({
  id: z.string().uuid(),
  relationship_type: RelationshipTypeIdSchema,
  source_id: z.string().uuid(),
  target_id: z.string().uuid(),
  description: z.string().optional(),
});

export type DocumentGraphEdge = z.infer<typeof DocumentGraphEdgeSchema>;

// Document Graph Schema
export const DocumentGraphSchema = z.object({
  nodes: z.array(DocumentGraphNodeSchema),
  edges: z.array(DocumentGraphEdgeSchema),
  center_document_id: z.string().uuid().optional(),
});

export type DocumentGraph = z.infer<typeof DocumentGraphSchema>;

// Relationship Validation Result
export const RelationshipValidationResultSchema = z.object({
  valid: z.boolean(),
  errors: z.array(z.string()),
  warnings: z.array(z.string()),
});

export type RelationshipValidationResult = z.infer<typeof RelationshipValidationResultSchema>;
