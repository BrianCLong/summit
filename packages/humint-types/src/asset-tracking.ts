/**
 * HUMINT Asset Tracking Types
 *
 * Types and schemas for tracking HUMINT assets and their integration
 * with the knowledge graph.
 */

import { z } from 'zod';
import type {
  SourceType,
  SourceStatus,
  RiskLevel,
  ClassificationLevel,
  HumintRelationshipType,
} from './constants.js';
import type { PolicyLabels } from './types.js';
import {
  PolicyLabelsSchema,
  RiskLevelSchema,
  SourceStatusSchema,
} from './schemas.js';

// ============================================================================
// Asset Tracking Types
// ============================================================================

/**
 * Geographic location with uncertainty
 */
export interface GeoLocation {
  latitude: number;
  longitude: number;
  altitude?: number;
  accuracy: number; // meters
  timestamp: Date;
  source: 'GPS' | 'CELL' | 'WIFI' | 'MANUAL' | 'REPORTED';
}

/**
 * Movement pattern analysis
 */
export interface MovementPattern {
  id: string;
  sourceId: string;
  patternType: 'ROUTINE' | 'ANOMALY' | 'TRAVEL' | 'STATIONARY';
  locations: GeoLocation[];
  timeRange: {
    start: Date;
    end: Date;
  };
  confidence: number;
  analysis: string;
  alerts: string[];
}

/**
 * Asset activity event
 */
export interface AssetActivity {
  id: string;
  sourceId: string;
  activityType:
    | 'CONTACT'
    | 'TRAVEL'
    | 'MEETING'
    | 'COMMUNICATION'
    | 'DOCUMENT_ACCESS'
    | 'FINANCIAL'
    | 'OPERATIONAL';
  timestamp: Date;
  duration?: number; // minutes
  location?: GeoLocation;
  participants: string[];
  description: string;
  classification: ClassificationLevel;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'DISPUTED';
  relatedDebriefId?: string;
  linkedEntityIds: string[];
}

/**
 * Risk indicator for asset
 */
export interface RiskIndicator {
  id: string;
  sourceId: string;
  indicatorType:
    | 'BEHAVIORAL'
    | 'COMMUNICATION'
    | 'FINANCIAL'
    | 'TRAVEL'
    | 'COUNTERINTEL'
    | 'OPERATIONAL';
  severity: RiskLevel;
  description: string;
  detectedAt: Date;
  detectionMethod: 'AUTOMATED' | 'HANDLER' | 'ANALYST' | 'EXTERNAL';
  status: 'ACTIVE' | 'MITIGATED' | 'DISMISSED' | 'ESCALATED';
  mitigationActions: string[];
  resolvedAt?: Date;
  resolvedBy?: string;
}

/**
 * Asset relationship to knowledge graph entity
 */
export interface AssetGraphLink {
  id: string;
  sourceId: string;
  entityId: string;
  entityType: string;
  relationshipType: HumintRelationshipType;
  direction: 'OUTBOUND' | 'INBOUND' | 'BIDIRECTIONAL';
  strength: number; // 0-100
  confidence: number; // 0-100
  validFrom: Date;
  validTo?: Date;
  properties: Record<string, unknown>;
  lastVerified?: Date;
  createdAt: Date;
  createdBy: string;
}

/**
 * Asset network analysis node
 */
export interface NetworkNode {
  id: string;
  type: 'SOURCE' | 'PERSON' | 'ORGANIZATION' | 'LOCATION';
  label: string;
  properties: Record<string, unknown>;
  centrality: number;
  cluster?: string;
}

/**
 * Asset network analysis edge
 */
export interface NetworkEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  properties: Record<string, unknown>;
}

/**
 * Network analysis result
 */
export interface NetworkAnalysis {
  id: string;
  sourceId: string;
  analysisType:
    | 'FIRST_DEGREE'
    | 'SECOND_DEGREE'
    | 'FULL_NETWORK'
    | 'PATH_ANALYSIS';
  nodes: NetworkNode[];
  edges: NetworkEdge[];
  metrics: {
    nodeCount: number;
    edgeCount: number;
    density: number;
    averageCentrality: number;
    clusters: number;
  };
  insights: string[];
  generatedAt: Date;
  expiresAt: Date;
}

/**
 * Timeline event for asset history
 */
export interface TimelineEvent {
  id: string;
  sourceId: string;
  eventType: string;
  timestamp: Date;
  title: string;
  description: string;
  significance: 'HIGH' | 'MEDIUM' | 'LOW';
  linkedIds: string[];
  metadata: Record<string, unknown>;
}

/**
 * Asset tracking dashboard data
 */
