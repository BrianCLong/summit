/**
 * Canonical Entity and Relationship Types for Graph Core
 *
 * This module defines the complete canonical model including:
 * - 21 Entity Types (Person, Org, Asset, Account, Location, Event, Document,
 *   Communication, Device, Vehicle, Infrastructure, FinancialInstrument,
 *   Indicator, Claim, Case, Narrative, Campaign, InfrastructureService,
 *   Sensor, Runbook, Authority, License)
 * - 30 Relationship Types covering structure, network, evidence, authority, temporal
 * - Policy Labels with 7 mandatory fields
 * - Bitemporal support (validFrom/validTo + observedAt/recordedAt)
 *
 * @module graph-core/canonical
 */

// =============================================================================
// ENUMS
// =============================================================================

/**
 * Canonical Entity Types - 21 types covering intelligence domain
 */
export enum CanonicalEntityType {
  PERSON = 'Person',
  ORGANIZATION = 'Organization',
  ASSET = 'Asset',
  ACCOUNT = 'Account',
  LOCATION = 'Location',
  EVENT = 'Event',
  DOCUMENT = 'Document',
  COMMUNICATION = 'Communication',
  DEVICE = 'Device',
  VEHICLE = 'Vehicle',
  INFRASTRUCTURE = 'Infrastructure',
  FINANCIAL_INSTRUMENT = 'FinancialInstrument',
  INDICATOR = 'Indicator',
  CLAIM = 'Claim',
  CASE = 'Case',
  NARRATIVE = 'Narrative',
  CAMPAIGN = 'Campaign',
  INFRASTRUCTURE_SERVICE = 'InfrastructureService',
  SENSOR = 'Sensor',
  RUNBOOK = 'Runbook',
  AUTHORITY = 'Authority',
  LICENSE = 'License',
}

/**
 * Canonical Relationship Types - 30 types covering all relationship patterns
 */
export enum CanonicalRelationshipType {
  // Structure (7)
  CONNECTED_TO = 'CONNECTED_TO',
  OWNS = 'OWNS',
  WORKS_FOR = 'WORKS_FOR',
  LOCATED_AT = 'LOCATED_AT',
  MEMBER_OF = 'MEMBER_OF',
  MANAGES = 'MANAGES',
  REPORTS_TO = 'REPORTS_TO',

  // Network (4)
  COMMUNICATES_WITH = 'COMMUNICATES_WITH',
  TRANSACTED_WITH = 'TRANSACTED_WITH',
  SIMILAR_TO = 'SIMILAR_TO',
  RELATED_TO = 'RELATED_TO',

  // Hierarchy (3)
  SUBSIDIARY_OF = 'SUBSIDIARY_OF',
  PARTNER_OF = 'PARTNER_OF',
  COMPETITOR_OF = 'COMPETITOR_OF',

  // Actions (4)
  ACCESSED = 'ACCESSED',
  CREATED = 'CREATED',
  MODIFIED = 'MODIFIED',
  MENTIONS = 'MENTIONS',

  // Evidence & Provenance (4)
  SUPPORTS = 'SUPPORTS',
  CONTRADICTS = 'CONTRADICTS',
  DERIVED_FROM = 'DERIVED_FROM',
  CITES = 'CITES',

  // Authority & Governance (3)
  AUTHORIZED_BY = 'AUTHORIZED_BY',
  GOVERNED_BY = 'GOVERNED_BY',
  REQUIRES = 'REQUIRES',

  // Temporal Sequences (3)
  PRECEDES = 'PRECEDES',
  FOLLOWS = 'FOLLOWS',
  CONCURRENT_WITH = 'CONCURRENT_WITH',

  // Hypothesis (3)
  EXPLAINS = 'EXPLAINS',
  ALTERNATIVE_TO = 'ALTERNATIVE_TO',
  REFUTES = 'REFUTES',
}

/**
 * Sensitivity levels for data classification
 */
export enum SensitivityLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  TOP_SECRET = 'TOP_SECRET',
}

/**
 * Clearance levels for access control
 */
export enum ClearanceLevel {
  PUBLIC = 'PUBLIC',
  AUTHORIZED = 'AUTHORIZED',
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET',
}

/**
 * Retention classes for lifecycle management
 */
export enum RetentionClass {
  TRANSIENT = 'TRANSIENT', // 30 days
  SHORT_TERM = 'SHORT_TERM', // 1 year
  MEDIUM_TERM = 'MEDIUM_TERM', // 5 years
  LONG_TERM = 'LONG_TERM', // 10 years
  PERMANENT = 'PERMANENT', // Indefinite
  LEGAL_HOLD = 'LEGAL_HOLD', // Immutable until released
}

