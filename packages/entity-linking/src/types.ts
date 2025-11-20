/**
 * Types for entity linking system
 */

export interface EntityLink {
  sourceEntity: string;
  targetEntity: string;
  linkType: LinkType;
  confidence: number;
  evidence: Evidence[];
  createdAt: Date;
  metadata: Record<string, any>;
}

export type LinkType =
  | 'same_as'
  | 'related_to'
  | 'part_of'
  | 'employed_by'
  | 'located_at'
  | 'owns'
  | 'controls'
  | 'associates_with'
  | 'alias_of'
  | 'family_of';

export interface Evidence {
  source: string;
  type: EvidenceType;
  value: any;
  confidence: number;
  timestamp: Date;
}

export type EvidenceType =
  | 'shared_attribute'
  | 'co_occurrence'
  | 'network_connection'
  | 'document_reference'
  | 'temporal_correlation'
  | 'spatial_proximity'
  | 'behavioral_similarity';

export interface LinkingConfig {
  minConfidence: number;
  maxDistance: number;
  enableProbabilistic: boolean;
  enableMLBased: boolean;
  evidenceWeights: Record<EvidenceType, number>;
}

export interface LinkingResult {
  links: EntityLink[];
  entities: Set<string>;
  clusters: EntityCluster[];
  statistics: LinkingStatistics;
}

export interface EntityCluster {
  clusterId: string;
  entities: string[];
  linkType: LinkType;
  confidence: number;
  centerEntity?: string;
}

export interface LinkingStatistics {
  totalEntities: number;
  totalLinks: number;
  totalClusters: number;
  averageConfidence: number;
  linkTypeDistribution: Record<LinkType, number>;
}

export interface CrossReferenceResult {
  entity: string;
  references: Reference[];
  totalSources: number;
  confidence: number;
}

export interface Reference {
  source: string;
  entityId: string;
  attributes: Record<string, any>;
  lastSeen: Date;
  confidence: number;
}

export interface ProbabilisticLink {
  sourceEntity: string;
  targetEntity: string;
  probability: number;
  factors: ProbabilityFactor[];
}

export interface ProbabilityFactor {
  name: string;
  value: number;
  weight: number;
  contribution: number;
}
