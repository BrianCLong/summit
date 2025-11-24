/**
 * Schema Registry Types
 * Types for managing schemas, versioning, and evolution
 */

import { z } from 'zod';

/**
 * Schema Type
 */
export enum SchemaType {
  CONNECTOR = 'CONNECTOR', // Raw schema from connector
  CANONICAL = 'CANONICAL', // Canonical/normalized schema
  MAPPING = 'MAPPING', // Mapping definition schema
  AVRO = 'AVRO',
  JSON_SCHEMA = 'JSON_SCHEMA',
  PROTOBUF = 'PROTOBUF',
  OPENAPI = 'OPENAPI',
  GRAPHQL = 'GRAPHQL',
  CUSTOM = 'CUSTOM',
}

/**
 * Schema Status
 */
export enum SchemaStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
}

/**
 * Compatibility Mode
 * For schema evolution rules
 */
export enum CompatibilityMode {
  NONE = 'NONE', // No compatibility checks
  BACKWARD = 'BACKWARD', // New schema can read old data
  FORWARD = 'FORWARD', // Old schema can read new data
  FULL = 'FULL', // Both backward and forward compatible
  BACKWARD_TRANSITIVE = 'BACKWARD_TRANSITIVE',
  FORWARD_TRANSITIVE = 'FORWARD_TRANSITIVE',
  FULL_TRANSITIVE = 'FULL_TRANSITIVE',
}

/**
 * Schema Definition
 * Core schema entity in the registry
 */
export interface SchemaDefinition {
  id: string;
  name: string;
  namespace: string;
  fullyQualifiedName: string;
  description: string | null;

  // Schema type and format
  type: SchemaType;
  format: string; // e.g., 'avro', 'json', 'proto'

  // Schema content
  schema: Record<string, any> | string;
  schemaHash: string; // For deduplication

  // Versioning
  version: string;
  versionNumber: number;
  majorVersion: number;
  minorVersion: number;
  patchVersion: number;

  // Evolution
  compatibilityMode: CompatibilityMode;
  previousVersionId: string | null;
  isBreakingChange: boolean;

  // Status
  status: SchemaStatus;
  deprecatedAt: Date | null;
  deprecationReason: string | null;
  replacedByVersionId: string | null;

  // Ownership
  owner: string;
  createdBy: string;
  approvedBy: string | null;

  // Organization
  tags: string[];
  domain: string | null;

  // References
  datasetIds: string[];
  mappingIds: string[];

  // Temporal
  createdAt: Date;
  updatedAt: Date;
  publishedAt: Date | null;

  // Metadata
  properties: Record<string, any>;
}

/**
 * Schema Field Definition
 */
export interface SchemaFieldDefinition {
  id: string;
  schemaId: string;
  name: string;
  description: string | null;

  // Type information
  dataType: string;
  nullable: boolean;
  defaultValue: any;

  // Array/Complex types
  isArray: boolean;
  isMap: boolean;
  nestedSchema: Record<string, any> | null;

  // Constraints
  constraints: FieldConstraint[];

  // Order in schema
  ordinalPosition: number;

  // Metadata
  properties: Record<string, any>;
}

/**
 * Field Constraint
 */
export interface FieldConstraint {
  type: ConstraintType;
  value: any;
  errorMessage: string | null;
}

/**
 * Constraint Type
 */
export enum ConstraintType {
  REQUIRED = 'REQUIRED',
  MIN_LENGTH = 'MIN_LENGTH',
  MAX_LENGTH = 'MAX_LENGTH',
  MIN_VALUE = 'MIN_VALUE',
  MAX_VALUE = 'MAX_VALUE',
  PATTERN = 'PATTERN',
  ENUM = 'ENUM',
  CUSTOM = 'CUSTOM',
}

/**
 * Schema Version History
 */
export interface SchemaVersion {
  id: string;
  schemaId: string;
  version: string;
  versionNumber: number;
  status: SchemaStatus;
  isBreakingChange: boolean;
  changes: SchemaChange[];
  createdAt: Date;
  createdBy: string;
}

/**
 * Schema Change
 * Tracks changes between versions
 */
export interface SchemaChange {
  type: SchemaChangeType;
  path: string;
  oldValue: any;
  newValue: any;
  isBreaking: boolean;
  description: string;
}

/**
 * Schema Change Type
 */
export enum SchemaChangeType {
  FIELD_ADDED = 'FIELD_ADDED',
  FIELD_REMOVED = 'FIELD_REMOVED',
  FIELD_RENAMED = 'FIELD_RENAMED',
  TYPE_CHANGED = 'TYPE_CHANGED',
  CONSTRAINT_ADDED = 'CONSTRAINT_ADDED',
  CONSTRAINT_REMOVED = 'CONSTRAINT_REMOVED',
  DEFAULT_CHANGED = 'DEFAULT_CHANGED',
  NULLABLE_CHANGED = 'NULLABLE_CHANGED',
  OTHER = 'OTHER',
}

