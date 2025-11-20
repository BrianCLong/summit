/**
 * Core Data Catalog Types
 * Comprehensive type definitions for the data catalog platform
 */

import { z } from 'zod';

/**
 * Asset Types
 */
export enum AssetType {
  DATABASE = 'DATABASE',
  TABLE = 'TABLE',
  VIEW = 'VIEW',
  COLUMN = 'COLUMN',
  DASHBOARD = 'DASHBOARD',
  REPORT = 'REPORT',
  API = 'API',
  FILE = 'FILE',
  STREAM = 'STREAM',
  MODEL = 'MODEL',
  NOTEBOOK = 'NOTEBOOK',
  QUERY = 'QUERY',
  PROCEDURE = 'PROCEDURE',
  FUNCTION = 'FUNCTION',
}

/**
 * Asset Status
 */
export enum AssetStatus {
  ACTIVE = 'ACTIVE',
  DEPRECATED = 'DEPRECATED',
  ARCHIVED = 'ARCHIVED',
  DRAFT = 'DRAFT',
  PENDING_APPROVAL = 'PENDING_APPROVAL',
}

/**
 * Certification Level
 */
export enum CertificationLevel {
  NONE = 'NONE',
  BRONZE = 'BRONZE',
  SILVER = 'SILVER',
  GOLD = 'GOLD',
  PLATINUM = 'PLATINUM',
}

/**
 * Data Classification
 */
export enum DataClassification {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  TOP_SECRET = 'TOP_SECRET',
}

/**
 * Quality Score
 */
export interface QualityScore {
  overall: number;
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  validity: number;
  uniqueness: number;
}

/**
 * Trust Indicators
 */
export interface TrustIndicators {
  certificationLevel: CertificationLevel;
  endorsementCount: number;
  userRating: number;
  usageCount: number;
  lastVerified: Date | null;
  verifiedBy: string | null;
  qualityScore: QualityScore;
}

/**
 * Asset Metadata
 */
export interface AssetMetadata {
  id: string;
  type: AssetType;
  name: string;
  displayName: string;
  description: string | null;
  fullyQualifiedName: string;
  status: AssetStatus;
  classification: DataClassification;

  // Ownership
  owner: string;
  stewards: string[];
  experts: string[];

  // Organization
  tags: string[];
  collections: string[];
  domain: string | null;

  // Trust & Quality
  trustIndicators: TrustIndicators;

  // Technical Metadata
  schema: Record<string, any> | null;
  properties: Record<string, any>;
  statistics: Record<string, any> | null;

  // Lineage
  upstreamAssets: string[];
  downstreamAssets: string[];

  // Temporal
  createdAt: Date;
  updatedAt: Date;
  lastAccessedAt: Date | null;

  // Documentation
  documentation: string | null;
  sampleData: any[] | null;

  // Access
  accessControlList: AccessControlEntry[];
}

/**
 * Access Control Entry
 */
export interface AccessControlEntry {
  principal: string;
  principalType: 'USER' | 'GROUP' | 'ROLE';
  permissions: Permission[];
  grantedBy: string;
  grantedAt: Date;
  expiresAt: Date | null;
}

/**
 * Permissions
 */
export enum Permission {
  VIEW = 'VIEW',
  EDIT = 'EDIT',
  DELETE = 'DELETE',
  SHARE = 'SHARE',
  CERTIFY = 'CERTIFY',
  MANAGE_ACCESS = 'MANAGE_ACCESS',
}

/**
 * Column Metadata
 */
export interface ColumnMetadata {
  name: string;
  dataType: string;
  nullable: boolean;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  description: string | null;
  tags: string[];
  classification: DataClassification;
  statistics: ColumnStatistics | null;
  sampleValues: any[];
}

/**
 * Column Statistics
 */
export interface ColumnStatistics {
  uniqueCount: number;
  nullCount: number;
  minValue: any;
  maxValue: any;
  averageValue: any;
  standardDeviation: number | null;
  distribution: Record<string, number>;
}

/**
 * Asset Relationship
 */
export interface AssetRelationship {
  id: string;
  fromAssetId: string;
  toAssetId: string;
  relationshipType: RelationshipType;
  metadata: Record<string, any>;
  createdAt: Date;
}

/**
 * Relationship Types
 */
export enum RelationshipType {
  CONTAINS = 'CONTAINS',
  DEPENDS_ON = 'DEPENDS_ON',
  DERIVES_FROM = 'DERIVES_FROM',
  REFERENCES = 'REFERENCES',
  SIMILAR_TO = 'SIMILAR_TO',
  REPLACES = 'REPLACES',
}

/**
 * Search Facet
 */
export interface SearchFacet {
  field: string;
  values: FacetValue[];
}

/**
 * Facet Value
 */
export interface FacetValue {
  value: string;
  count: number;
  selected: boolean;
}

/**
 * Search Request
 */
export interface SearchRequest {
  query: string;
  filters: SearchFilter[];
  facets: string[];
  sort: SortOption[];
  offset: number;
  limit: number;
}

/**
 * Search Filter
 */
export interface SearchFilter {
  field: string;
  operator: FilterOperator;
  value: any;
}

/**
 * Filter Operators
 */
export enum FilterOperator {
  EQUALS = 'EQUALS',
  NOT_EQUALS = 'NOT_EQUALS',
  CONTAINS = 'CONTAINS',
  STARTS_WITH = 'STARTS_WITH',
  ENDS_WITH = 'ENDS_WITH',
  IN = 'IN',
  NOT_IN = 'NOT_IN',
  GREATER_THAN = 'GREATER_THAN',
  LESS_THAN = 'LESS_THAN',
  BETWEEN = 'BETWEEN',
}

/**
 * Sort Option
 */
export interface SortOption {
  field: string;
  direction: 'ASC' | 'DESC';
}

/**
 * Search Response
 */
export interface SearchResponse {
  results: AssetMetadata[];
  facets: SearchFacet[];
  total: number;
  offset: number;
  limit: number;
  took: number;
}

/**
 * Validation Schemas
 */
export const AssetMetadataSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(AssetType),
  name: z.string(),
  displayName: z.string(),
  description: z.string().nullable(),
  fullyQualifiedName: z.string(),
  status: z.nativeEnum(AssetStatus),
  classification: z.nativeEnum(DataClassification),
  owner: z.string(),
  stewards: z.array(z.string()),
  experts: z.array(z.string()),
  tags: z.array(z.string()),
  collections: z.array(z.string()),
  domain: z.string().nullable(),
});

export const SearchRequestSchema = z.object({
  query: z.string(),
  filters: z.array(z.object({
    field: z.string(),
    operator: z.nativeEnum(FilterOperator),
    value: z.any(),
  })),
  facets: z.array(z.string()),
  sort: z.array(z.object({
    field: z.string(),
    direction: z.enum(['ASC', 'DESC']),
  })),
  offset: z.number().min(0),
  limit: z.number().min(1).max(1000),
});
