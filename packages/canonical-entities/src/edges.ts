/**
 * Edge/Relationship Types for Knowledge Graph
 *
 * Defines canonical edge types with bitemporal and policy/governance fields.
 * All edges track validity periods and can enforce access control policies.
 *
 * @module canonical-entities/edges
 */

import { BitemporalFields, PolicyLabels } from './types';

// -----------------------------------------------------------------------------
// Base Edge Interface
// -----------------------------------------------------------------------------

/**
 * Relationship/Edge type discriminator
 */
export type EdgeType =
  | 'communicatesWith'
  | 'funds'
  | 'owns'
  | 'controls'
  | 'locatedAt'
  | 'observedAt'
  | 'derivedFrom'
  | 'supports'
  | 'contradicts'
  | 'mentions'
  | 'attributedTo'
  | 'partOf'
  | 'memberOf'
  | 'relatedTo'
  | 'targets'
  | 'uses'
  | 'operates'
  | 'associates'
  | 'employs'
  | 'reports';

/**
 * Base interface for all graph edges/relationships
 */
export interface GraphEdge extends BitemporalFields, PolicyLabels {
  /** Unique identifier */
  id: string;

  /** Edge type discriminator */
  type: EdgeType;

  /** Source node ID */
  fromId: string;

  /** Target node ID */
  toId: string;

  /** Confidence score for this relationship (0-1) */
  confidence: number;

  /** Edge weight (for weighted graphs) */
  weight?: number;

  /** Primary source of this edge */
  source: string;

  /** Tenant ID for multi-tenant isolation */
  tenantId: string;

  /** User ID who created this edge */
  createdBy: string;

  /** User ID who last updated this edge */
  updatedBy: string | null;

  /** System creation timestamp */
  createdAt: Date;

  /** System update timestamp */
  updatedAt: Date | null;

  /** Additional edge properties (type-specific) */
  properties: Record<string, unknown>;

  /** Tags for categorization */
  tags: string[];
}

// -----------------------------------------------------------------------------
// Specific Edge Types
// -----------------------------------------------------------------------------

/**
 * Communication edge - represents communication between entities
 */
export interface CommunicatesWithEdge extends GraphEdge {
  type: 'communicatesWith';
  properties: {
    /** Communication method */
    method?: 'email' | 'phone' | 'sms' | 'chat' | 'meeting' | 'other';
    /** Frequency (messages per time period) */
    frequency?: number;
    /** Time period for frequency */
    frequencyPeriod?: 'hour' | 'day' | 'week' | 'month';
    /** Communication direction */
    direction?: 'outbound' | 'inbound' | 'bidirectional';
    /** Last communication timestamp */
    lastCommunication?: Date;
  };
}

/**
 * Funding edge - represents financial flow
 */
export interface FundsEdge extends GraphEdge {
  type: 'funds';
  properties: {
    /** Amount */
    amount?: number;
    /** Currency */
    currency?: string;
    /** Transaction date */
    transactionDate?: Date;
    /** Transaction type */
    transactionType?: 'transfer' | 'payment' | 'loan' | 'investment' | 'donation' | 'other';
    /** Reference number */
    referenceNumber?: string;
  };
}

/**
 * Ownership edge - represents ownership relationship
 */
export interface OwnsEdge extends GraphEdge {
  type: 'owns';
  properties: {
    /** Ownership percentage */
    ownershipPercentage?: number;
    /** Ownership type */
    ownershipType?: 'full' | 'partial' | 'beneficial' | 'nominee';
    /** Acquisition date */
    acquisitionDate?: Date;
    /** Disposal date */
    disposalDate?: Date;
  };
}

/**
 * Control edge - represents control relationship
 */
export interface ControlsEdge extends GraphEdge {
  type: 'controls';
  properties: {
    /** Control type */
    controlType?: 'direct' | 'indirect' | 'voting' | 'management' | 'operational';
    /** Control level */
    controlLevel?: 'full' | 'significant' | 'minor';
    /** Legal basis */
    legalBasis?: string;
  };
}

/**
 * Location edge - represents physical presence at location
 */
export interface LocatedAtEdge extends GraphEdge {
  type: 'locatedAt';
  properties: {
    /** Location type */
    locationType?: 'residence' | 'office' | 'registered' | 'operational' | 'temporary';
    /** Address line */
    address?: string;
    /** Coordinates */
    coordinates?: {
      latitude: number;
      longitude: number;
    };
    /** Is current location */
    isCurrent?: boolean;
  };
}

/**
 * Observation edge - represents observation of an entity at an event
 */
export interface ObservedAtEdge extends GraphEdge {
  type: 'observedAt';
  properties: {
    /** Observer (entity ID) */
    observerId?: string;
    /** Observation method */
    observationMethod?: 'visual' | 'sensor' | 'inference' | 'report' | 'other';
    /** Observation quality */
    observationQuality?: 'high' | 'medium' | 'low';
  };
}

/**
 * Derivation edge - represents data lineage
 */
export interface DerivedFromEdge extends GraphEdge {
  type: 'derivedFrom';
  properties: {
    /** Derivation method */
    derivationMethod?: 'extraction' | 'inference' | 'transformation' | 'aggregation' | 'manual';
    /** Model version (if ML-derived) */
    modelVersion?: string;
    /** Transformation type */
    transformationType?: string;
  };
}

/**
 * Support edge - represents supporting evidence
 */
export interface SupportsEdge extends GraphEdge {
  type: 'supports';
  properties: {
    /** Support strength */
    supportStrength?: 'strong' | 'moderate' | 'weak';
    /** Evidence type */
    evidenceType?: string;
  };
}

