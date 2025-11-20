import { z } from 'zod';

// Entity record schema
export const EntityRecordSchema = z.object({
  id: z.string(),
  type: z.string(),
  name: z.string(),
  aliases: z.array(z.string()).optional(),
  attributes: z.record(z.string(), z.unknown()),
  tenantId: z.string(),
  confidence: z.number().min(0).max(1).optional(),
  // Geographic/temporal signals
  locations: z.array(z.object({
    lat: z.number(),
    lon: z.number(),
    timestamp: z.string().optional(),
  })).optional(),
  timestamps: z.array(z.string()).optional(),
  // Device/account signals
  deviceIds: z.array(z.string()).optional(),
  accountIds: z.array(z.string()).optional(),
  ipAddresses: z.array(z.string()).optional(),
});

export type EntityRecord = z.infer<typeof EntityRecordSchema>;

// Feature extraction outputs
export interface ERFeatures {
  // Name similarity features
  nameSimilarity: number;
  nameJaccard: number;
  nameLevenshtein: number;
  phoneticSimilarity: number;
  aliasSimilarity: number;

  // Type and property features
  typeMatch: boolean;
  propertyOverlap: number;
  semanticSimilarity: number;

  // Geo/temporal features
  geographicProximity: number;
  temporalCoOccurrence: number;
  locationOverlap: number;

  // Device/account features
  deviceIdMatch: number;
  accountIdMatch: number;
  ipAddressOverlap: number;

  // Metadata
  editDistance: number;
}

// Candidate scoring
export interface CandidateScore {
  entityId: string;
  score: number;
  confidence: number;
  features: ERFeatures;
  rationale: string[];
  method: 'deterministic' | 'probabilistic' | 'hybrid';
}

// Candidate request/response
export const CandidateRequestSchema = z.object({
  tenantId: z.string(),
  entity: EntityRecordSchema,
  population: z.array(EntityRecordSchema),
  topK: z.number().int().positive().optional().default(5),
  threshold: z.number().min(0).max(1).optional().default(0.7),
  method: z.enum(['deterministic', 'probabilistic', 'hybrid']).optional().default('hybrid'),
  policyTags: z.array(z.string()).optional(),
});

export type CandidateRequest = z.infer<typeof CandidateRequestSchema>;

export interface CandidateResponse {
  requestId: string;
  candidates: CandidateScore[];
  method: string;
  executionTimeMs: number;
}

// Merge operations
export const MergeRequestSchema = z.object({
  tenantId: z.string(),
  entityIds: z.array(z.string()).min(2),
  primaryId: z.string().optional(),
  actor: z.string(),
  reason: z.string(),
  policyTags: z.array(z.string()).optional().default([]),
  confidence: z.number().min(0).max(1).optional(),
});

export type MergeRequest = z.infer<typeof MergeRequestSchema>;

export interface MergeRecord {
  mergeId: string;
  tenantId: string;
  primaryId: string;
  mergedIds: string[];
  actor: string;
  reason: string;
  policyTags: string[];
  confidence?: number;
  mergedAt: string;
  reversible: boolean;
  features?: ERFeatures;
}

// Split operations
export const SplitRequestSchema = z.object({
  tenantId: z.string(),
  entityId: z.string(),
  splitGroups: z.array(z.object({
    attributes: z.record(z.string(), z.unknown()),
    deviceIds: z.array(z.string()).optional(),
    accountIds: z.array(z.string()).optional(),
  })).min(2),
  actor: z.string(),
  reason: z.string(),
});

export type SplitRequest = z.infer<typeof SplitRequestSchema>;

export interface SplitRecord {
  splitId: string;
  tenantId: string;
  originalEntityId: string;
  newEntityIds: string[];
  actor: string;
  reason: string;
  splitAt: string;
}

// Explain responses
export interface ExplainResponse {
  mergeId: string;
  features: ERFeatures;
  rationale: string[];
  featureWeights: Record<string, number>;
  threshold: number;
  policyTags: string[];
  method: string;
  createdAt: string;
}

// Audit trail
export interface AuditEntry {
  id: string;
  tenantId: string;
  actor: string;
  event: 'merge' | 'revert' | 'split';
  target: string;
  reason: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

// Scoring configuration
export interface ScoringConfig {
  weights: {
    nameSimilarity: number;
    typeMatch: number;
    propertyOverlap: number;
    semanticSimilarity: number;
    geographicProximity: number;
    temporalCoOccurrence: number;
    deviceIdMatch: number;
    accountIdMatch: number;
  };
  threshold: number;
  method: 'deterministic' | 'probabilistic' | 'hybrid';
}

// Default scoring configuration
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    nameSimilarity: 0.25,
    typeMatch: 0.15,
    propertyOverlap: 0.10,
    semanticSimilarity: 0.15,
    geographicProximity: 0.10,
    temporalCoOccurrence: 0.10,
    deviceIdMatch: 0.10,
    accountIdMatch: 0.05,
  },
  threshold: 0.7,
  method: 'hybrid',
};
