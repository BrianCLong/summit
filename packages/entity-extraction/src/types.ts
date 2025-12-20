/**
 * Entity extraction types
 */

export type EntityType =
  | 'PERSON'
  | 'ORGANIZATION'
  | 'LOCATION'
  | 'DATE'
  | 'TIME'
  | 'MONEY'
  | 'PERCENT'
  | 'PRODUCT'
  | 'EVENT'
  | 'WEAPON'
  | 'VEHICLE'
  | 'FACILITY'
  | 'GPE' // Geo-Political Entity
  | 'NORP' // Nationalities, Religious or Political groups
  | 'LAW'
  | 'LANGUAGE'
  | 'WORK_OF_ART'
  | 'CUSTOM';

export interface Entity {
  text: string;
  type: EntityType;
  start: number;
  end: number;
  confidence: number;
  metadata?: Record<string, any>;
  normalized?: string;
  linkedId?: string; // Knowledge base ID
  disambiguationScore?: number;
}

export interface NestedEntity extends Entity {
  children?: Entity[];
  parent?: string;
}

export interface EntityMention {
  entity: Entity;
  sentence: string;
  sentenceIndex: number;
  context: string;
}

export interface EntityCluster {
  canonical: Entity;
  mentions: Entity[];
  confidence: number;
}

export interface CoreferenceChain {
  entities: Entity[];
  representativeIndex: number;
  confidence: number;
}

export interface KnowledgeBaseLink {
  entityId: string;
  entityName: string;
  entityType: EntityType;
  source: string; // e.g., 'wikidata', 'dbpedia'
  url?: string;
  confidence: number;
  properties?: Record<string, any>;
}

export interface NEROptions {
  language?: string;
  customTypes?: string[];
  minConfidence?: number;
  includeNested?: boolean;
  includeDates?: boolean;
  resolveEntities?: boolean;
  linkToKnowledgeBase?: boolean;
}

export interface DisambiguationOptions {
  contextWindow?: number;
  useCooccurrence?: boolean;
  useSemanticSimilarity?: boolean;
  minConfidence?: number;
}