/**
 * Contradiction edge - represents contradicting evidence
 */
export interface ContradictsEdge extends GraphEdge {
  type: 'contradicts';
  properties: {
    /** Contradiction severity */
    contradictionSeverity?: 'strong' | 'moderate' | 'weak';
    /** Contradiction type */
    contradictionType?: string;
  };
}

/**
 * Mention edge - represents entity mentioned in document
 */
export interface MentionsEdge extends GraphEdge {
  type: 'mentions';
  properties: {
    /** Mention count */
    mentionCount?: number;
    /** Mention sentiment */
    sentiment?: 'positive' | 'negative' | 'neutral';
    /** Character offset in document */
    characterOffset?: number;
    /** Context snippet */
    context?: string;
  };
}

/**
 * Attribution edge - represents attribution of entity to another
 */
export interface AttributedToEdge extends GraphEdge {
  type: 'attributedTo';
  properties: {
    /** Attribution confidence */
    attributionConfidence?: number;
    /** Attribution method */
    attributionMethod?: 'signature' | 'ttp' | 'infrastructure' | 'intelligence' | 'manual';
    /** First attributed date */
    firstAttributed?: Date;
  };
}

/**
 * Part-of edge - represents hierarchical relationship
 */
export interface PartOfEdge extends GraphEdge {
  type: 'partOf';
  properties: {
    /** Part type */
    partType?: 'component' | 'division' | 'subsidiary' | 'unit' | 'section';
    /** Hierarchy level */
    hierarchyLevel?: number;
  };
}

/**
 * Membership edge - represents membership in organization
 */
export interface MemberOfEdge extends GraphEdge {
  type: 'memberOf';
  properties: {
    /** Role/position */
    role?: string;
    /** Membership level */
    membershipLevel?: string;
    /** Join date */
    joinDate?: Date;
    /** Leave date */
    leaveDate?: Date;
    /** Is current member */
    isCurrent?: boolean;
  };
}

/**
 * Related-to edge - generic relationship
 */
export interface RelatedToEdge extends GraphEdge {
  type: 'relatedTo';
  properties: {
    /** Relationship nature */
    relationshipNature?: string;
    /** Relationship strength */
    relationshipStrength?: 'strong' | 'moderate' | 'weak';
  };
}

// -----------------------------------------------------------------------------
// Union Type
// -----------------------------------------------------------------------------

/**
 * Union of all specific edge types
 */
export type AnyGraphEdge =
  | CommunicatesWithEdge
  | FundsEdge
  | OwnsEdge
  | ControlsEdge
  | LocatedAtEdge
  | ObservedAtEdge
  | DerivedFromEdge
  | SupportsEdge
  | ContradictsEdge
  | MentionsEdge
  | AttributedToEdge
  | PartOfEdge
  | MemberOfEdge
  | RelatedToEdge
  | GraphEdge; // Fallback for other edge types

// -----------------------------------------------------------------------------
// Type Guards
// -----------------------------------------------------------------------------

export function isCommunicatesWithEdge(edge: GraphEdge): edge is CommunicatesWithEdge {
  return edge.type === 'communicatesWith';
}

export function isFundsEdge(edge: GraphEdge): edge is FundsEdge {
  return edge.type === 'funds';
}

export function isOwnsEdge(edge: GraphEdge): edge is OwnsEdge {
  return edge.type === 'owns';
}

export function isControlsEdge(edge: GraphEdge): edge is ControlsEdge {
  return edge.type === 'controls';
}

export function isLocatedAtEdge(edge: GraphEdge): edge is LocatedAtEdge {
  return edge.type === 'locatedAt';
}

export function isObservedAtEdge(edge: GraphEdge): edge is ObservedAtEdge {
  return edge.type === 'observedAt';
}

export function isDerivedFromEdge(edge: GraphEdge): edge is DerivedFromEdge {
  return edge.type === 'derivedFrom';
}

export function isSupportsEdge(edge: GraphEdge): edge is SupportsEdge {
  return edge.type === 'supports';
}

export function isContradictsEdge(edge: GraphEdge): edge is ContradictsEdge {
  return edge.type === 'contradicts';
}

export function isMentionsEdge(edge: GraphEdge): edge is MentionsEdge {
  return edge.type === 'mentions';
}

export function isAttributedToEdge(edge: GraphEdge): edge is AttributedToEdge {
  return edge.type === 'attributedTo';
}

export function isPartOfEdge(edge: GraphEdge): edge is PartOfEdge {
  return edge.type === 'partOf';
}

export function isMemberOfEdge(edge: GraphEdge): edge is MemberOfEdge {
  return edge.type === 'memberOf';
}

export function isRelatedToEdge(edge: GraphEdge): edge is RelatedToEdge {
  return edge.type === 'relatedTo';
}

// -----------------------------------------------------------------------------
// Graph Snapshot
// -----------------------------------------------------------------------------

/**
 * A point-in-time snapshot of the graph
 */
export interface GraphSnapshot {
  /** Snapshot timestamp */
  asOf: Date;
  /** Nodes in this snapshot */
  nodes: Array<{ id: string; type: string; [key: string]: unknown }>;
  /** Edges in this snapshot */
  edges: Array<GraphEdge>;
  /** Metadata about the snapshot */
  metadata?: {
    /** Query parameters */
    queryParams?: Record<string, unknown>;
    /** Total node count */
    nodeCount?: number;
    /** Total edge count */
    edgeCount?: number;
    /** Snapshot generation timestamp */
    generatedAt?: Date;
  };
}
