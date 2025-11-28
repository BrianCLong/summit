/**
 * @intelgraph/document-governance
 *
 * Business Document Ontology and Governance Framework for Summit/IntelGraph/CompanyOS
 *
 * This package provides comprehensive document governance capabilities including:
 * - Document type ontology with 50+ business document types
 * - Lifecycle state management with configurable transitions
 * - Multi-dimensional risk scoring
 * - Compliance validation against SOC2, ISO27001, GDPR, and more
 * - AI provenance tracking for AI-assisted document creation
 * - Relationship management between documents
 */

// Types
export * from './types/index.js';

// Services
export * from './services/index.js';

// Re-export key types for convenience
export type {
  DocumentTypeDefinition,
  DocumentInstance,
  ClassificationLevel,
  RiskLevel,
  LifecycleType,
} from './types/document.js';

export type {
  RelationshipTypeId,
  DocumentRelationship,
} from './types/relationship.js';

export type {
  LifecycleDefinition,
  TransitionResult,
  AvailableTransitions,
} from './types/lifecycle.js';

export type {
  ComplianceCheckResult,
  RiskScore,
  ComplianceReport,
} from './types/compliance.js';

export type {
  AIProvenanceMetadata,
  ProvenanceReport,
} from './types/provenance.js';

// Version
export const VERSION = '1.0.0';
