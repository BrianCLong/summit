/**
 * Summit Golden Records Package
 * Golden record management with entity resolution and lineage tracking
 */

export * from './manager/golden-record-manager.js';
export * from './resolver/entity-resolver.js';
export * from './lineage/lineage-tracker.js';

// Re-export core types for convenience
export type {
  MasterRecord,
  SourceRecord,
  SurvivorshipRule,
  CrossReference,
  RecordLineage,
  CertificationStatus
} from '@summit/mdm-core';
