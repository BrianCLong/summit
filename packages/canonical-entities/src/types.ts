/**
 * Canonical Entity Types for Summit Platform
 *
 * Defines the 8 core entity types with bitemporal fields:
 * - Person, Organization, Asset, Location
 * - Event, Document, Claim, Case
 *
 * All entities implement the CanonicalEntity interface with:
 * - validFrom/validTo: Business validity window
 * - observedAt: When the fact was observed in the real world
 * - recordedAt: When recorded in the system (immutable)
 *
 * @module canonical-entities
 */

// -----------------------------------------------------------------------------
// Base Types
// -----------------------------------------------------------------------------

/**
 * Classification levels for data sensitivity
 */
export type ClassificationLevel =
  | 'UNCLASSIFIED'
  | 'CUI'
  | 'CONFIDENTIAL'
  | 'SECRET'
  | 'TOP_SECRET';

/**
 * Confidence score for assertions (0-1)
 */
export type Confidence = number;

/**
 * Source reference for provenance tracking
 */
export interface SourceReference {
  /** Source system identifier */
  sourceId: string;
  /** Original ID in source system */
  sourceRecordId: string;
  /** Source type (e.g., 'connector', 'manual', 'ai-extraction') */
  sourceType: string;
  /** When this was ingested from source */
  ingestedAt: Date;
  /** Hash of original source data */
  sourceHash?: string;
}

// -----------------------------------------------------------------------------
// Bitemporal Fields
// -----------------------------------------------------------------------------

/**
 * Bitemporal tracking fields for all entities
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
   * When this fact was observed/discovered.
   * This is different from when it became true.
   */
  observedAt: Date | null;

  /**
   * When this record was created in the system.
   * Immutable - set once at creation time.
   */
  recordedAt: Date;
}

// -----------------------------------------------------------------------------
// Base Entity Interface
// -----------------------------------------------------------------------------

/**
 * Base interface for all canonical entities
 */
export interface CanonicalEntity extends BitemporalFields {
  /** Unique identifier */
  id: string;

  /** Canonical ID for entity resolution (links duplicates) */
  canonicalId: string | null;

  /** Entity type discriminator */
  entityType: EntityType;

  /** Confidence score for this entity (0-1) */
  confidence: Confidence;

  /** Primary source of this entity */
  source: string;

  /** All source references */
  sources: SourceReference[];

  /** Classification level */
  classification: ClassificationLevel;

  /** Access compartments */
  compartments: string[];

  /** Investigation IDs this entity belongs to */
  investigationIds: string[];

  /** Tenant ID for multi-tenant isolation */
  tenantId: string;

  /** User ID who created this entity */
  createdBy: string;

  /** User ID who last updated this entity */
  updatedBy: string | null;

  /** System update timestamp */
  updatedAt: Date | null;

  /** Additional properties (type-specific) */
  props: Record<string, unknown>;

  /** Tags for categorization */
  tags: string[];
}

/**
 * Entity type discriminator
 */
export type EntityType =
  | 'Person'
  | 'Organization'
  | 'Asset'
  | 'Location'
  | 'Event'
  | 'Document'
  | 'Claim'
  | 'Case';

// -----------------------------------------------------------------------------
// Person Entity
// -----------------------------------------------------------------------------

export interface PersonProps {
  /** Full name */
  name: string;
  /** First/given name */
  firstName?: string;
  /** Last/family name */
  lastName?: string;
  /** Middle name(s) */
  middleName?: string;
  /** Known aliases */
  aliases?: string[];
  /** Date of birth */
  dateOfBirth?: Date;
  /** Date of death */
  dateOfDeath?: Date;
  /** Nationality/nationalities */
  nationalities?: string[];
  /** Gender */
  gender?: 'male' | 'female' | 'other' | 'unknown';
  /** Identification documents */
  identifications?: {
    type: string;
    value: string;
    issuingCountry?: string;
    expiryDate?: Date;
  }[];
  /** Contact information */
  contacts?: {
    type: 'email' | 'phone' | 'address' | 'social';
    value: string;
    isPrimary?: boolean;
  }[];
  /** Occupation/profession */
  occupation?: string;
  /** Employer */
  employer?: string;
  /** Risk indicators */
  riskIndicators?: string[];
  /** PEP (Politically Exposed Person) status */
  isPEP?: boolean;
  /** Sanctions list matches */
  sanctionsMatches?: string[];
}

export interface Person extends CanonicalEntity {
  entityType: 'Person';
  props: PersonProps;
}

// -----------------------------------------------------------------------------
// Organization Entity
// -----------------------------------------------------------------------------