export interface AssetDashboard {
  sourceId: string;
  sourceCryptonym: string;
  status: SourceStatus;
  riskLevel: RiskLevel;
  credibilityScore: number;
  lastContact: Date | null;
  nextScheduledContact: Date | null;
  activeIndicators: number;
  recentActivities: AssetActivity[];
  upcomingDebriefs: {
    id: string;
    scheduledAt: Date;
    type: string;
  }[];
  graphConnections: {
    persons: number;
    organizations: number;
    locations: number;
    total: number;
  };
  recentIntelligence: {
    id: string;
    topic: string;
    date: Date;
    rating: string;
  }[];
  alerts: {
    id: string;
    severity: RiskLevel;
    message: string;
    timestamp: Date;
  }[];
}

/**
 * Bulk asset tracking query
 */
export interface AssetTrackingQuery {
  sourceIds?: string[];
  statuses?: SourceStatus[];
  riskLevels?: RiskLevel[];
  hasActiveIndicators?: boolean;
  lastContactBefore?: Date;
  lastContactAfter?: Date;
  areaOfOperation?: string[];
  handlerId?: string;
  includeActivities?: boolean;
  includeGraphLinks?: boolean;
  includeRiskIndicators?: boolean;
  limit?: number;
  offset?: number;
}

/**
 * Asset tracking result with aggregations
 */
export interface AssetTrackingResult {
  assets: AssetDashboard[];
  total: number;
  aggregations: {
    byStatus: Record<string, number>;
    byRiskLevel: Record<string, number>;
    overdueContact: number;
    activeAlerts: number;
  };
}

// ============================================================================
// Asset Tracking Schemas
// ============================================================================

export const GeoLocationSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  altitude: z.number().optional(),
  accuracy: z.number().positive(),
  timestamp: z.coerce.date(),
  source: z.enum(['GPS', 'CELL', 'WIFI', 'MANUAL', 'REPORTED']),
});

export const AssetActivitySchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  activityType: z.enum([
    'CONTACT',
    'TRAVEL',
    'MEETING',
    'COMMUNICATION',
    'DOCUMENT_ACCESS',
    'FINANCIAL',
    'OPERATIONAL',
  ]),
  timestamp: z.coerce.date(),
  duration: z.number().int().positive().optional(),
  location: GeoLocationSchema.optional(),
  participants: z.array(z.string()),
  description: z.string().min(1).max(5000),
  classification: z.enum([
    'UNCLASSIFIED',
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
    'TOP_SECRET_SCI',
  ]),
  verificationStatus: z.enum(['UNVERIFIED', 'VERIFIED', 'DISPUTED']),
  relatedDebriefId: z.string().uuid().optional(),
  linkedEntityIds: z.array(z.string().uuid()),
});

export const RiskIndicatorSchema = z.object({
  id: z.string().uuid(),
  sourceId: z.string().uuid(),
  indicatorType: z.enum([
    'BEHAVIORAL',
    'COMMUNICATION',
    'FINANCIAL',
    'TRAVEL',
    'COUNTERINTEL',
    'OPERATIONAL',
  ]),
  severity: RiskLevelSchema,
  description: z.string().min(1).max(2000),
  detectedAt: z.coerce.date(),
  detectionMethod: z.enum(['AUTOMATED', 'HANDLER', 'ANALYST', 'EXTERNAL']),
  status: z.enum(['ACTIVE', 'MITIGATED', 'DISMISSED', 'ESCALATED']),
  mitigationActions: z.array(z.string()),
});

export const AssetGraphLinkSchema = z.object({
  sourceId: z.string().uuid(),
  entityId: z.string().uuid(),
  entityType: z.string().min(1),
  relationshipType: z.enum([
    'REPORTS_ON',
    'HAS_ACCESS_TO',
    'HANDLES',
    'DEBRIEFED_BY',
    'DERIVED_FROM_SOURCE',
    'CORROBORATES',
    'CONTRADICTS',
    'RECRUITED_BY',
    'AFFILIATED_WITH',
    'OPERATES_IN',
    'COMPENSATED_BY',
    'TASKED_WITH',
  ]),
  direction: z.enum(['OUTBOUND', 'INBOUND', 'BIDIRECTIONAL']),
  strength: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  validFrom: z.coerce.date(),
  validTo: z.coerce.date().optional(),
  properties: z.record(z.unknown()),
});

export const CreateAssetActivitySchema = z.object({
  sourceId: z.string().uuid(),
  activityType: z.enum([
    'CONTACT',
    'TRAVEL',
    'MEETING',
    'COMMUNICATION',
    'DOCUMENT_ACCESS',
    'FINANCIAL',
    'OPERATIONAL',
  ]),
  timestamp: z.coerce.date(),
  duration: z.number().int().positive().optional(),
  location: GeoLocationSchema.optional(),
  participants: z.array(z.string()).default([]),
  description: z.string().min(1).max(5000),
  classification: z.enum([
    'UNCLASSIFIED',
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
    'TOP_SECRET_SCI',
  ]),
  relatedDebriefId: z.string().uuid().optional(),
  linkedEntityIds: z.array(z.string().uuid()).default([]),
});

