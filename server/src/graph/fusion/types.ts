import { EntityType, EdgeType, SourceReference, EpistemicMetadata } from '../types.js';

export interface FusionPayload {
  source: string; // e.g., 'maestro', 'github'
  tenantId: string;
  entities: FusionEntity[];
  relationships: FusionRelationship[];
}

export interface FusionEntity {
  externalId: string; // ID in the source system
  entityType: EntityType;
  name: string;
  attributes: Record<string, any>; // Raw attributes from source
  associatedDate?: string; // Timestamp of the event/object
}

export interface FusionRelationship {
  sourceExternalId: string;
  targetExternalId: string;
  edgeType: EdgeType;
  attributes?: Record<string, any>;
}

export interface EntityResolutionResult {
  globalId: string; // The canonical ID found or created
  isNew: boolean;
  confidence: number;
}
