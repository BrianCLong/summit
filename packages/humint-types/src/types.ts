/**
 * HUMINT Source Management Types
 *
 * Core TypeScript interfaces for HUMINT operations.
 */

import type {
  SourceType,
  SourceStatus,
  CredibilityRating,
  InformationRating,
  AccessType,
  RiskLevel,
  ClassificationLevel,
  HandlingCaveat,
  HumintRelationshipType,
} from './constants.js';

/**
 * Base entity interface with common fields
 */
export interface BaseEntity {
  id: string;
  tenantId: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  updatedBy: string;
  version: number;
}

/**
 * Policy labels for security and compliance
 */
export interface PolicyLabels {
  classification: ClassificationLevel;
  caveats: HandlingCaveat[];
  releasableTo: string[];
  originatorControl: boolean;
  legalBasis: string;
  needToKnow: string[];
  retentionPeriod: number; // days
  expirationDate?: Date;
}

/**
 * Provenance information for audit trail
 */
export interface ProvenanceInfo {
  sourceId: string;
  method: string;
  timestamp: Date;
  actor: string;
  action: string;
  evidence: string[];
  confidence: number;
}

/**
 * Contact method for secure communications
 */
export interface ContactMethod {
  id: string;
  type: 'SECURE_PHONE' | 'DEAD_DROP' | 'BRUSH_PASS' | 'SIGNAL' | 'EMAIL' | 'IN_PERSON' | 'VIRTUAL';
  identifier: string;
  protocol: string;
  scheduleWindow?: {
    timezone: string;
    dayOfWeek: number[];
    startHour: number;
    endHour: number;
  };
  isActive: boolean;
  lastUsed?: Date;
}

/**
 * Cover identity for the source
 */
export interface CoverIdentity {
  id: string;
  alias: string;
  documentation: string[];
  backstory: string;
  validFrom: Date;
  validTo?: Date;
  isCompromised: boolean;
}

/**
 * Access capability of the source
 */
export interface AccessCapability {
  type: AccessType;
  target: string;
  targetType: 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'SYSTEM' | 'DOCUMENT';
  level: 'FULL' | 'PARTIAL' | 'LIMITED' | 'HISTORICAL';
  validFrom: Date;
  validTo?: Date;
  reliability: number; // 0-100
  lastVerified?: Date;
}

/**
 * HUMINT Source - Core entity representing a human intelligence source
 */
export interface HumintSource extends BaseEntity {
  /** Cryptonym/code name for the source */
  cryptonym: string;

  /** Type of source relationship */
  sourceType: SourceType;

  /** Current operational status */
  status: SourceStatus;

  /** Handler responsible for the source */
  handlerId: string;

  /** Alternate handler for emergencies */
  alternateHandlerId?: string;

  /** Credibility rating (A-F) */
  credibilityRating: CredibilityRating;

  /** Running credibility score (0-100) */
  credibilityScore: number;

  /** Historical credibility trend */
  credibilityTrend: 'IMPROVING' | 'STABLE' | 'DECLINING';

  /** Operational risk level */
  riskLevel: RiskLevel;

  /** Primary geographic area of operation */
  areaOfOperation: string[];

  /** Intelligence topics/areas of access */
  topicalAccess: string[];

  /** Detailed access capabilities */
  accessCapabilities: AccessCapability[];

  /** Approved contact methods */
  contactMethods: ContactMethod[];

  /** Cover identities */
  coverIdentities: CoverIdentity[];

  /** Date of initial recruitment */
  recruitmentDate: Date;

  /** Date of last contact */
  lastContactDate?: Date;

  /** Next scheduled contact */
  nextScheduledContact?: Date;

  /** Total number of debriefs conducted */
  totalDebriefs: number;

  /** Count of intelligence reports produced */
  intelligenceReportsCount: number;

  /** Count of actionable intelligence items */
  actionableIntelCount: number;

  /** Languages spoken */
  languages: string[];

  /** Special skills or access */
  specialCapabilities: string[];

