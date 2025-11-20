/**
 * Canonical Schema Base Types
 * GA-ready entity and relationship definitions aligned with Council Wishbook
 */

export enum CanonicalEntityType {
  PERSON = 'PERSON',
  ORGANIZATION = 'ORGANIZATION',
  LOCATION = 'LOCATION',
  ASSET = 'ASSET',
  ACCOUNT = 'ACCOUNT',
  EVENT = 'EVENT',
  DOCUMENT = 'DOCUMENT',
  COMMUNICATION = 'COMMUNICATION',
  DEVICE = 'DEVICE',
  VEHICLE = 'VEHICLE',
  INFRASTRUCTURE = 'INFRASTRUCTURE',
  FINANCIAL_INSTRUMENT = 'FINANCIAL_INSTRUMENT',
  INDICATOR = 'INDICATOR',
  CLAIM = 'CLAIM',
  CASE = 'CASE',
  NARRATIVE = 'NARRATIVE',
  CAMPAIGN = 'CAMPAIGN',
  LICENSE = 'LICENSE',
  AUTHORITY = 'AUTHORITY',
  SENSOR = 'SENSOR',
  RUNBOOK = 'RUNBOOK',
  EVIDENCE = 'EVIDENCE',
  HYPOTHESIS = 'HYPOTHESIS',
}

export enum SensitivityLevel {
  PUBLIC = 'PUBLIC',
  INTERNAL = 'INTERNAL',
  CONFIDENTIAL = 'CONFIDENTIAL',
  RESTRICTED = 'RESTRICTED',
  TOP_SECRET = 'TOP_SECRET',
}

export enum ClearanceLevel {
  PUBLIC = 'PUBLIC',
  AUTHORIZED = 'AUTHORIZED',
  CONFIDENTIAL = 'CONFIDENTIAL',
  SECRET = 'SECRET',
  TOP_SECRET = 'TOP_SECRET',
}

export enum RetentionClass {
  TRANSIENT = 'TRANSIENT',         // 30 days
  SHORT_TERM = 'SHORT_TERM',       // 1 year
  MEDIUM_TERM = 'MEDIUM_TERM',     // 5 years
  LONG_TERM = 'LONG_TERM',         // 10 years
  PERMANENT = 'PERMANENT',          // Indefinite
  LEGAL_HOLD = 'LEGAL_HOLD',       // Immutable until released
}

export enum VerificationStatus {
  UNVERIFIED = 'UNVERIFIED',
  PARTIAL = 'PARTIAL',
  VERIFIED = 'VERIFIED',
  DISPUTED = 'DISPUTED',
  INVALIDATED = 'INVALIDATED',
}

export interface PolicyLabels {
  origin: string;                      // Source attribution
  sensitivity: SensitivityLevel;       // Classification
  clearance: ClearanceLevel;           // Access requirement
  legalBasis: string;                  // Authority for processing
  needToKnow: string[];                // Compartmentation tags
  purposeLimitation: string[];         // Allowable uses
  retentionClass: RetentionClass;      // Lifecycle tier
}

export interface ProvenanceAssertion {
  id: string;
  timestamp: Date;
  actor: string;                       // User or service
  action: 'INGEST' | 'TRANSFORM' | 'ENRICH' | 'MERGE' | 'SPLIT' | 'VALIDATE';
  input: string[];                     // Input entity/doc IDs
  output: string[];                    // Output entity IDs
  method: string;                      // Algorithm/rule name
  parameters: Record<string, any>;     // Reproducibility params
  modelVersion?: string;               // ML model version if applicable
  confidence: number;
  evidence?: string[];                 // Supporting doc IDs
}

export interface ProvenanceChain {
  sourceId: string;                    // Originating connector/system
  assertions: ProvenanceAssertion[];   // Chain of transforms
  verificationStatus: VerificationStatus;
  trustScore: number;                  // 0.0-1.0
}

/**
 * Canonical Entity Base Type
 * All entities in Summit inherit from this base
 */
export interface CanonicalEntityBase {
  // Identity
  id: string;                          // UUID primary key
  canonicalId?: string;                // ER master entity ID
  tenantId: string;                    // Multi-tenant isolation

