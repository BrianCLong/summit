/**
 * @summit/platform-data
 *
 * Data utilities for Summit platform.
 * Implements Prompts 36-40: Data Lineage, Mock Data, Privacy
 *
 * Features:
 * - Data lineage tracking and graph visualization
 * - Mock data factory for testing
 * - PII detection and anonymization
 * - Privacy-preserving data transformations
 */

// Lineage exports
export * from './lineage/tracker.js';

// Mock data exports
export * from './mock/factory.js';

// Privacy exports
export * from './privacy/anonymizer.js';

// Re-export commonly used items
export {
  LineageGraph,
  LineageTracker,
  getLineageTracker,
} from './lineage/tracker.js';

export {
  MockDataFactory,
  mockFactory,
  createMockFactory,
} from './mock/factory.js';

export {
  DataAnonymizer,
  anonymizer,
  createAnonymizer,
  detectPII,
  maskValue,
  maskEmail,
  hashValue,
  anonymizeValue,
} from './privacy/anonymizer.js';

export type {
  DataNode,
  DataEdge,
  LineageRecord,
  DataSourceType,
  TransformationType,
} from './lineage/tracker.js';

export type {
  EntityType,
  RelationshipType,
  BaseEntity,
  PersonEntity,
  OrganizationEntity,
  LocationEntity,
  Relationship,
  Investigation,
} from './mock/factory.js';

export type {
  PIIType,
  AnonymizationStrategy,
  PIIDetection,
  AnonymizationRule,
} from './privacy/anonymizer.js';
