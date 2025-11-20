/**
 * Core types for identity resolution system
 */

export interface IdentityRecord {
  id: string;
  sourceSystem: string;
  entityType: 'person' | 'organization' | 'device' | 'account';
  attributes: Record<string, any>;
  metadata: IdentityMetadata;
  createdAt: Date;
  updatedAt: Date;
}

export interface IdentityMetadata {
  confidence: number; // 0-1
  dataQuality: number; // 0-1
  completeness: number; // 0-1
  freshness: Date;
  source: string;
  verificationStatus: 'verified' | 'unverified' | 'disputed';
}

export interface IdentityMatch {
  record1: IdentityRecord;
  record2: IdentityRecord;
  matchScore: number; // 0-1
  matchType: MatchType;
  matchedFields: MatchedField[];
  confidence: number;
  method: MatchingMethod;
}

export type MatchType =
  | 'exact'
  | 'fuzzy'
  | 'probabilistic'
  | 'ml_based'
  | 'rule_based';

export type MatchingMethod =
  | 'deterministic'
  | 'probabilistic'
  | 'hybrid'
  | 'supervised_ml'
  | 'unsupervised_ml';

export interface MatchedField {
  fieldName: string;
  value1: any;
  value2: any;
  similarity: number;
  weight: number;
}

export interface EntityCluster {
  clusterId: string;
  records: IdentityRecord[];
  goldenRecord: GoldenRecord;
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GoldenRecord {
  id: string;
  clusterId: string;
  attributes: Record<string, any>;
  sources: string[];
  confidence: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ResolutionConfig {
  matchingThreshold: number; // 0-1
  autoMergeThreshold: number; // 0-1
  matchingMethods: MatchingMethod[];
  fieldWeights: Record<string, number>;
  enableMachineLearning: boolean;
  enableProbabilistic: boolean;
}

export interface ResolutionResult {
  matches: IdentityMatch[];
  clusters: EntityCluster[];
  goldenRecords: GoldenRecord[];
  statistics: ResolutionStatistics;
}

export interface ResolutionStatistics {
  totalRecords: number;
  totalMatches: number;
  totalClusters: number;
  averageClusterSize: number;
  averageConfidence: number;
  processingTime: number;
}

export interface DataQualityMetrics {
  completeness: number;
  accuracy: number;
  consistency: number;
  timeliness: number;
  uniqueness: number;
  validity: number;
}

export interface NormalizationRule {
  field: string;
  type: 'lowercase' | 'uppercase' | 'trim' | 'format' | 'standardize';
  pattern?: string;
  replacement?: string;
}

export interface DeduplicationResult {
  originalCount: number;
  duplicateCount: number;
  uniqueCount: number;
  duplicateGroups: IdentityRecord[][];
  confidence: number;
}
