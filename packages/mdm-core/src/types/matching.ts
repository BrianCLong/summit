/**
 * Entity Matching and Resolution Types
 */

export interface MatchingConfig {
  algorithm: MatchingAlgorithm;
  threshold: number;
  autoApproveThreshold?: number;
  blockingEnabled: boolean;
  blockingStrategy?: MatchBlockingStrategy;
  matchingRules: MatchingRule[];
}

export type MatchingAlgorithm =
  | 'deterministic'
  | 'probabilistic'
  | 'ml_based'
  | 'hybrid'
  | 'custom';

export interface MatchingRule {
  id: string;
  name: string;
  fields: MatchingFieldConfig[];
  weights: Record<string, number>;
  threshold: number;
  priority: number;
  active: boolean;
}

export interface MatchingFieldConfig {
  fieldName: string;
  comparator: Comparator;
  weight: number;
  required: boolean;
  transformations?: Transformation[];
  customLogic?: string;
}

export type Comparator =
  | 'exact'
  | 'levenshtein'
  | 'jaro_winkler'
  | 'soundex'
  | 'metaphone'
  | 'token_sort'
  | 'token_set'
  | 'cosine_similarity'
  | 'jaccard'
  | 'custom';

export type Transformation =
  | 'lowercase'
  | 'uppercase'
  | 'trim'
  | 'remove_whitespace'
  | 'remove_punctuation'
  | 'phonetic'
  | 'normalize'
  | 'tokenize';

export interface MatchBlockingStrategy {
  blockingKeys: MatchBlockingKey[];
  maxBlockSize: number;
  minBlockSize?: number;
  dynamicBlocking?: boolean;
}

export interface MatchBlockingKey {
  fields: string[];
  transformations?: Transformation[];
  weight: number;
}

export interface MatchResult {
  recordId1: string;
  recordId2: string;
  matchScore: number;
  matchLevel: MatchLevel;
  fieldScores: Record<string, number>;
  confidence: number;
  algorithm: string;
  timestamp: Date;
  autoApproved: boolean;
  reviewRequired: boolean;
}

export type MatchLevel =
  | 'exact'
  | 'high'
  | 'medium'
  | 'low'
  | 'no_match';

export interface MatchingJob {
  id: string;
  domain: string;
  status: JobStatus;
  recordsProcessed: number;
  totalRecords: number;
  matchesFound: number;
  startTime: Date;
  endTime?: Date;
  config: MatchingConfig;
  errors: JobError[];
}

export type JobStatus =
  | 'queued'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface JobError {
  recordId: string;
  errorType: string;
  errorMessage: string;
  timestamp: Date;
}

export interface MatchPair {
  recordId1: string;
  recordId2: string;
  matchScore: number;
  status: MatchPairStatus;
  reviewedBy?: string;
  reviewedAt?: Date;
  notes?: string;
}

export type MatchPairStatus =
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'auto_approved'
  | 'merged';
