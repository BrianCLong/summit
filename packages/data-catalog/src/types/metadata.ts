/**
 * Data Catalog Metadata Types
 * Enhanced types for data sources, datasets, fields, mappings, and licenses
 */

import { z } from 'zod';

/**
 * Data Source Types
 */
export enum DataSourceType {
  DATABASE = 'DATABASE',
  API = 'API',
  FILE = 'FILE',
  STREAM = 'STREAM',
  SAAS = 'SAAS',
  CLOUD_STORAGE = 'CLOUD_STORAGE',
  MESSAGE_QUEUE = 'MESSAGE_QUEUE',
  OTHER = 'OTHER',
}

/**
 * Connection Status
 */
export enum ConnectionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  TESTING = 'TESTING',
  CONFIGURED = 'CONFIGURED',
}

/**
 * Data Source
 * Represents a connector or source system
 */
export interface DataSource {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  type: DataSourceType;
  connectorId: string; // Reference to connector implementation
  connectorVersion: string;

  // Connection details
  connectionConfig: Record<string, any>; // Encrypted/masked for security
  connectionStatus: ConnectionStatus;
  lastConnectedAt: Date | null;
  lastSyncedAt: Date | null;

  // Ownership
  owner: string;
  team: string | null;

  // Metadata
  tags: string[];
  properties: Record<string, any>;

  // Schema registry reference
  schemaId: string | null;
  schemaVersion: number | null;

  // Temporal
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * Dataset
 * Represents a collection of data within a source (table, file, topic, etc.)
 */
export interface Dataset {
  id: string;
  sourceId: string; // Reference to DataSource
  name: string;
  displayName: string;
  description: string | null;
  fullyQualifiedName: string; // source.schema.table or similar

  // Dataset type
  datasetType: DatasetType;

  // Schema
  schemaId: string | null;
  schemaVersion: number | null;
  fields: Field[];

  // Mapping to canonical model
  canonicalMappingId: string | null;
  canonicalMappingVersion: number | null;

  // License and policy
  licenseId: string | null;
  policyTags: string[]; // e.g., "PII", "PHI", "CONFIDENTIAL"
  retentionDays: number | null;
  legalBasis: string | null;

  // Statistics
  rowCount: number | null;
  sizeBytes: number | null;
  lastProfiledAt: Date | null;

  // Quality
  qualityScore: number | null;

  // Ownership
  owner: string;
  stewards: string[];

  // Metadata
  tags: string[];
  properties: Record<string, any>;

  // Temporal
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date | null;
}

/**
 * Dataset Type
 */
export enum DatasetType {
  TABLE = 'TABLE',
  VIEW = 'VIEW',
  FILE = 'FILE',
  TOPIC = 'TOPIC',
  COLLECTION = 'COLLECTION',
  API_ENDPOINT = 'API_ENDPOINT',
  OTHER = 'OTHER',
}

/**
 * Field
 * Represents a field/column within a dataset
 */
export interface Field {
  id: string;
  datasetId: string;
  name: string;
  displayName: string;
  description: string | null;

  // Data type
  dataType: string; // Native type from source
  semanticType: string | null; // e.g., "email", "phone", "ssn"

  // Constraints
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyRef: string | null;

  // Mapping
  canonicalFieldName: string | null; // Maps to canonical entity field
  transformationLogic: string | null;

  // Classification
  policyTags: string[];
  sensitivityLevel: SensitivityLevel;

  // Statistics
  statistics: FieldStatistics | null;

  // Metadata
  tags: string[];
  properties: Record<string, any>;

  // Temporal
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Sensitivity Level
 */
export enum SensitivityLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  HIGHLY_RESTRICTED = 'HIGHLY_RESTRICTED',
}

/**
 * Field Statistics
 */
export interface FieldStatistics {
  uniqueCount: number;
  nullCount: number;
  minValue: any;
  maxValue: any;
  averageValue: any;
  medianValue: any;
  standardDeviation: number | null;
  distinctValues: number;
  topValues: Array<{ value: any; count: number }>;
  sampleValues: any[];
}

/**
 * Mapping
 * Represents a mapping from source schema to canonical schema
 */
export interface Mapping {
  id: string;
  name: string;
  description: string | null;

