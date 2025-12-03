/**
 * OSINT Fusion Engine - Type Definitions
 *
 * Defines interfaces for multi-source intelligence fusion with
 * zero-trust, air-gapped data coordination support.
 */

import {
  AgentRole,
  AgentContext,
  AgentQuery,
  AgentAnalysis,
  ClassificationLevel,
  Finding,
  Insight,
} from '../archetypes/base/types';

// Extend AgentRole to include osint_fusion
export type OsintAgentRole = AgentRole | 'osint_fusion';

/**
 * OSINT Source Types
 */
export type OsintSourceType =
  | 'social_media'
  | 'domain_registry'
  | 'dark_web'
  | 'public_records'
  | 'news_media'
  | 'academic'
  | 'government'
  | 'commercial';

/**
 * Source reliability classification (NATO-style)
 */
export type SourceReliability = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/**
 * Information credibility rating
 */
export type InformationCredibility = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * OSINT Source Configuration
 */
export interface OsintSourceConfig {
  id: string;
  name: string;
  type: OsintSourceType;
  reliability: SourceReliability;
  endpoint?: string;
  apiKeyEnvVar?: string;
  rateLimit: {
    requestsPerMinute: number;
    requestsPerDay: number;
  };
  timeout: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  airgapCompatible: boolean;
  classification: ClassificationLevel;
}

/**
 * Raw data from an OSINT source
 */
export interface OsintRawData {
  sourceId: string;
  sourceType: OsintSourceType;
  timestamp: Date;
  data: Record<string, any>;
  metadata: {
    requestId: string;
    latencyMs: number;
    reliability: SourceReliability;
    credibility: InformationCredibility;
    classification: ClassificationLevel;
  };
  provenance: {
    uri: string;
    extractor: string;
    version: string;
    checksum: string;
  };
}

/**
 * Normalized entity from OSINT data
 */
export interface OsintEntity {
  id: string;
  type: OsintEntityType;
  label: string;
  description?: string;
  aliases: string[];
  attributes: Record<string, any>;
  confidence: number;
  sources: OsintSourceReference[];
  embedding?: number[];
  validationStatus: ValidationStatus;
  classification: ClassificationLevel;
  createdAt: Date;
  updatedAt: Date;
}

export type OsintEntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'event'
  | 'document'
  | 'cyber_artifact'
  | 'financial_instrument'
  | 'communication'
  | 'infrastructure';

/**
 * Source reference for traceability
 */
export interface OsintSourceReference {
  sourceId: string;
  sourceType: OsintSourceType;
  uri: string;
  timestamp: Date;
  reliability: SourceReliability;
  credibility: InformationCredibility;
  extractedAt: Date;
  checksum: string;
}

/**
 * Relationship between OSINT entities
 */
export interface OsintRelationship {
  id: string;
  type: OsintRelationshipType;
  sourceEntityId: string;
  targetEntityId: string;
  confidence: number;
  weight: number;
  attributes: Record<string, any>;
  temporalBounds?: {
    start?: Date;
    end?: Date;
  };
  sources: OsintSourceReference[];
  validationStatus: ValidationStatus;
}

export type OsintRelationshipType =
  | 'associated_with'
  | 'located_at'
  | 'member_of'
  | 'owns'
  | 'controls'
  | 'communicates_with'
  | 'transacts_with'
  | 'related_to'
  | 'alias_of'
  | 'part_of';

/**
 * Validation status for hallucination prevention
 */
export interface ValidationStatus {
  validated: boolean;
  validatedAt?: Date;
  validator: 'multi_source' | 'cross_reference' | 'temporal' | 'semantic' | 'manual';
  confidence: number;
  corroboratingSourceCount: number;
  conflictingSources: string[];
  hallucinationRisk: 'low' | 'medium' | 'high';
  notes?: string;
}

/**
 * Fusion request for combining multi-source intelligence
 */
export interface FusionRequest {
  id: string;
  query: OsintFusionQuery;
  sources: OsintSourceType[];
  context: AgentContext;
  options: FusionOptions;
}

/**
 * OSINT-specific query parameters
 */
export interface OsintFusionQuery extends AgentQuery {
  entityTypes?: OsintEntityType[];
  keywords: string[];
  geoBounds?: {
    lat: number;
    lon: number;
    radiusKm: number;
  };
  temporalBounds?: {
    start: Date;
    end: Date;
  };
  minConfidence?: number;
  maxResults?: number;
  includeRelationships?: boolean;
  traversalDepth?: number;
}

/**
 * Fusion configuration options
 */