export interface OrganizationProps {
  /** Legal name */
  name: string;
  /** Trading/DBA names */
  tradingNames?: string[];
  /** Organization type */
  orgType?: 'corporation' | 'llc' | 'partnership' | 'nonprofit' | 'government' | 'other';
  /** Industry/sector */
  industry?: string;
  /** Registration number */
  registrationNumber?: string;
  /** Tax identification number */
  taxId?: string;
  /** Incorporation date */
  incorporationDate?: Date;
  /** Dissolution date */
  dissolutionDate?: Date;
  /** Country of incorporation */
  incorporationCountry?: string;
  /** Headquarters location */
  headquarters?: string;
  /** Website */
  website?: string;
  /** Employee count */
  employeeCount?: number;
  /** Annual revenue */
  revenue?: {
    amount: number;
    currency: string;
    year: number;
  };
  /** Stock ticker */
  ticker?: string;
  /** LEI (Legal Entity Identifier) */
  lei?: string;
  /** Risk indicators */
  riskIndicators?: string[];
  /** Sanctions list matches */
  sanctionsMatches?: string[];
}

export interface Organization extends CanonicalEntity {
  entityType: 'Organization';
  props: OrganizationProps;
}

// -----------------------------------------------------------------------------
// Asset Entity
// -----------------------------------------------------------------------------

export interface AssetProps {
  /** Asset name/description */
  name: string;
  /** Asset type */
  assetType:
    | 'vehicle'
    | 'vessel'
    | 'aircraft'
    | 'real_estate'
    | 'financial_account'
    | 'cryptocurrency'
    | 'intellectual_property'
    | 'equipment'
    | 'other';
  /** Serial number / identifier */
  serialNumber?: string;
  /** Registration number */
  registrationNumber?: string;
  /** Estimated value */
  value?: {
    amount: number;
    currency: string;
    asOfDate: Date;
  };
  /** Location */
  location?: string;
  /** Status */
  status?: 'active' | 'inactive' | 'seized' | 'disposed' | 'unknown';
  /** Vehicle-specific */
  vehicle?: {
    make: string;
    model: string;
    year: number;
    vin?: string;
    licensePlate?: string;
    color?: string;
  };
  /** Vessel-specific */
  vessel?: {
    imo?: string;
    mmsi?: string;
    callSign?: string;
    flag?: string;
    type?: string;
    grossTonnage?: number;
  };
  /** Aircraft-specific */
  aircraft?: {
    tailNumber?: string;
    icaoCode?: string;
    manufacturer?: string;
    model?: string;
    operator?: string;
  };
  /** Financial account-specific */
  financialAccount?: {
    accountNumber?: string;
    bankName?: string;
    bankCountry?: string;
    accountType?: string;
    swift?: string;
    iban?: string;
  };
  /** Cryptocurrency-specific */
  cryptocurrency?: {
    blockchain: string;
    address: string;
    balance?: number;
    token?: string;
  };
}

export interface Asset extends CanonicalEntity {
  entityType: 'Asset';
  props: AssetProps;
}

// -----------------------------------------------------------------------------
// Location Entity
// -----------------------------------------------------------------------------