  /** Compensation arrangement */
  compensation: {
    type: 'SALARY' | 'STIPEND' | 'PER_REPORT' | 'EXPENSES_ONLY' | 'NONE';
    amount?: number;
    currency?: string;
    frequency?: 'MONTHLY' | 'QUARTERLY' | 'PER_MEETING' | 'AD_HOC';
  };

  /** Motivation factors */
  motivationFactors: string[];

  /** Vulnerabilities and concerns */
  vulnerabilities: string[];

  /** Security classification */
  policyLabels: PolicyLabels;

  /** Linked person entity in knowledge graph */
  personEntityId?: string;

  /** Notes and observations */
  notes: string;

  /** Provenance chain */
  provenance: ProvenanceInfo[];

  /** Bitemporal support */
  validFrom: Date;
  validTo?: Date;
}

/**
 * Handler - Intelligence officer managing sources
 */
export interface Handler extends BaseEntity {
  name: string;
  employeeId: string;
  clearanceLevel: ClassificationLevel;
  activeSourceCount: number;
  maxSourceCapacity: number;
  specializations: string[];
  languages: string[];
  region: string;
  supervisorId: string;
  isActive: boolean;
}

/**
 * Intelligence requirement for tasking
 */
export interface IntelligenceRequirement {
  id: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  topic: string;
  description: string;
  targetEntities: string[];
  deadline?: Date;
  requestorId: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'SATISFIED' | 'EXPIRED' | 'CANCELLED';
  createdAt: Date;
}

/**
 * Tasking assignment to a source
 */
export interface SourceTasking extends BaseEntity {
  sourceId: string;
  requirementId: string;
  handlerId: string;
  taskDescription: string;
  priority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  deadline?: Date;
  status: 'ASSIGNED' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'CANCELLED';
  completedAt?: Date;
  result?: string;
  policyLabels: PolicyLabels;
}

/**
 * Corroboration record between sources
 */
export interface CorroborationRecord {
  id: string;
  primarySourceId: string;
  corroboratingSourceId: string;
  intelligenceId: string;
  corroborationType: 'CONFIRMS' | 'PARTIALLY_CONFIRMS' | 'CONTRADICTS' | 'UNRELATED';
  confidence: number;
  notes: string;
  evaluatedBy: string;
  evaluatedAt: Date;
}

/**
 * Source relationship for graph integration
 */
export interface SourceRelationship {
  id: string;
  type: HumintRelationshipType;
  fromId: string;
  fromType: 'SOURCE' | 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'INTEL';
  toId: string;
  toType: 'SOURCE' | 'PERSON' | 'ORGANIZATION' | 'LOCATION' | 'INTEL';
  properties: Record<string, unknown>;
  confidence: number;
  validFrom: Date;
  validTo?: Date;
  createdAt: Date;
  createdBy: string;
}

/**
 * Audit event for source operations
 */
export interface SourceAuditEvent {
  id: string;
  sourceId: string;
  eventType: string;
  actorId: string;
  timestamp: Date;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Source search/filter criteria
 */
export interface SourceSearchCriteria {
  cryptonym?: string;
  sourceTypes?: SourceType[];
  statuses?: SourceStatus[];
  handlerId?: string;
  minCredibilityScore?: number;
  maxCredibilityScore?: number;
  credibilityRatings?: CredibilityRating[];
  riskLevels?: RiskLevel[];
  areasOfOperation?: string[];
  topicalAccess?: string[];
  languages?: string[];
  hasRecentContact?: boolean;
  recentContactDays?: number;
  classification?: ClassificationLevel;
  limit?: number;
  offset?: number;
  sortBy?: 'cryptonym' | 'credibilityScore' | 'lastContactDate' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Source statistics summary
 */
export interface SourceStatistics {
  totalSources: number;
  byStatus: Record<SourceStatus, number>;
  byType: Record<SourceType, number>;
  byCredibility: Record<CredibilityRating, number>;
  byRiskLevel: Record<RiskLevel, number>;
  averageCredibilityScore: number;
  dormantCount: number;
  overduContactCount: number;
  totalIntelReports: number;
  totalActionableIntel: number;
}
