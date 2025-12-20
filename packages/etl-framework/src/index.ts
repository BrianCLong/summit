/**
 * IntelGraph ETL Framework
 * Comprehensive ETL/ELT pipeline execution framework
 */

// Pipeline execution
export { PipelineExecutor } from './pipeline/PipelineExecutor.js';

// Transformation
export { DataTransformer } from './transformation/DataTransformer.js';

// Validation
export { DataValidator } from './validation/DataValidator.js';
export type { ValidationResult } from './validation/DataValidator.js';

// Enrichment
export { DataEnricher } from './enrichment/DataEnricher.js';

// Loading
export { DataLoader } from './loading/DataLoader.js';
export type { LoadResult } from './loading/DataLoader.js';

// Change Data Capture (CDC)
export { CDCEngine, CDCStrategy, ChangeType } from './cdc/CDCEngine.js';
export type { CDCConfig, CDCRecord, CDCWatermark } from './cdc/CDCEngine.js';

// Data Quality
export { DataQualityMonitor, QualityDimension } from './quality/DataQualityMonitor.js';
export type { QualityRuleConfig, QualityRule } from './quality/DataQualityMonitor.js';

// Incremental Loading
export { IncrementalLoader } from './incremental/IncrementalLoader.js';
export type { IncrementalConfig, WatermarkConfig, LoadState } from './incremental/IncrementalLoader.js';

// Provenance & Lineage
export { ProvenanceIntegration } from './lineage/ProvenanceIntegration.js';
export type {
  ProvenanceLedgerConfig,
  EvidenceRegistration,
  TransformStep,
  ClaimRegistration
} from './lineage/ProvenanceIntegration.js';
