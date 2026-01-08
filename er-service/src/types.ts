import { z } from "zod";

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
  locations: z
    .array(
      z.object({
        lat: z.number(),
        lon: z.number(),
        timestamp: z.string().optional(),
      })
    )
    .optional(),
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
  method: "deterministic" | "probabilistic" | "hybrid";
}

// Candidate request/response
export const CandidateRequestSchema = z.object({
  tenantId: z.string(),
  entity: EntityRecordSchema,
  population: z.array(EntityRecordSchema),
  topK: z.number().int().positive().optional(),
  threshold: z.number().min(0).max(1).optional(),
  method: z.enum(["deterministic", "probabilistic", "hybrid"]).optional(),
  policyTags: z.array(z.string()).optional(),
});

export type CandidateRequest = z.infer<typeof CandidateRequestSchema>;

export interface CandidateResponse {
  requestId: string;
  candidates: CandidateScore[];
  method: string;
  executionTimeMs: number;
}

export interface FeatureContribution {
  feature: string;
  value: number | boolean;
  weight: number;
  contribution: number;
  normalizedContribution: number;
}

// Merge operations
export const MergeRequestSchema = z.object({
  tenantId: z.string(),
  entityIds: z.array(z.string()).min(2),
  primaryId: z.string().optional(),
  actor: z.string(),
  reason: z.string(),
  policyTags: z.array(z.string()).optional(),
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
  splitGroups: z
    .array(
      z.object({
        attributes: z.record(z.string(), z.unknown()),
        deviceIds: z.array(z.string()).optional(),
        accountIds: z.array(z.string()).optional(),
      })
    )
    .min(2),
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
  featureContributions: FeatureContribution[];
  threshold: number;
  policyTags: string[];
  method: string;
  createdAt: string;
}

export const ExplainPairRequestSchema = z.object({
  entityA: EntityRecordSchema,
  entityB: EntityRecordSchema,
  method: z.enum(["deterministic", "probabilistic", "hybrid"]).optional(),
  threshold: z.number().min(0).max(1).optional(),
});

export type ExplainPairRequest = z.infer<typeof ExplainPairRequestSchema>;

export const FeatureContributionSchema = z.object({
  feature: z.string(),
  value: z.union([z.number(), z.boolean()]),
  weight: z.number(),
  contribution: z.number(),
  normalizedContribution: z.number(),
});

export const ExplainPairResponseSchema = z.object({
  score: z.number(),
  confidence: z.number(),
  method: z.string(),
  threshold: z.number(),
  features: z.record(z.string(), z.union([z.number(), z.boolean()])),
  rationale: z.array(z.string()),
  featureWeights: z.record(z.string(), z.number()),
  featureContributions: z.array(FeatureContributionSchema),
});

export interface ExplainPairResponse {
  score: number;
  confidence: number;
  method: string;
  threshold: number;
  features: ERFeatures;
  rationale: string[];
  featureWeights: Record<string, number>;
  featureContributions: FeatureContribution[];
}

export interface MergeExportBundle {
  merge: MergeRecord;
  explanation: ExplainResponse;
}

// Audit trail
export interface AuditEntry {
  id: string;
  tenantId: string;
  actor: string;
  event: "merge" | "revert" | "split";
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
  method: "deterministic" | "probabilistic" | "hybrid";
}

// Default scoring configuration
export const DEFAULT_SCORING_CONFIG: ScoringConfig = {
  weights: {
    nameSimilarity: 0.25,
    typeMatch: 0.15,
    propertyOverlap: 0.1,
    semanticSimilarity: 0.15,
    geographicProximity: 0.1,
    temporalCoOccurrence: 0.1,
    deviceIdMatch: 0.1,
    accountIdMatch: 0.05,
  },
  threshold: 0.7,
  method: "hybrid",
};