/**
 * Verification status for provenance
 */
export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PARTIAL = 'PARTIAL',
  VERIFIED = 'VERIFIED',
  DISPUTED = 'DISPUTED',
  INVALIDATED = 'INVALIDATED',
}

/**
 * Provenance action types
 */
export enum ProvenanceAction {
  INGEST = 'INGEST',
  TRANSFORM = 'TRANSFORM',
  ENRICH = 'ENRICH',
  MERGE = 'MERGE',
  SPLIT = 'SPLIT',
  VALIDATE = 'VALIDATE',
}

// =============================================================================
// POLICY LABELS (7 Mandatory Fields)
// =============================================================================

/**
 * Policy Labels - 7 mandatory fields for governance
 *
 * Every entity and relationship MUST have these labels populated.
 * Validation rules:
 * - origin: Required, non-empty string
 * - sensitivity: Required, valid SensitivityLevel
 * - clearance: Required, valid ClearanceLevel
 * - legalBasis: Required if sensitivity > INTERNAL
 * - needToKnow: Required array (can be empty)
 * - purposeLimitation: Required array (can be empty)
 * - retentionClass: Required, valid RetentionClass
 */
export interface PolicyLabels {
  /** Source attribution - where this data originated */
  origin: string;
  /** Data classification level */
  sensitivity: SensitivityLevel;
  /** Minimum clearance required to access */
  clearance: ClearanceLevel;
  /** Legal authority for processing (required if sensitivity > INTERNAL) */
  legalBasis: string;
  /** Compartmentation tags - additional access restrictions */
  needToKnow: string[];
  /** Allowable purposes for this data */
  purposeLimitation: string[];
  /** Data lifecycle tier */
  retentionClass: RetentionClass;
}

// =============================================================================
// PROVENANCE
// =============================================================================

/**
 * Single provenance assertion in the chain
 */
export interface ProvenanceAssertion {
  /** Unique assertion ID */
  id: string;
  /** When this action occurred */
  timestamp: Date;
  /** User or service that performed the action */
  actor: string;
  /** Type of action performed */
  action: ProvenanceAction;
  /** Input entity/document IDs */
  input: string[];
  /** Output entity IDs */
  output: string[];
  /** Algorithm/rule name used */
  method: string;
  /** Parameters for reproducibility */
  parameters: Record<string, unknown>;
  /** ML model version if applicable */
  modelVersion?: string;
  /** Confidence in this assertion */
  confidence: number;
  /** Supporting document IDs */
  evidence?: string[];
}

/**
 * Full provenance chain for an entity/relationship
 */
export interface ProvenanceChain {
  /** Originating connector/system */
  sourceId: string;
  /** Chain of transformations */
  assertions: ProvenanceAssertion[];
  /** Verification status of the chain */
  verificationStatus: VerificationStatus;
  /** Overall trust score (0.0-1.0) */
  trustScore: number;
}

// =============================================================================
// BITEMPORAL FIELDS
// =============================================================================

/**
 * Bitemporal tracking for all entities and relationships
 *
 * Two temporal dimensions:
 * 1. Business time (validFrom/validTo): When the fact was true in reality
 * 2. System time (observedAt/recordedAt): When we learned about/recorded it
 */
export interface BitemporalFields {
  /**
   * When this fact became true in the real world.
   * null = unknown or from the beginning of time
   */
  validFrom: Date | null;

  /**
   * When this fact stopped being true in the real world.
   * null = still valid / current
   */
  validTo: Date | null;

  /**
   * When this fact was observed/discovered in the real world.
   * Different from when it became true.
   */
  observedAt: Date | null;

  /**
   * When this record was created in the system.
   * Immutable - set once at creation time.
   */
  recordedAt: Date;
}

// =============================================================================
// BASE ENTITY
// =============================================================================

/**
 * Base interface for all canonical entities
 */
export interface CanonicalEntityBase extends BitemporalFields {
  /** UUID primary key */
  id: string;

  /** ER master entity ID (for resolved duplicates) */
  canonicalId: string | null;

  /** Multi-tenant isolation */
  tenantId: string;

  /** Entity type discriminator */
  entityType: CanonicalEntityType;

  /** Display name */
  label: string;

  /** Human-readable description */
  description?: string;

  /** Type-specific properties */
  properties: Record<string, unknown>;

  /** User-defined extensions */
  customMetadata?: Record<string, unknown>;

  /** Confidence score (0.0-1.0) */
  confidence: number;

  /** Source system/connector */
  source: string;

  /** Full provenance chain */
  provenance: ProvenanceChain;

