/**
 * Intelligence Platform API Contract
 *
 * Cross-domain contract for intelligence operations.
 * Enforced by Interface Spine (LAW-ASP).
 *
 * Implementer: intelligence-platform domain
 * Consumers: agent-orchestration, knowledge-graph, frontend-platform
 */

export interface IntelligenceAPI {
  /**
   * Query intelligence data
   */
  query(request: IntelQuery): Promise<IntelResult>;

  /**
   * Enrich entity with intelligence
   */
  enrich(entityId: string, options?: EnrichmentOptions): Promise<EnrichedEntity>;

  /**
   * Analyze intelligence context
   */
  analyze(context: AnalysisContext): Promise<Analysis>;

  /**
   * Search intelligence corpus
   */
  search(query: SearchQuery): Promise<SearchResult>;
}

// Query Types
export interface IntelQuery {
  type: 'entity' | 'relationship' | 'pattern' | 'threat';
  filters: QueryFilter[];
  timeRange?: TimeRange;
  limit?: number;
  offset?: number;
}

export interface QueryFilter {
  field: string;
  operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'contains' | 'matches';
  value: unknown;
}

export interface TimeRange {
  start: string; // ISO 8601
  end: string;   // ISO 8601
}

// Result Types
export interface IntelResult {
  entities: Entity[];
  relationships: Relationship[];
  patterns: Pattern[];
  confidence: number;
  evidence: Evidence[];
  metadata: ResultMetadata;
}

export interface Entity {
  id: string;
  type: EntityType;
  attributes: Record<string, unknown>;
  labels?: string[];
  confidence: number;
}

export type EntityType =
  | 'person'
  | 'organization'
  | 'location'
  | 'event'
  | 'document'
  | 'threat-actor'
  | 'malware'
  | 'vulnerability';

export interface Relationship {
  id: string;
  from: string;
  to: string;
  type: string;
  attributes?: Record<string, unknown>;
  confidence: number;
}

export interface Pattern {
  id: string;
  type: string;
  description: string;
  confidence: number;
  instances: PatternInstance[];
}

export interface PatternInstance {
  entities: string[];
  timestamp: string;
  context: Record<string, unknown>;
}

// Enrichment Types
export interface EnrichmentOptions {
  sources?: string[];
  depth?: number;
  includeRelationships?: boolean;
}

export interface EnrichedEntity extends Entity {
  enrichment: {
    sources: string[];
    relationships: Relationship[];
    additionalAttributes: Record<string, unknown>;
    confidence: number;
  };
}

// Analysis Types
export interface AnalysisContext {
  entities?: string[];
  relationships?: string[];
  timeRange?: TimeRange;
  analysisType: AnalysisType;
  parameters?: Record<string, unknown>;
}

export type AnalysisType =
  | 'threat-assessment'
  | 'network-analysis'
  | 'temporal-analysis'
  | 'behavioral-analysis'
  | 'causal-inference';

export interface Analysis {
  id: string;
  type: AnalysisType;
  findings: Finding[];
  recommendations: Recommendation[];
  confidence: number;
  evidence: Evidence[];
  metadata: AnalysisMetadata;
}

export interface Finding {
  id: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  evidence: string[];
}

export interface Recommendation {
  id: string;
  action: string;
  priority: 'low' | 'medium' | 'high';
  rationale: string;
}

// Search Types
export interface SearchQuery {
  text?: string;
  filters?: QueryFilter[];
  semantic?: boolean;
  limit?: number;
}

export interface SearchResult {
  results: SearchHit[];
  totalCount: number;
  query: SearchQuery;
}

export interface SearchHit {
  id: string;
  type: EntityType;
  score: number;
  highlights: string[];
  entity: Entity;
}

// Common Types
export interface Evidence {
  id: string;
  type: 'document' | 'observation' | 'signal' | 'inference';
  content: unknown;
  confidence: number;
  provenance: Provenance;
}

export interface Provenance {
  source: string;
  method: string;
  timestamp: string;
  agent?: string;
}

export interface ResultMetadata {
  queryTime: number;
  resultCount: number;
  totalCount?: number;
  cached: boolean;
}

export interface AnalysisMetadata {
  analysisTime: number;
  algorithmsUsed: string[];
  dataSourcesUsed: string[];
  version: string;
}
