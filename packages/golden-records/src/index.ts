/**
 * Summit Golden Records Package
 * Golden record management with entity resolution and lineage tracking
 */

export * from "./manager/golden-record-manager.js";
export * from "./resolver/entity-resolver.js";
export * from "./lineage/lineage-tracker.js";
export * from "./compliance/audit-ledger.js";
export * from "./compliance/record-definition-registry.js";
export * from "./compliance/legal-hold-service.js";
export * from "./compliance/retention-engine.js";
export * from "./compliance/versioning-service.js";
export * from "./compliance/record-search-engine.js";
export * from "./compliance/export-pack-builder.js";
export * from "./compliance/record-compliance-primitive.js";
export * from "./compliance/role-templates.js";

// Re-export core types for convenience
export type {
  MasterRecord,
  SourceRecord,
  SurvivorshipRule,
  CrossReference,
  RecordLineage,
  CertificationStatus,
} from "@intelgraph/mdm-core";