  // Source
  sourceId: string; // DataSource ID
  datasetId: string | null; // Optional - mapping can be at source level
  sourceSchemaId: string;
  sourceSchemaVersion: number;

  // Target
  canonicalSchemaId: string;
  canonicalSchemaVersion: number;
  canonicalEntityType: string; // e.g., "Person", "Organization", "Event"

  // Mapping rules
  fieldMappings: FieldMapping[];
  transformationRules: TransformationRule[];

  // Status
  status: MappingStatus;
  validatedAt: Date | null;
  validatedBy: string | null;

  // Versioning
  version: number;
  previousVersionId: string | null;

  // Metadata
  tags: string[];
  properties: Record<string, any>;

  // Temporal
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * Field Mapping
 */
export interface FieldMapping {
  sourceFieldName: string;
  targetFieldName: string;
  transformationType: TransformationType;
  transformationExpression: string | null;
  defaultValue: any;
  required: boolean;
  metadata: Record<string, any>;
}

/**
 * Transformation Type
 */
export enum TransformationType {
  DIRECT = 'DIRECT', // 1:1 copy
  CAST = 'CAST', // Type conversion
  CONCAT = 'CONCAT', // Concatenation
  SPLIT = 'SPLIT', // Split into multiple fields
  LOOKUP = 'LOOKUP', // Reference data lookup
  FUNCTION = 'FUNCTION', // Custom function
  CONSTANT = 'CONSTANT', // Constant value
  DERIVED = 'DERIVED', // Derived from multiple fields
}

/**
 * Transformation Rule
 */
export interface TransformationRule {
  id: string;
  name: string;
  description: string | null;
  ruleType: string;
  expression: string;
  language: string; // e.g., "SQL", "JavaScript", "Python"
  inputFields: string[];
  outputFields: string[];
  executionOrder: number;
  enabled: boolean;
  metadata: Record<string, any>;
}

/**
 * Mapping Status
 */
export enum MappingStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * License
 * Represents a data license or usage constraint
 */
export interface License {
  id: string;
  name: string;
  displayName: string;
  description: string | null;

  // License type
  licenseType: LicenseType;

  // Terms
  termsAndConditions: string;
  usageRestrictions: string[];
  allowedPurposes: string[];
  prohibitedPurposes: string[];

  // Attribution
  requiresAttribution: boolean;
  attributionText: string | null;

  // Compliance
  complianceFrameworks: string[]; // e.g., "GDPR", "CCPA", "HIPAA"
  legalBasis: string | null;
  jurisdictions: string[];

  // Expiration
  expiresAt: Date | null;
  autoRenew: boolean;

  // Contact
  licensor: string;
  contactEmail: string | null;
  contactUrl: string | null;

  // Status
  status: LicenseStatus;

  // Metadata
  tags: string[];
  properties: Record<string, any>;

  // Temporal
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
}

/**
 * License Type
 */
export enum LicenseType {
  PROPRIETARY = 'PROPRIETARY',
  OPEN_DATA = 'OPEN_DATA',
  COMMERCIAL = 'COMMERCIAL',
  ACADEMIC = 'ACADEMIC',
  GOVERNMENT = 'GOVERNMENT',
  CREATIVE_COMMONS = 'CREATIVE_COMMONS',
  CUSTOM = 'CUSTOM',
}

/**
 * License Status
 */
export enum LicenseStatus {
  ACTIVE = 'ACTIVE',
  EXPIRED = 'EXPIRED',
  SUSPENDED = 'SUSPENDED',
  REVOKED = 'REVOKED',
}

/**
 * Lineage Summary
 * Lightweight lineage tracking for impact analysis
 */
export interface LineageSummary {
  entityId: string;
  entityType: 'SOURCE' | 'DATASET' | 'FIELD' | 'CANONICAL_ENTITY' | 'CASE';

  // Upstream
  upstreamSources: string[];
  upstreamDatasets: string[];
  upstreamFields: string[];

  // Downstream
  downstreamDatasets: string[];
  downstreamCanonicalEntities: string[];
  downstreamCases: string[];