  // Core attributes
  type: CanonicalEntityType;           // Enum of 23 types
  label: string;                       // Display name
  description?: string;                // Human-readable description

  // Metadata
  properties: Record<string, any>;     // Type-specific properties
  customMetadata?: Record<string, any>; // User extensions

  // Provenance & Quality
  confidence: number;                  // 0.0-1.0
  source: string;                      // Source system/connector
  provenance: ProvenanceChain;         // Full lineage

  // Policy & Governance
  policyLabels: PolicyLabels;          // 7 mandatory labels

  // Temporal (Bitemporal)
  validFrom: Date;                     // Business time start
  validTo?: Date;                      // Business time end
  recordedAt: Date;                    // System time

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  version: number;                     // Optimistic locking

  // Investigation context
  investigationId?: string;            // Optional case association
  caseId?: string;                     // Optional case association
}

export enum CanonicalRelationshipType {
  // Core relationships (existing)
  CONNECTED_TO = 'CONNECTED_TO',
  OWNS = 'OWNS',
  WORKS_FOR = 'WORKS_FOR',
  LOCATED_AT = 'LOCATED_AT',
  MENTIONS = 'MENTIONS',
  COMMUNICATES_WITH = 'COMMUNICATES_WITH',
  TRANSACTED_WITH = 'TRANSACTED_WITH',
  ACCESSED = 'ACCESSED',
  CREATED = 'CREATED',
  MODIFIED = 'MODIFIED',
  RELATED_TO = 'RELATED_TO',
  MEMBER_OF = 'MEMBER_OF',
  MANAGES = 'MANAGES',
  REPORTS_TO = 'REPORTS_TO',
  SUBSIDIARY_OF = 'SUBSIDIARY_OF',
  PARTNER_OF = 'PARTNER_OF',
  COMPETITOR_OF = 'COMPETITOR_OF',
  SIMILAR_TO = 'SIMILAR_TO',

  // Evidence & provenance (NEW)
  SUPPORTS = 'SUPPORTS',               // Evidence → Claim
  CONTRADICTS = 'CONTRADICTS',         // Evidence → Claim
  DERIVED_FROM = 'DERIVED_FROM',       // Claim → Source
  CITES = 'CITES',                     // Narrative → Evidence

  // Authority & governance (NEW)
  AUTHORIZED_BY = 'AUTHORIZED_BY',     // Operation → Authority
  GOVERNED_BY = 'GOVERNED_BY',         // Entity → Policy/License
  REQUIRES = 'REQUIRES',               // Action → Clearance

  // Temporal sequences (NEW)
  PRECEDES = 'PRECEDES',               // Event → Event
  FOLLOWS = 'FOLLOWS',                 // Event → Event
  CONCURRENT_WITH = 'CONCURRENT_WITH', // Event → Event

  // Hypothesis relationships (NEW)
  EXPLAINS = 'EXPLAINS',               // Hypothesis → Observation
  ALTERNATIVE_TO = 'ALTERNATIVE_TO',   // Hypothesis → Hypothesis
  REFUTES = 'REFUTES',                 // Evidence → Hypothesis
}

/**
 * Canonical Relationship Base Type
 * All relationships in Summit inherit from this base
 */
export interface CanonicalRelationship {
  // Identity
  id: string;
  tenantId: string;

  // Relationship structure
  type: CanonicalRelationshipType;
  label?: string;
  description?: string;

  // Graph topology
  fromEntityId: string;
  toEntityId: string;
  directed: boolean;                   // True for most, false for symmetric

  // Metadata
  properties: Record<string, any>;
  customMetadata?: Record<string, any>;

  // Provenance & Quality
  confidence: number;
  source: string;
  provenance: ProvenanceChain;

  // Policy
  policyLabels: PolicyLabels;

  // Temporal
  validFrom: Date;
  validTo?: Date;
  recordedAt: Date;
  since?: Date;                        // Relationship start (business)
  until?: Date;                        // Relationship end (business)

  // Audit
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy?: string;
  version: number;

  // Context
  investigationId?: string;
  caseId?: string;
}
