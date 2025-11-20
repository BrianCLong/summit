/**
 * Data Catalog & Governance Types
 * Unified types for dataset discovery, governance, and lineage
 */

export type StorageSystem =
  | 'postgres'
  | 'neo4j'
  | 's3'
  | 'object-store'
  | 'elasticsearch'
  | 'blob';

export type DataClassificationLevel =
  | 'public'
  | 'internal'
  | 'confidential'
  | 'restricted'
  | 'regulated';

export type DataType =
  | 'audit'
  | 'analytics'
  | 'telemetry'
  | 'communications'
  | 'ml-training'
  | 'custom';

export type AccessType = 'read' | 'write' | 'export' | 'delete';

export type TransformationType =
  | 'extract'
  | 'transform'
  | 'load'
  | 'aggregate'
  | 'join'
  | 'filter'
  | 'enrich'
  | 'deduplicate'
  | 'validate';

/**
 * Column definition in dataset schema
 */
export interface ColumnDefinition {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
  pii?: boolean;
  encrypted?: boolean;
  format?: string; // e.g., email, phone, date, etc.
  constraints?: string[];
  tags?: string[];
}

/**
 * Core dataset metadata
 */
export interface DatasetMetadata {
  id: string; // UUID
  datasetId: string; // Human-readable ID
  name: string;
  description?: string;

  // Classification
  dataType: DataType;
  classificationLevel: DataClassificationLevel;

  // Sensitivity
  containsPersonalData: boolean;
  containsFinancialData?: boolean;
  containsHealthData?: boolean;

  // Ownership
  ownerTeam: string;
  ownerEmail: string;
  jurisdiction: string[];
  tags: string[];

  // Storage
  storageSystem: StorageSystem;
  storageLocation: string;
  storageMetadata?: Record<string, any>;

  // Schema
  schemaDefinition: ColumnDefinition[];
  schemaVersion: number;

  // License & Contracts
  licenseId?: string;
  contractReferences?: string[];
  authorityRequirements?: string[];

  // Lineage
  openlineageNamespace?: string;
  openlineageName?: string;
  upstreamDatasets?: string[];
  downstreamDatasets?: string[];

  // Quality & Stats
  recordCount?: number;
  lastUpdatedAt?: Date;
  dataQualityScore?: number;
  qualityChecks?: QualityCheck[];

  // Retention
  retentionDays?: number;
  retentionPolicyId?: string;
  archivalLocation?: string;

  // Metadata
  createdAt: Date;
  createdBy?: string;
  updatedAt: Date;
  updatedBy?: string;
  deprecatedAt?: Date;
  deletedAt?: Date;
}

/**
 * Dataset schema version
 */
export interface SchemaVersion {
  id: string;
  datasetId: string;
  version: number;
  schemaDefinition: ColumnDefinition[];
  changes?: string;
  breakingChanges: boolean;
  appliedAt: Date;
  appliedBy?: string;
}

/**
 * Column-level lineage mapping
 */
export interface ColumnMapping {
  sourceColumn: string;
  targetColumn: string;
  transformation?: string;
  transformationLogic?: string;
}

/**
 * Lineage edge between datasets
 */
export interface LineageEdge {
  id: string;
  sourceDatasetId: string;
  targetDatasetId: string;
  transformationType: TransformationType;
  transformationDescription?: string;
  jobName?: string;
  columnMappings?: ColumnMapping[];
  createdAt: Date;
  lastSeenAt: Date;
  runCount: number;
}

/**
 * Dataset access log entry
 */
export interface DatasetAccessLog {
  id: string;
  datasetId: string;
  userId: string;
  accessType: AccessType;
  accessMethod?: string;

  // Authority context
  authorityBindingType?: string;
  clearanceLevel?: number;
  reasonForAccess?: string;

  // Request details
  queryHash?: string;
  rowCount?: number;
  bytesAccessed?: number;

  // Results
  accessGranted: boolean;
  denialReason?: string;

  accessedAt: Date;
}

/**
 * Quality check result
 */
export interface QualityCheck {
  checkName: string;
  checkType: string;
  passed: boolean;
  message?: string;
  measuredAt: Date;
}

/**
 * Dataset quality metrics
 */
export interface QualityMetrics {
  id: string;
  datasetId: string;

  // Scores
  completenessScore?: number;
  validityScore?: number;
  consistencyScore?: number;
  timelinessScore?: number;
  accuracyScore?: number;

  // Specific metrics
  nullPercentage?: number;
  duplicatePercentage?: number;
  outlierCount?: number;
  schemaViolationsCount?: number;

  // Context
  measuredAt: Date;
  measurementJob?: string;
  sampleSize?: number;
}

/**
 * Dataset tag
 */
export interface DatasetTag {
  id: string;
  tag: string;
  category?: 'domain' | 'sensitivity' | 'purpose' | 'lifecycle' | 'quality';
  description?: string;
  createdAt: Date;
}

/**
 * Simplified dataset for catalog listing
 */
export interface CatalogEntry {
  datasetId: string;
  name: string;
  description?: string;
  dataType: DataType;
  classificationLevel: DataClassificationLevel;
  ownerTeam: string;
  ownerEmail: string;
  storageSystem: StorageSystem;
  storageLocation: string;
  containsPersonalData: boolean;
  containsFinancialData?: boolean;
  containsHealthData?: boolean;
  tags: string[];
  recordCount?: number;
  lastUpdatedAt?: Date;
  dataQualityScore?: number;
  schemaVersion: number;
  downstreamCount: number;
  upstreamCount: number;
  createdAt: Date;
  isDeprecated: boolean;
}

/**
 * Lineage graph for a dataset
 */
export interface LineageGraph {
  dataset: string;
  upstream: LineageEdge[];
  downstream: LineageEdge[];
  generatedAt: Date;
}

/**
 * Dataset registration request
 */
export interface DatasetRegistration {
  datasetId: string;
  name: string;
  description?: string;
  dataType: DataType;
  classificationLevel: DataClassificationLevel;
  ownerTeam: string;
  ownerEmail: string;
  storageSystem: StorageSystem;
  storageLocation: string;
  schemaDefinition: ColumnDefinition[];
  containsPersonalData: boolean;
  containsFinancialData?: boolean;
  containsHealthData?: boolean;
  jurisdiction?: string[];
  tags?: string[];
  licenseId?: string;
  contractReferences?: string[];
  authorityRequirements?: string[];
  retentionDays?: number;
  retentionPolicyId?: string;
}

/**
 * Dataset query filters
 */
export interface DatasetQueryFilters {
  dataType?: DataType | DataType[];
  classificationLevel?: DataClassificationLevel | DataClassificationLevel[];
  ownerTeam?: string | string[];
  storageSystem?: StorageSystem | StorageSystem[];
  tags?: string | string[];
  containsPersonalData?: boolean;
  isDeprecated?: boolean;
  search?: string; // Search in name/description
}

/**
 * Lineage query options
 */
export interface LineageQueryOptions {
  maxDepth?: number;
  includeColumnLineage?: boolean;
  includeQualityMetrics?: boolean;
  direction?: 'upstream' | 'downstream' | 'both';
}

/**
 * Catalog statistics
 */
export interface CatalogStats {
  totalDatasets: number;
  datasetsByType: Record<DataType, number>;
  datasetsByClassification: Record<DataClassificationLevel, number>;
  datasetsByStorageSystem: Record<StorageSystem, number>;
  datasetsWithPII: number;
  deprecatedDatasets: number;
  totalRecords: number;
  averageQualityScore: number;
  lastUpdated: Date;
}