  /** 7 mandatory policy labels */
  policyLabels: PolicyLabels;

  /** Audit: creation timestamp */
  createdAt: Date;

  /** Audit: last update timestamp */
  updatedAt: Date;

  /** Audit: creator user ID */
  createdBy: string;

  /** Audit: last updater user ID */
  updatedBy?: string;

  /** Optimistic locking version */
  version: number;

  /** Tags for categorization */
  tags: string[];

  /** Investigation context */
  investigationId?: string;

  /** Case association */
  caseId?: string;
}

// =============================================================================
// BASE RELATIONSHIP
// =============================================================================

/**
 * Base interface for all canonical relationships
 */
export interface CanonicalRelationshipBase extends BitemporalFields {
  /** UUID primary key */
  id: string;

  /** Multi-tenant isolation */
  tenantId: string;

  /** Relationship type */
  type: CanonicalRelationshipType;

  /** Optional display label */
  label?: string;

  /** Human-readable description */
  description?: string;

  /** Source entity ID */
  fromEntityId: string;

  /** Target entity ID */
  toEntityId: string;

  /** Whether the relationship is directed */
  directed: boolean;

  /** Relationship weight/strength */
  weight?: number;

  /** Relationship-specific properties */
  properties: Record<string, unknown>;

  /** User-defined extensions */
  customMetadata?: Record<string, unknown>;

  /** Confidence score (0.0-1.0) */
  confidence: number;

  /** Source system/connector */
  source: string;

  /** Full provenance chain */
  provenance: ProvenanceChain;

  /** 7 mandatory policy labels */
  policyLabels: PolicyLabels;

  /** Business start of relationship */
  since?: Date;

  /** Business end of relationship */
  until?: Date;

  /** Audit: creation timestamp */
  createdAt: Date;

  /** Audit: last update timestamp */
  updatedAt: Date;

  /** Audit: creator user ID */
  createdBy: string;

  /** Audit: last updater user ID */
  updatedBy?: string;

  /** Optimistic locking version */
  version: number;

  /** Investigation context */
  investigationId?: string;

  /** Case association */
  caseId?: string;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all entity type values as array
 */
export function getAllEntityTypes(): CanonicalEntityType[] {
  return Object.values(CanonicalEntityType);
}

/**
 * Get all relationship type values as array
 */
export function getAllRelationshipTypes(): CanonicalRelationshipType[] {
  return Object.values(CanonicalRelationshipType);
}

/**
 * Check if a string is a valid entity type
 */
export function isValidEntityType(type: string): type is CanonicalEntityType {
  return Object.values(CanonicalEntityType).includes(type as CanonicalEntityType);
}

/**
 * Check if a string is a valid relationship type
 */
export function isValidRelationshipType(
  type: string
): type is CanonicalRelationshipType {
  return Object.values(CanonicalRelationshipType).includes(
    type as CanonicalRelationshipType
  );
}

/**
 * Get clearance level hierarchy (higher index = higher clearance)
 */
export function getClearanceHierarchy(): ClearanceLevel[] {
  return [
    ClearanceLevel.PUBLIC,
    ClearanceLevel.AUTHORIZED,
    ClearanceLevel.CONFIDENTIAL,
    ClearanceLevel.SECRET,
    ClearanceLevel.TOP_SECRET,
  ];
}

/**
 * Compare two clearance levels
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
export function compareClearance(a: ClearanceLevel, b: ClearanceLevel): number {
  const hierarchy = getClearanceHierarchy();
  return hierarchy.indexOf(a) - hierarchy.indexOf(b);
}

/**
 * Get sensitivity level hierarchy (higher index = more sensitive)
 */
export function getSensitivityHierarchy(): SensitivityLevel[] {
  return [
    SensitivityLevel.PUBLIC,
    SensitivityLevel.INTERNAL,
    SensitivityLevel.CONFIDENTIAL,
    SensitivityLevel.RESTRICTED,
    SensitivityLevel.TOP_SECRET,
  ];
}

/**
 * Compare two sensitivity levels
 * Returns: negative if a < b, 0 if equal, positive if a > b
 */
export function compareSensitivity(
  a: SensitivityLevel,
  b: SensitivityLevel
): number {
  const hierarchy = getSensitivityHierarchy();
  return hierarchy.indexOf(a) - hierarchy.indexOf(b);
}

/**
 * Check if sensitivity requires legal basis
 * Legal basis is required for sensitivity > INTERNAL
 */
export function requiresLegalBasis(sensitivity: SensitivityLevel): boolean {
  return compareSensitivity(sensitivity, SensitivityLevel.INTERNAL) > 0;
}
