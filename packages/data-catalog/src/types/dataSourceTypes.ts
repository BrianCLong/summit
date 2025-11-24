/**
 * Data Source and Dataset Types
 * Core types for data catalog registry
 */

import { z } from 'zod';
import { DataClassification } from './catalog.js';

/**
 * Data Source Type
 * Represents the type of connector/source
 */
export enum DataSourceType {
  DATABASE = 'DATABASE',
  API = 'API',
  FILE = 'FILE',
  STREAM = 'STREAM',
  S3 = 'S3',
  SFTP = 'SFTP',
  WEBHOOK = 'WEBHOOK',
  MANUAL = 'MANUAL',
  OTHER = 'OTHER',
}

/**
 * Connection Status
 */
export enum ConnectionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  ERROR = 'ERROR',
  PENDING = 'PENDING',
}

/**
 * Data Source
 * Represents a connector or external data source
 */
export interface DataSource {
  id: string;
  name: string;
  displayName: string;
  description: string | null;
  type: DataSourceType;

  // Connection details (encrypted in storage)
  connectionConfig: Record<string, any>;
  connectionStatus: ConnectionStatus;
  lastConnectionTest: Date | null;

  // Ownership
  owner: string;
  stewards: string[];

  // Organization
  tags: string[];
  domain: string | null;

  // Metadata
  properties: Record<string, any>;

  // Temporal
  createdAt: Date;
  updatedAt: Date;
  lastSyncAt: Date | null;

  // Datasets under this source
  datasetIds: string[];
}

/**
 * Dataset Status
 */
export enum DatasetStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
  DRAFT = 'DRAFT',
}

/**
 * Dataset
 * Represents a collection of data (table, file, API endpoint, etc.)
 */
export interface Dataset {
  id: string;
  sourceId: string;
  name: string;
  displayName: string;
  description: string | null;
  fullyQualifiedName: string;

  // Status
  status: DatasetStatus;
  classification: DataClassification;

  // Ownership
  owner: string;
  stewards: string[];

  // Organization
  tags: string[];
  domain: string | null;

  // Schema
  schemaId: string | null;
  fields: Field[];

  // Lineage
  originJobId: string | null;
  mappingIds: string[];

  // Statistics
  recordCount: number | null;
  sizeBytes: number | null;
  lastProfiledAt: Date | null;

  // Temporal
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date | null;

  // License & Policy
  licenseIds: string[];
  policyTags: string[];
  retentionDays: number | null;

  // Metadata
  properties: Record<string, any>;
}

/**
 * Field (enhanced from Column)
 * Represents a field/column in a dataset
 */
export interface Field {
  id: string;
  datasetId: string;
  name: string;
  displayName: string;
  description: string | null;

  // Data Type
  dataType: string;
  nativeDataType: string;
  nullable: boolean;

  // Constraints
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  foreignKeyReference: ForeignKeyReference | null;
  defaultValue: any;

  // Classification
  classification: DataClassification;
  tags: string[];
  policyTags: string[];

  // Mapping
  canonicalFieldId: string | null;
  mappingIds: string[];

  // Statistics
  statistics: FieldStatistics | null;
  sampleValues: any[];

  // Temporal
  createdAt: Date;
  updatedAt: Date;

  // Metadata
  properties: Record<string, any>;
}

/**
 * Foreign Key Reference
 */
export interface ForeignKeyReference {
  datasetId: string;
  fieldId: string;
  constraintName: string | null;
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
  standardDeviation: number | null;
  distribution: Record<string, number>;
  profiledAt: Date;
}

/**
 * Canonical Field Mapping
 * Maps source fields to canonical schema fields
 */
export interface Mapping {
  id: string;
  name: string;
  description: string | null;

  // Source
  sourceDatasetId: string;
  sourceFieldId: string;

  // Target (canonical)
  canonicalSchemaId: string;
  canonicalFieldId: string;

  // Transformation
  transformationType: TransformationType;
  transformationLogic: string | null;
  transformationLanguage: string | null;

  // Validation
  validationRules: ValidationRule[];

  // Status
  status: MappingStatus;
  version: string;

  // Ownership
  createdBy: string;
  approvedBy: string | null;

  // Temporal
  createdAt: Date;
  updatedAt: Date;
  deprecatedAt: Date | null;

  // Metadata
  properties: Record<string, any>;
}

/**
 * Transformation Type
 */
export enum TransformationType {
  DIRECT = 'DIRECT',
  CAST = 'CAST',
  CONCATENATE = 'CONCATENATE',
  SPLIT = 'SPLIT',
  LOOKUP = 'LOOKUP',
  CALCULATION = 'CALCULATION',
  CUSTOM = 'CUSTOM',
}

/**
 * Mapping Status
 */
