export interface FusionEntity {
  id: string;
  label: string;
  type: string;
  description?: string;
  confidence: number;
}

export interface FusionRelationship {
  sourceId: string;
  targetId: string;
  type: string;
  description?: string;
  confidence: number;
}

export interface ExtractionResult {
  entities: FusionEntity[];
  relationships: FusionRelationship[];
}

export interface IngestResult {
  mediaSourceId: string;
  entityCount: number;
  relationshipCount: number;
  vectorId?: string;
}

export interface SearchResult {
  id: string;
  score: number;
  source: 'vector' | 'graph' | 'hybrid';
  content: string;
  metadata: Record<string, any>;
  entity?: FusionEntity;
}

export type IngestStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