/**
 * Compatibility Check Result
 */
export interface CompatibilityCheckResult {
  compatible: boolean;
  mode: CompatibilityMode;
  errors: CompatibilityError[];
  warnings: CompatibilityWarning[];
  changes: SchemaChange[];
}

/**
 * Compatibility Error
 */
export interface CompatibilityError {
  code: string;
  message: string;
  path: string;
  severity: 'ERROR' | 'WARNING';
}

/**
 * Compatibility Warning
 */
export interface CompatibilityWarning {
  code: string;
  message: string;
  path: string;
  recommendation: string;
}

/**
 * Schema Registration Request
 */
export interface SchemaRegistrationRequest {
  name: string;
  namespace: string;
  description: string | null;
  type: SchemaType;
  format: string;
  schema: Record<string, any> | string;
  compatibilityMode: CompatibilityMode;
  owner: string;
  tags: string[];
  domain: string | null;
  properties: Record<string, any>;
}

/**
 * Schema Evolution Request
 */
export interface SchemaEvolutionRequest {
  schemaId: string;
  newSchema: Record<string, any> | string;
  versionType: VersionType;
  description: string | null;
  skipCompatibilityCheck: boolean;
}

/**
 * Version Type
 */
export enum VersionType {
  MAJOR = 'MAJOR',
  MINOR = 'MINOR',
  PATCH = 'PATCH',
}

/**
 * Schema Search Request
 */
export interface SchemaSearchRequest {
  query: string;
  namespace: string | null;
  type: SchemaType | null;
  status: SchemaStatus | null;
  tags: string[];
  domain: string | null;
  offset: number;
  limit: number;
}

/**
 * Schema Search Response
 */
export interface SchemaSearchResponse {
  schemas: SchemaDefinition[];
  total: number;
  offset: number;
  limit: number;
}

/**
 * Schema Dependency
 * Tracks schema references and dependencies
 */
export interface SchemaDependency {
  id: string;
  schemaId: string;
  dependsOnSchemaId: string;
  dependencyType: DependencyType;
  isRequired: boolean;
  createdAt: Date;
}

/**
 * Dependency Type
 */
export enum DependencyType {
  IMPORTS = 'IMPORTS',
  REFERENCES = 'REFERENCES',
  EXTENDS = 'EXTENDS',
  IMPLEMENTS = 'IMPLEMENTS',
}

/**
 * Schema Usage Statistics
 */
export interface SchemaUsageStatistics {
  schemaId: string;
  version: string;
  datasetCount: number;
  mappingCount: number;
  activeReferences: number;
  lastUsedAt: Date | null;
  usageByDataset: Record<string, number>;
  usageByService: Record<string, number>;
}

/**
 * Schema Deprecation Plan
 */
export interface SchemaDeprecationPlan {
  id: string;
  schemaId: string;
  version: string;
  deprecationDate: Date;
  sunsetDate: Date;
  reason: string;
  migrationGuide: string;
  replacementSchemaId: string | null;
  notifiedUsers: string[];
  createdAt: Date;
  createdBy: string;
}

/**
 * Validation Schemas using Zod
 */
export const SchemaDefinitionSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(255),
  namespace: z.string().min(1).max(255),
  fullyQualifiedName: z.string(),
  description: z.string().nullable(),
  type: z.nativeEnum(SchemaType),
  format: z.string(),
  schema: z.union([z.record(z.any()), z.string()]),
  version: z.string(),
  compatibilityMode: z.nativeEnum(CompatibilityMode),
  status: z.nativeEnum(SchemaStatus),
  owner: z.string(),
  createdBy: z.string(),
  tags: z.array(z.string()),
  domain: z.string().nullable(),
});

export const SchemaRegistrationRequestSchema = z.object({
  name: z.string().min(1).max(255),
  namespace: z.string().min(1).max(255),
  description: z.string().nullable(),
  type: z.nativeEnum(SchemaType),
  format: z.string(),
  schema: z.union([z.record(z.any()), z.string()]),
  compatibilityMode: z.nativeEnum(CompatibilityMode),
  owner: z.string(),
  tags: z.array(z.string()),
  domain: z.string().nullable(),
  properties: z.record(z.any()),
});

export const SchemaEvolutionRequestSchema = z.object({
  schemaId: z.string().uuid(),
  newSchema: z.union([z.record(z.any()), z.string()]),
  versionType: z.nativeEnum(VersionType),
  description: z.string().nullable(),
  skipCompatibilityCheck: z.boolean(),
});

export const SchemaSearchRequestSchema = z.object({
  query: z.string(),
  namespace: z.string().nullable(),
  type: z.nativeEnum(SchemaType).nullable(),
  status: z.nativeEnum(SchemaStatus).nullable(),
  tags: z.array(z.string()),
  domain: z.string().nullable(),
  offset: z.number().min(0),
  limit: z.number().min(1).max(1000),
});