  // Mappings involved
  mappingIds: string[];

  // ETL jobs
  etlJobIds: string[];

  // Last computed
  computedAt: Date;
}

/**
 * Schema Version
 */
export interface SchemaVersion {
  id: string;
  schemaId: string;
  version: number;
  schema: Record<string, any>; // JSON Schema or similar
  schemaFormat: SchemaFormat;

  // Compatibility
  backwardCompatible: boolean;
  forwardCompatible: boolean;
  breakingChanges: string[];

  // Status
  status: SchemaVersionStatus;
  deprecatedAt: Date | null;

  // Metadata
  description: string | null;
  changelog: string | null;

  // Temporal
  createdAt: Date;
  createdBy: string;
}

/**
 * Schema Format
 */
export enum SchemaFormat {
  JSON_SCHEMA = 'JSON_SCHEMA',
  AVRO = 'AVRO',
  PROTOBUF = 'PROTOBUF',
  PARQUET = 'PARQUET',
  SQL_DDL = 'SQL_DDL',
  OPENAPI = 'OPENAPI',
  GRAPHQL = 'GRAPHQL',
  CUSTOM = 'CUSTOM',
}

/**
 * Schema Version Status
 */
export enum SchemaVersionStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Connector Registration
 * Metadata about available connectors
 */
export interface ConnectorRegistration {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  version: string;

  // Connector type
  sourceType: DataSourceType;

  // Implementation
  implementationClass: string;
  packageName: string;

  // Configuration
  configSchema: Record<string, any>; // JSON Schema for connector config
  requiredPermissions: string[];

  // Capabilities
  supportsBulkExtract: boolean;
  supportsIncrementalSync: boolean;
  supportsRealtime: boolean;
  supportsSchemaDiscovery: boolean;

  // Status
  status: ConnectorStatus;
  certified: boolean;

  // Metadata
  vendor: string | null;
  documentation: string | null;
  tags: string[];

  // Temporal
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Connector Status
 */
export enum ConnectorStatus {
  AVAILABLE = 'AVAILABLE',
  DEPRECATED = 'DEPRECATED',
  EXPERIMENTAL = 'EXPERIMENTAL',
  UNAVAILABLE = 'UNAVAILABLE',
}

/**
 * Validation Schemas using Zod
 */
export const DataSourceSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  description: z.string().nullable(),
  type: z.nativeEnum(DataSourceType),
  connectorId: z.string(),
  connectorVersion: z.string(),
  connectionStatus: z.nativeEnum(ConnectionStatus),
  owner: z.string(),
  team: z.string().nullable(),
  tags: z.array(z.string()),
});

export const DatasetSchema = z.object({
  id: z.string(),
  sourceId: z.string(),
  name: z.string().min(1).max(500),
  displayName: z.string().min(1).max(500),
  description: z.string().nullable(),
  fullyQualifiedName: z.string(),
  datasetType: z.nativeEnum(DatasetType),
  owner: z.string(),
  stewards: z.array(z.string()),
  policyTags: z.array(z.string()),
  tags: z.array(z.string()),
});

export const FieldSchema = z.object({
  id: z.string(),
  datasetId: z.string(),
  name: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  description: z.string().nullable(),
  dataType: z.string(),
  nullable: z.boolean(),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
  sensitivityLevel: z.nativeEnum(SensitivityLevel),
  policyTags: z.array(z.string()),
});

export const MappingSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  sourceId: z.string(),
  sourceSchemaId: z.string(),
  sourceSchemaVersion: z.number().int().positive(),
  canonicalSchemaId: z.string(),
  canonicalSchemaVersion: z.number().int().positive(),
  canonicalEntityType: z.string(),
  status: z.nativeEnum(MappingStatus),
  version: z.number().int().positive(),
});

export const LicenseSchema = z.object({
  id: z.string(),
  name: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  description: z.string().nullable(),
  licenseType: z.nativeEnum(LicenseType),
  termsAndConditions: z.string(),
  requiresAttribution: z.boolean(),
  status: z.nativeEnum(LicenseStatus),
  licensor: z.string(),
});