export interface LocationProps {
  /** Location name */
  name: string;
  /** Location type */
  locationType:
    | 'address'
    | 'city'
    | 'region'
    | 'country'
    | 'coordinates'
    | 'facility'
    | 'port'
    | 'airport'
    | 'other';
  /** Full address */
  address?: {
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country: string;
  };
  /** Coordinates */
  coordinates?: {
    latitude: number;
    longitude: number;
    altitude?: number;
    accuracy?: number;
  };
  /** Geohash for efficient spatial queries */
  geohash?: string;
  /** Timezone */
  timezone?: string;
  /** Country code (ISO 3166-1 alpha-2) */
  countryCode?: string;
  /** Administrative divisions */
  adminDivisions?: {
    level: number;
    name: string;
    code?: string;
  }[];
  /** Point of interest type */
  poiType?: string;
  /** Risk level for this location */
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export interface Location extends CanonicalEntity {
  entityType: 'Location';
  props: LocationProps;
}

// -----------------------------------------------------------------------------
// Event Entity
// -----------------------------------------------------------------------------

export interface EventProps {
  /** Event name/title */
  name: string;
  /** Event type */
  eventType: string;
  /** Event description */
  description?: string;
  /** Event start time */
  startTime: Date;
  /** Event end time */
  endTime?: Date;
  /** Duration in seconds */
  durationSeconds?: number;
  /** Location of event */
  location?: string;
  /** Severity/impact level */
  severity?: 'info' | 'low' | 'medium' | 'high' | 'critical';
  /** Status */
  status?: 'planned' | 'in_progress' | 'completed' | 'cancelled';
  /** Outcome */
  outcome?: string;
  /** Participants (entity IDs) */
  participantIds?: string[];
  /** Financial impact */
  financialImpact?: {
    amount: number;
    currency: string;
  };
  /** Related indicators */
  indicators?: string[];
}

export interface Event extends CanonicalEntity {
  entityType: 'Event';
  props: EventProps;
}

// -----------------------------------------------------------------------------
// Document Entity
// -----------------------------------------------------------------------------

export interface DocumentProps {
  /** Document title */
  title: string;
  /** Document type */
  documentType:
    | 'report'
    | 'email'
    | 'chat'
    | 'social_media'
    | 'news'
    | 'legal'
    | 'financial'
    | 'image'
    | 'video'
    | 'audio'
    | 'other';
  /** MIME type */
  mimeType?: string;
  /** File size in bytes */
  sizeBytes?: number;
  /** File hash (SHA-256) */
  hash?: string;
  /** Storage location */
  storageUrl?: string;
  /** Original filename */
  filename?: string;
  /** Document language */
  language?: string;
  /** Author/creator */
  author?: string;
  /** Creation date */
  createdDate?: Date;
  /** Last modified date */
  modifiedDate?: Date;
  /** Document text content (for search) */
  textContent?: string;
  /** Extracted entities */
  extractedEntityIds?: string[];
  /** OCR confidence (if applicable) */
  ocrConfidence?: number;
  /** Page count */
  pageCount?: number;
  /** Word count */
  wordCount?: number;
  /** Summary */
  summary?: string;
  /** Keywords */
  keywords?: string[];
  /** Sentiment */
  sentiment?: {
    score: number;
    label: 'positive' | 'negative' | 'neutral';
  };
}

export interface Document extends CanonicalEntity {
  entityType: 'Document';
  props: DocumentProps;
}

// -----------------------------------------------------------------------------
// Claim Entity
// -----------------------------------------------------------------------------

export interface ClaimProps {
  /** Claim statement */
  statement: string;
  /** Claim type */
  claimType: 'assertion' | 'allegation' | 'hypothesis' | 'fact' | 'rumor' | 'denial';
  /** Subject of the claim (entity ID) */
  subjectId?: string;
  /** Verification status */
  verificationStatus: 'unverified' | 'verified' | 'disputed' | 'refuted' | 'retracted';
  /** Supporting evidence (document/entity IDs) */
  supportingEvidence?: string[];
  /** Contradicting evidence */
  contradictingEvidence?: string[];
  /** Confidence in claim */
  claimConfidence: Confidence;
  /** Source credibility */
  sourceCredibility?: 'high' | 'medium' | 'low' | 'unknown';
  /** Date of claim */
  claimDate?: Date;
  /** Expiry date (for time-bound claims) */
  expiryDate?: Date;
  /** Attribution */
  attribution?: string;
  /** Impact assessment */
  impact?: 'high' | 'medium' | 'low';
  /** Related claims */
  relatedClaimIds?: string[];
}

export interface Claim extends CanonicalEntity {
  entityType: 'Claim';
  props: ClaimProps;
}

// -----------------------------------------------------------------------------
// Case Entity
// -----------------------------------------------------------------------------

export interface CaseProps {
  /** Case title */
  title: string;
  /** Case number/reference */
  caseNumber: string;
  /** Case type */
  caseType: string;
  /** Case description */
  description?: string;
  /** Status */
  status:
    | 'open'
    | 'in_progress'
    | 'pending_review'
    | 'escalated'
    | 'closed'
    | 'archived';
  /** Priority */
  priority: 'low' | 'medium' | 'high' | 'critical';
  /** Assigned to (user IDs) */
  assignedTo?: string[];
  /** Lead investigator */
  leadInvestigator?: string;
  /** Open date */
  openDate: Date;
  /** Close date */
  closeDate?: Date;
  /** Due date */
  dueDate?: Date;
  /** SLA status */
  slaStatus?: 'on_track' | 'at_risk' | 'breached';
  /** Related entities */
  relatedEntityIds?: string[];
  /** Key findings */
  findings?: string[];
  /** Recommendations */
  recommendations?: string[];
  /** Outcome */
  outcome?: string;
  /** Parent case (for sub-cases) */
  parentCaseId?: string;
  /** Child cases */
  childCaseIds?: string[];
  /** Tags/categories */
  categories?: string[];
  /** Estimated value at risk */
  valueAtRisk?: {
    amount: number;
    currency: string;
  };
  /** Recovered value */
  recoveredValue?: {
    amount: number;
    currency: string;
  };
}

export interface Case extends CanonicalEntity {
  entityType: 'Case';
  props: CaseProps;
}

// -----------------------------------------------------------------------------
// Union Type
// -----------------------------------------------------------------------------

/**
 * Union of all canonical entity types
 */
export type AnyCanonicalEntity =
  | Person
  | Organization
  | Asset
  | Location
  | Event
  | Document
  | Claim
  | Case;

// -----------------------------------------------------------------------------
// Type Guards
// -----------------------------------------------------------------------------

export function isPerson(entity: CanonicalEntity): entity is Person {
  return entity.entityType === 'Person';
}

export function isOrganization(entity: CanonicalEntity): entity is Organization {
  return entity.entityType === 'Organization';
}

export function isAsset(entity: CanonicalEntity): entity is Asset {
  return entity.entityType === 'Asset';
}

export function isLocation(entity: CanonicalEntity): entity is Location {
  return entity.entityType === 'Location';
}

export function isEvent(entity: CanonicalEntity): entity is Event {
  return entity.entityType === 'Event';
}

export function isDocument(entity: CanonicalEntity): entity is Document {
  return entity.entityType === 'Document';
}

export function isClaim(entity: CanonicalEntity): entity is Claim {
  return entity.entityType === 'Claim';
}

export function isCase(entity: CanonicalEntity): entity is Case {
  return entity.entityType === 'Case';
}