export const CreateRiskIndicatorSchema = z.object({
  sourceId: z.string().uuid(),
  indicatorType: z.enum([
    'BEHAVIORAL',
    'COMMUNICATION',
    'FINANCIAL',
    'TRAVEL',
    'COUNTERINTEL',
    'OPERATIONAL',
  ]),
  severity: RiskLevelSchema,
  description: z.string().min(1).max(2000),
  detectionMethod: z.enum(['AUTOMATED', 'HANDLER', 'ANALYST', 'EXTERNAL']),
  mitigationActions: z.array(z.string()).default([]),
});

export const CreateGraphLinkSchema = z.object({
  sourceId: z.string().uuid(),
  entityId: z.string().uuid(),
  entityType: z.string().min(1),
  relationshipType: z.enum([
    'REPORTS_ON',
    'HAS_ACCESS_TO',
    'HANDLES',
    'DEBRIEFED_BY',
    'DERIVED_FROM_SOURCE',
    'CORROBORATES',
    'CONTRADICTS',
    'RECRUITED_BY',
    'AFFILIATED_WITH',
    'OPERATES_IN',
    'COMPENSATED_BY',
    'TASKED_WITH',
  ]),
  direction: z.enum(['OUTBOUND', 'INBOUND', 'BIDIRECTIONAL']),
  strength: z.number().min(0).max(100),
  confidence: z.number().min(0).max(100),
  validFrom: z.coerce.date().default(() => new Date()),
  validTo: z.coerce.date().optional(),
  properties: z.record(z.unknown()).default({}),
});

export const AssetTrackingQuerySchema = z.object({
  sourceIds: z.array(z.string().uuid()).optional(),
  statuses: z.array(SourceStatusSchema).optional(),
  riskLevels: z.array(RiskLevelSchema).optional(),
  hasActiveIndicators: z.boolean().optional(),
  lastContactBefore: z.coerce.date().optional(),
  lastContactAfter: z.coerce.date().optional(),
  areaOfOperation: z.array(z.string()).optional(),
  handlerId: z.string().uuid().optional(),
  includeActivities: z.boolean().default(false),
  includeGraphLinks: z.boolean().default(false),
  includeRiskIndicators: z.boolean().default(false),
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().nonnegative().default(0),
});

// ============================================================================
// Graph Query Builders
// ============================================================================

/**
 * Build Neo4j Cypher query for asset network
 */
export function buildNetworkQuery(
  sourceId: string,
  depth: number = 2,
  relationshipTypes?: string[],
): string {
  const relFilter = relationshipTypes?.length
    ? `:${relationshipTypes.join('|')}`
    : '';

  return `
    MATCH path = (s:HumintSource {id: $sourceId})-[r${relFilter}*1..${depth}]-(connected)
    WHERE connected:Person OR connected:Organization OR connected:Location
    WITH s, connected, relationships(path) as rels
    RETURN
      s.id as sourceId,
      collect(DISTINCT {
        id: connected.id,
        type: labels(connected)[0],
        label: connected.name,
        properties: properties(connected)
      }) as nodes,
      collect(DISTINCT {
        source: startNode(last(rels)).id,
        target: endNode(last(rels)).id,
        type: type(last(rels)),
        properties: properties(last(rels))
      }) as edges
  `;
}

/**
 * Build Neo4j Cypher query for path analysis
 */
export function buildPathQuery(
  sourceId: string,
  targetEntityId: string,
  maxHops: number = 5,
): string {
  return `
    MATCH path = shortestPath(
      (s:HumintSource {id: $sourceId})-[*1..${maxHops}]-(t {id: $targetEntityId})
    )
    RETURN
      [n IN nodes(path) | {
        id: n.id,
        type: labels(n)[0],
        label: coalesce(n.name, n.cryptonym, n.id)
      }] as pathNodes,
      [r IN relationships(path) | {
        type: type(r),
        properties: properties(r)
      }] as pathRelationships,
      length(path) as hops
  `;
}

// Export inferred types
export type CreateAssetActivityInput = z.infer<
  typeof CreateAssetActivitySchema
>;
export type CreateRiskIndicatorInput = z.infer<
  typeof CreateRiskIndicatorSchema
>;
export type CreateGraphLinkInput = z.infer<typeof CreateGraphLinkSchema>;
export type AssetTrackingQueryInput = z.infer<typeof AssetTrackingQuerySchema>;
