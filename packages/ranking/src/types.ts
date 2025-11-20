/**
 * Types for ranking and result fusion
 */

export interface RankedResult {
  id: string;
  score: number;
  features?: Record<string, number>;
  metadata?: Record<string, any>;
}

export interface RankingFeatures {
  textualRelevance?: number;
  semanticSimilarity?: number;
  recency?: number;
  popularity?: number;
  authority?: number;
  userEngagement?: number;
  confidence?: number;
  custom?: Record<string, number>;
}

export interface FusionConfig {
  method: 'rrf' | 'linear' | 'normalized_linear' | 'multiplicative' | 'borda';
  weights?: Record<string, number>;
  rrfK?: number; // RRF constant, typically 60
  normalize?: boolean;
}

export interface LTRModel {
  name: string;
  type: 'linear' | 'logistic' | 'tree' | 'forest' | 'gradient_boost';
  features: string[];
  train(examples: TrainingExample[]): Promise<void>;
  predict(features: RankingFeatures): number;
  save(path: string): Promise<void>;
  load(path: string): Promise<void>;
}

export interface TrainingExample {
  queryId: string;
  documentId: string;
  features: RankingFeatures;
  relevance: number; // 0-4 (not relevant to highly relevant)
  clicked?: boolean;
  dwellTime?: number;
}

export interface RerankerConfig {
  model?: LTRModel;
  features?: string[];
  threshold?: number;
}

export interface DiversityConfig {
  method: 'mmr' | 'coverage' | 'clustering';
  lambda?: number; // MMR lambda parameter (0-1)
  clusterCount?: number;
  diversityField?: string;
}

export interface PersonalizationConfig {
  userId?: string;
  userHistory?: string[];
  userPreferences?: Record<string, any>;
  weight?: number; // 0-1, how much to weight personalization
}

export interface RankingMetrics {
  precision: number;
  recall: number;
  f1: number;
  ndcg: number; // Normalized Discounted Cumulative Gain
  map: number; // Mean Average Precision
  mrr: number; // Mean Reciprocal Rank
}
