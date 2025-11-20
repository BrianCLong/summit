/**
 * Data Catalog & Governance Module
 * Central export point for catalog functionality
 */

export { CatalogService, getCatalogService } from './CatalogService.js';
export {
  CatalogAuthorityGuard,
  requireDatasetAccess,
  DatasetPolicy,
} from './authorityIntegration.js';

export type {
  // Core types
  StorageSystem,
  DataClassificationLevel,
  DataType,
  AccessType,
  TransformationType,

  // Dataset types
  ColumnDefinition,
  DatasetMetadata,
  SchemaVersion,
  DatasetRegistration,
  CatalogEntry,
  DatasetQueryFilters,

  // Lineage types
  ColumnMapping,
  LineageEdge,
  LineageGraph,
  LineageQueryOptions,

  // Quality types
  QualityCheck,
  QualityMetrics,

  // Access types
  DatasetAccessLog,

  // Tag types
  DatasetTag,

  // Stats types
  CatalogStats,
} from './types.js';