export enum MappingStatus {
  ACTIVE = 'ACTIVE',
  DRAFT = 'DRAFT',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Validation Rule
 */
export interface ValidationRule {
  id: string;
  type: ValidationType;
  condition: string;
  errorMessage: string;
}

/**
 * Validation Type
 */
export enum ValidationType {
  NOT_NULL = 'NOT_NULL',
  RANGE = 'RANGE',
  REGEX = 'REGEX',
  ENUM = 'ENUM',
  CUSTOM = 'CUSTOM',
}

/**
 * License
 * Represents data usage constraints and licensing
 */
export interface License {
  id: string;
  name: string;
  displayName: string;
  description: string | null;

  // License terms
  licenseType: LicenseType;
  licenseUrl: string | null;
  legalBasis: string | null;

  // Constraints
  allowedUseCases: string[];
  restrictions: string[];
  retentionRequirement: number | null; // days
  deletionRequired: boolean;

  // Geographic restrictions
  geographicRestrictions: string[];
  allowedRegions: string[];

  // Attribution
  requiresAttribution: boolean;
  attributionText: string | null;

  // Commercial use
  allowsCommercialUse: boolean;
  allowsDerivativeWorks: boolean;
  allowsRedistribution: boolean;

  // Temporal
  createdAt: Date;
  updatedAt: Date;
  expiresAt: Date | null;

  // Ownership
  createdBy: string;

  // Metadata
  properties: Record<string, any>;
}

/**
 * License Type
 */
export enum LicenseType {
  PUBLIC_DOMAIN = 'PUBLIC_DOMAIN',
  OPEN_DATA = 'OPEN_DATA',
  CREATIVE_COMMONS = 'CREATIVE_COMMONS',
  PROPRIETARY = 'PROPRIETARY',
  RESTRICTED = 'RESTRICTED',
  CLASSIFIED = 'CLASSIFIED',
  CUSTOM = 'CUSTOM',
}

/**
 * Lineage Summary
 * Lightweight lineage tracking for impact analysis
 */
export interface LineageSummary {
  id: string;
  entityId: string;
  entityType: LineageEntityType;

  // Upstream (dependencies)
  upstreamSources: LineageReference[];
  upstreamDatasets: LineageReference[];
  upstreamFields: LineageReference[];

  // Downstream (dependents)
  downstreamDatasets: LineageReference[];
  downstreamCases: LineageReference[];
  downstreamReports: LineageReference[];

  // ETL/Job references
  etlJobIds: string[];

  // Usage statistics
  usageCount: number;
  lastUsedAt: Date | null;

  // Temporal
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Lineage Entity Type
 */
export enum LineageEntityType {
  DATA_SOURCE = 'DATA_SOURCE',
  DATASET = 'DATASET',
  FIELD = 'FIELD',
  MAPPING = 'MAPPING',
  CANONICAL_ENTITY = 'CANONICAL_ENTITY',
  CASE = 'CASE',
  REPORT = 'REPORT',
}

/**
 * Lineage Reference
 */
export interface LineageReference {
  entityId: string;
  entityType: LineageEntityType;
  name: string;
  path: string[];
}

/**
 * Validation Schemas using Zod
 */
export const DataSourceSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  description: z.string().nullable(),
  type: z.nativeEnum(DataSourceType),
  connectionConfig: z.record(z.any()),
  connectionStatus: z.nativeEnum(ConnectionStatus),
  owner: z.string(),
  stewards: z.array(z.string()),
  tags: z.array(z.string()),
  domain: z.string().nullable(),
});

export const DatasetSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  name: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  description: z.string().nullable(),
  fullyQualifiedName: z.string(),
  status: z.nativeEnum(DatasetStatus),
  classification: z.nativeEnum(DataClassification),
  owner: z.string(),
  stewards: z.array(z.string()),
  tags: z.array(z.string()),
  domain: z.string().nullable(),
});

export const FieldSchema = z.object({
  id: z.string().uuid(),
  datasetId: z.string().uuid(),
  name: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  description: z.string().nullable(),
  dataType: z.string(),
  nativeDataType: z.string(),
  nullable: z.boolean(),
  isPrimaryKey: z.boolean(),
  isForeignKey: z.boolean(),
  classification: z.nativeEnum(DataClassification),
  tags: z.array(z.string()),
  policyTags: z.array(z.string()),
});

export const MappingSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  sourceDatasetId: z.string().uuid(),
  sourceFieldId: z.string().uuid(),
  canonicalSchemaId: z.string().uuid(),
  canonicalFieldId: z.string().uuid(),
  transformationType: z.nativeEnum(TransformationType),
  transformationLogic: z.string().nullable(),
  status: z.nativeEnum(MappingStatus),
  version: z.string(),
  createdBy: z.string(),
});

export const LicenseSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255),
  description: z.string().nullable(),
  licenseType: z.nativeEnum(LicenseType),
  licenseUrl: z.string().url().nullable(),
  allowedUseCases: z.array(z.string()),
  restrictions: z.array(z.string()),
  requiresAttribution: z.boolean(),
  allowsCommercialUse: z.boolean(),
  allowsDerivativeWorks: z.boolean(),
  allowsRedistribution: z.boolean(),
});