export interface FusionOptions {
  enableHallucinationGuard: boolean;
  minCorroboratingSourceCount: number;
  confidenceThreshold: number;
  maxTraversalDepth: number;
  enableSemanticMatching: boolean;
  enableTemporalAnalysis: boolean;
  airgapMode: boolean;
  maxLatencyMs: number;
}

/**
 * Fusion result with combined intelligence
 */
export interface FusionResult {
  requestId: string;
  timestamp: Date;
  entities: OsintEntity[];
  relationships: OsintRelationship[];
  analysis: OsintAnalysis;
  metrics: FusionMetrics;
  provenance: FusionProvenance;
}

/**
 * Extended analysis for OSINT
 */
export interface OsintAnalysis extends AgentAnalysis {
  entityGraph: EntityGraphSummary;
  sourceCoverage: SourceCoverage;
  temporalPatterns: TemporalPattern[];
  riskIndicators: RiskIndicator[];
  intelligenceGaps: IntelligenceGap[];
}

/**
 * Summary of the entity graph
 */
export interface EntityGraphSummary {
  nodeCount: number;
  edgeCount: number;
  connectedComponents: number;
  density: number;
  centralEntities: Array<{
    entityId: string;
    centrality: number;
    type: OsintEntityType;
  }>;
  clusters: Array<{
    id: string;
    size: number;
    dominantType: OsintEntityType;
  }>;
}

/**
 * Source coverage metrics
 */
export interface SourceCoverage {
  sourcesQueried: OsintSourceType[];
  sourcesResponded: OsintSourceType[];
  sourcesFailed: Array<{
    source: OsintSourceType;
    reason: string;
  }>;
  dataFreshness: Record<OsintSourceType, Date>;
  reliability: Record<OsintSourceType, SourceReliability>;
}

/**
 * Temporal pattern detection
 */
export interface TemporalPattern {
  id: string;
  type: 'spike' | 'trend' | 'cyclical' | 'anomaly';
  description: string;
  startTime: Date;
  endTime?: Date;
  affectedEntities: string[];
  confidence: number;
}

/**
 * Risk indicators from OSINT analysis
 */
export interface RiskIndicator {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  affectedEntities: string[];
  evidence: any[];
  mitigations?: string[];
}

/**
 * Intelligence gaps identified during fusion
 */
export interface IntelligenceGap {
  id: string;
  description: string;
  missingSourceTypes: OsintSourceType[];
  recommendedActions: string[];
  priority: 'low' | 'medium' | 'high';
}

/**
 * Performance and quality metrics
 */
export interface FusionMetrics {
  totalLatencyMs: number;
  sourceLatencies: Record<OsintSourceType, number>;
  entitiesExtracted: number;
  entitiesValidated: number;
  validationRate: number;
  hallucinationRejections: number;
  p95LatencyMs: number;
  p99LatencyMs: number;
  cacheHitRate: number;
}

/**
 * Provenance chain for audit
 */
export interface FusionProvenance {
  requestId: string;
  timestamp: Date;
  sources: Array<{
    sourceId: string;
    sourceType: OsintSourceType;
    timestamp: Date;
    checksum: string;
    classification: ClassificationLevel;
  }>;
  transformations: Array<{
    step: string;
    timestamp: Date;
    inputChecksum: string;
    outputChecksum: string;
  }>;
  validations: Array<{
    type: string;
    timestamp: Date;
    result: boolean;
    confidence: number;
  }>;
}

/**
 * Neo4j traversal query configuration
 */
export interface GraphTraversalConfig {
  startNodeIds: string[];
  relationshipTypes?: OsintRelationshipType[];
  direction: 'outgoing' | 'incoming' | 'both';
  maxDepth: number;
  filters?: {
    entityTypes?: OsintEntityType[];
    minConfidence?: number;
    classification?: ClassificationLevel[];
  };
  aggregation?: 'none' | 'count' | 'paths' | 'subgraph';
  orderBy?: 'confidence' | 'centrality' | 'recency';
  limit?: number;
}

/**
 * Graph traversal result
 */
export interface GraphTraversalResult {
  nodes: OsintEntity[];
  edges: OsintRelationship[];
  paths: Array<{
    nodes: string[];
    edges: string[];
    totalWeight: number;
  }>;
  metrics: {
    nodesVisited: number;
    edgesTraversed: number;
    depthReached: number;
    latencyMs: number;
  };
}

/**
 * Hallucination check result
 */
export interface HallucinationCheckResult {
  entityId: string;
  isHallucinated: boolean;
  confidence: number;
  checks: Array<{
    type: 'source_count' | 'cross_reference' | 'temporal_consistency' | 'semantic_coherence';
    passed: boolean;
    details: string;
  }>;
  recommendation: 'accept' | 'review' | 'reject';
}
