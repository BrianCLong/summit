/**
 * Canonical Entities - Bitemporal Types
 *
 * Implements dual-timeline tracking:
 * - Valid time: when facts were true in reality (validFrom/validTo)
 * - Transaction time: when facts were recorded in system (observedAt/recordedAt)
 */

export interface BitemporalFields {
  /** When this version became valid in the real world */
  validFrom: Date;

  /** When this version ceased to be valid in the real world (null = current) */
  validTo: Date | null;

  /** When this fact was first observed/discovered */
  observedAt: Date;

  /** When this record was created in the database */
  recordedAt: Date;
}

/**
 * Policy & Governance Labels
 * Align with Council Wishbook
 */
export enum SensitivityLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  TOP_SECRET = 'TOP_SECRET'
}

export enum ClearanceLevel {
  PUBLIC = 'PUBLIC',
  AUTHORIZED = 'AUTHORIZED',
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET'
}

export enum RetentionClass {
  TRANSIENT = 'TRANSIENT',
  SHORT_TERM = 'SHORT_TERM',
  MEDIUM_TERM = 'MEDIUM_TERM',
  LONG_TERM = 'LONG_TERM',
  PERMANENT = 'PERMANENT',
  LEGAL_HOLD = 'LEGAL_HOLD'
}

export interface PolicyLabels {
  /** Origin of the data */
  origin: string;

  /** Sensitivity level */
  sensitivity: SensitivityLevel;

  /** Required clearance to view */
  clearance: ClearanceLevel;

  /** Legal basis for processing */
  legalBasis: string;

  /** Need-to-know categories (OR logic) */
  needToKnow: string[];

  /** Purpose limitations (what this can be used for) */
  purposeLimitation: string[];

  /** Data retention classification */
  retentionClass: RetentionClass;
}

export interface BaseCanonicalEntity extends BitemporalFields {
  /** Unique identifier for the entity */
  id: string;

  /** Multi-tenant isolation */
  tenantId: string;

  /** Version number for optimistic locking */
  version: number;

  /** User who created/modified this version */
  modifiedBy: string;

  /** Soft delete flag */
  deleted: boolean;

  /** Provenance tracking */
  provenanceId: string;

  /** Policy labels for governance */
  policyLabels: PolicyLabels;
}

export interface EntityVersion<T> {
  entity: T;
  validPeriod: {
    from: Date;
    to: Date | null;
  };
  recordedPeriod: {
    from: Date;
    to: Date | null;
  };
}

export interface TemporalQuery {
  /** Point in time for valid time dimension */
  asOf?: Date;

  /** Point in time for transaction time dimension */
  asKnownAt?: Date;

  /** Query historical versions */
  includeHistory?: boolean;
}

export interface CanonicalEntityMetadata {
  /** Entity type identifier */
  entityType: string;

  /** Schema version */
  schemaVersion: string;

  /** Classification tags */
  classifications: string[];

  /** Custom metadata */
  metadata: Record<string, any>;
}

/**
 * Helper to check if an entity is valid at a specific point in time
 */
export function isValidAt(entity: BitemporalFields, asOf: Date): boolean {
  return (
    entity.validFrom <= asOf &&
    (entity.validTo === null || entity.validTo > asOf)
  );
}

/**
 * Helper to check if an entity was known at a specific point in time
 */
export function wasKnownAt(entity: BitemporalFields, asKnownAt: Date): boolean {
  return entity.recordedAt <= asKnownAt;
}

/**
 * Filter entities by temporal constraints
 */
export function filterByTemporal<T extends BitemporalFields>(
  entities: T[],
  query: TemporalQuery,
): T[] {
  let filtered = entities;

  if (query.asOf) {
    filtered = filtered.filter(e => isValidAt(e, query.asOf!));
  }

  if (query.asKnownAt) {
    filtered = filtered.filter(e => wasKnownAt(e, query.asKnownAt!));
  }

  return filtered;
}
