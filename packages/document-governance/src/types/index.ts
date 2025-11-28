/**
 * @intelgraph/document-governance - Type Definitions
 *
 * Central export for all document governance type definitions.
 */

// Document types
export * from './document.js';

// Relationship types
export * from './relationship.js';

// Lifecycle types
export * from './lifecycle.js';

// Compliance and risk types
export * from './compliance.js';

// AI provenance types
export * from './provenance.js';

// Re-export commonly used schemas for convenience
export {
  DocumentTypeDefinitionSchema,
  DocumentInstanceSchema,
  ClassificationLevelSchema,
  RiskLevelSchema,
  LifecycleTypeSchema,
} from './document.js';

export {
  RelationshipTypeIdSchema,
  DocumentRelationshipSchema,
} from './relationship.js';

export {
  LifecycleDefinitionSchema,
  TransitionRequestSchema,
  TransitionResultSchema,
} from './lifecycle.js';

export {
  ComplianceCheckResultSchema,
  RiskScoreSchema,
} from './compliance.js';

export {
  AIProvenanceMetadataSchema,
  CreationSourceSchema,
} from './provenance.js';
