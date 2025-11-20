/**
 * Entity resolution types
 */

export interface Entity {
  id: string;
  type: EntityType;
  text: string;
  attributes: Record<string, any>;
  confidence: number;
  source?: string;
  position?: {
    start: number;
    end: number;
  };
  context?: string;
  metadata?: EntityMetadata;
}

export interface EntityMetadata {
  extractedAt?: Date;
  language?: string;
  model?: string;
  version?: string;
  source?: string;
}

export enum EntityType {
  PERSON = 'PERSON',
  ORGANIZATION = 'ORGANIZATION',
  LOCATION = 'LOCATION',
  DATE = 'DATE',
  TIME = 'TIME',
  MONEY = 'MONEY',
  PERCENT = 'PERCENT',
  EMAIL = 'EMAIL',
  PHONE = 'PHONE',
  URL = 'URL',
  IP_ADDRESS = 'IP_ADDRESS',
  PRODUCT = 'PRODUCT',
  EVENT = 'EVENT',
  CUSTOM = 'CUSTOM'
}

export interface EntityMatch {
  entity1: Entity;
  entity2: Entity;
  score: number;
  confidence: number;
  method: MatchingMethod;
  reasons: string[];
}

export enum MatchingMethod {
  EXACT = 'EXACT',
  FUZZY = 'FUZZY',
  PHONETIC = 'PHONETIC',
  SEMANTIC = 'SEMANTIC',
  PROBABILISTIC = 'PROBABILISTIC',
  ML_BASED = 'ML_BASED'
}

export interface EntityCluster {
  id: string;
  canonicalEntity: Entity;
  members: Entity[];
  confidence: number;
  method: ClusteringMethod;
}

export enum ClusteringMethod {
  HIERARCHICAL = 'HIERARCHICAL',
  CONNECTED_COMPONENTS = 'CONNECTED_COMPONENTS',
  COMMUNITY_DETECTION = 'COMMUNITY_DETECTION',
  ML_CLUSTERING = 'ML_CLUSTERING'
}

export interface ExtractionResult {
  entities: Entity[];
  text: string;
  language?: string;
  metadata: {
    extractionTime: number;
    entityCount: number;
    model: string;
  };
}

export interface ResolutionResult {
  entity: Entity;
  matches: EntityMatch[];
  cluster?: EntityCluster;
  recommendations: RecommendationAction[];
}

export enum RecommendationAction {
  AUTO_MERGE = 'AUTO_MERGE',
  REVIEW_MERGE = 'REVIEW_MERGE',
  KEEP_SEPARATE = 'KEEP_SEPARATE',
  NEEDS_DISAMBIGUATION = 'NEEDS_DISAMBIGUATION'
}

export interface BlockingStrategy {
  type: 'phonetic' | 'ngram' | 'prefix' | 'sorted_neighborhood' | 'custom';
  config: Record<string, any>;
}

export interface MatchingConfig {
  threshold: number;
  methods: MatchingMethod[];
  weights?: Record<MatchingMethod, number>;
  blockingStrategy?: BlockingStrategy;
}

export interface DeduplicationConfig {
  autoMergeThreshold: number;
  reviewThreshold: number;
  clusteringMethod: ClusteringMethod;
  preserveProvenance: boolean;
}

export interface EntityExtractionConfig {
  language?: string;
  types?: EntityType[];
  customPatterns?: RegExp[];
  confidenceThreshold?: number;
  includeContext?: boolean;
}

export interface FuzzyMatchOptions {
  algorithm: 'levenshtein' | 'jaro_winkler' | 'hamming' | 'cosine';
  threshold: number;
  caseSensitive?: boolean;
  normalizeWhitespace?: boolean;
}

export interface SemanticMatchOptions {
  model: string;
  threshold: number;
  useContextEmbedding?: boolean;
}

export interface RecordLinkageFeatures {
  exactMatch: number;
  fuzzyMatch: number;
  phoneticMatch: number;
  semanticSimilarity: number;
  attributeOverlap: number;
  contextSimilarity: number;
  temporalProximity: number;
  spatialProximity: number;
}
