/**
 * Validation Schemas for Canonical Model
 *
 * Provides Zod schemas for validating:
 * - Entity types
 * - Relationship types
 * - Policy labels (with cross-field validation)
 * - Bitemporal fields
 * - Provenance chains
 *
 * @module graph-core/canonical/validation
 */

import { z } from 'zod';
import {
  CanonicalEntityType,
  CanonicalRelationshipType,
  SensitivityLevel,
  ClearanceLevel,
  RetentionClass,
  VerificationStatus,
  ProvenanceAction,
  requiresLegalBasis,
} from './types.js';

// =============================================================================
// ENUM SCHEMAS
// =============================================================================

export const EntityTypeSchema = z.nativeEnum(CanonicalEntityType);

export const RelationshipTypeSchema = z.nativeEnum(CanonicalRelationshipType);

export const SensitivityLevelSchema = z.nativeEnum(SensitivityLevel);

export const ClearanceLevelSchema = z.nativeEnum(ClearanceLevel);

export const RetentionClassSchema = z.nativeEnum(RetentionClass);

export const VerificationStatusSchema = z.nativeEnum(VerificationStatus);

export const ProvenanceActionSchema = z.nativeEnum(ProvenanceAction);

// =============================================================================
// POLICY LABELS SCHEMA (7 Mandatory Fields)
// =============================================================================

/**
 * Policy Labels validation schema
 *
 * Enforces:
 * - All 7 fields are required
 * - Valid enum values
 * - legalBasis required and non-empty when sensitivity > INTERNAL
 */
export const PolicyLabelsSchema = z
  .object({
    origin: z
      .string()
      .min(1, 'origin is required and cannot be empty')
      .describe('Source attribution - where this data originated'),

    sensitivity: SensitivityLevelSchema.describe('Data classification level'),

    clearance: ClearanceLevelSchema.describe(
      'Minimum clearance required to access'
    ),

    legalBasis: z
      .string()
      .describe('Legal authority for processing'),

    needToKnow: z
      .array(z.string())
      .default([])
      .describe('Compartmentation tags - additional access restrictions'),

    purposeLimitation: z
      .array(z.string())
      .default([])
      .describe('Allowable purposes for this data'),

    retentionClass: RetentionClassSchema.describe('Data lifecycle tier'),
  })
  .refine(
    (data) => {
      // If sensitivity > INTERNAL, legalBasis must be non-empty
      if (requiresLegalBasis(data.sensitivity)) {
        return data.legalBasis.trim().length > 0;
      }
      return true;
    },
    {
      message:
        'legalBasis is required and must be non-empty when sensitivity is higher than INTERNAL',
      path: ['legalBasis'],
    }
  );

// =============================================================================
// PROVENANCE SCHEMAS
// =============================================================================

export const ProvenanceAssertionSchema = z.object({
  id: z.string().uuid(),
  timestamp: z.coerce.date(),
  actor: z.string().min(1, 'actor is required'),
  action: ProvenanceActionSchema,
  input: z.array(z.string()),
  output: z.array(z.string()),
  method: z.string().min(1, 'method is required'),
  parameters: z.record(z.string(), z.unknown()).default({}),
  modelVersion: z.string().optional(),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()).optional(),
});

export const ProvenanceChainSchema = z.object({
  sourceId: z.string().min(1, 'sourceId is required'),
  assertions: z.array(ProvenanceAssertionSchema).default([]),
  verificationStatus: VerificationStatusSchema.default(
    VerificationStatus.UNVERIFIED
  ),
  trustScore: z.number().min(0).max(1).default(0.5),
});

// =============================================================================
// BITEMPORAL SCHEMAS
// =============================================================================

/**
 * Bitemporal fields validation
 *
 * Rules:
 * - validTo must be after validFrom (if both specified)
 * - recordedAt is always required
 */
export const BitemporalFieldsSchema = z
  .object({
    validFrom: z.coerce.date().nullable().default(null),
    validTo: z.coerce.date().nullable().default(null),
    observedAt: z.coerce.date().nullable().default(null),
    recordedAt: z.coerce.date().default(() => new Date()),
  })
  .refine(
    (data) => {
      if (data.validFrom && data.validTo) {
        return data.validTo > data.validFrom;
      }
      return true;
    },
    {
      message: 'validTo must be after validFrom',
      path: ['validTo'],
    }
  );

// =============================================================================
// ENTITY INPUT SCHEMA
// =============================================================================

/**
 * Default policy labels for entities without explicit labels
 */
export function getDefaultPolicyLabels(): z.infer<typeof PolicyLabelsSchema> {
  return {
    origin: 'unknown',
    sensitivity: SensitivityLevel.INTERNAL,
    clearance: ClearanceLevel.AUTHORIZED,
    legalBasis: '',
    needToKnow: [],
    purposeLimitation: [],
    retentionClass: RetentionClass.MEDIUM_TERM,
  };
}

/**
 * Default provenance chain for new entities
 */
export function getDefaultProvenanceChain(
  source: string
): z.infer<typeof ProvenanceChainSchema> {
  return {
    sourceId: source,
    assertions: [],
    verificationStatus: VerificationStatus.UNVERIFIED,
    trustScore: 0.5,
  };
}

/**
 * Entity creation/update input schema
 */
export const EntityInputSchema = z
  .object({
    // Identity
    id: z.string().uuid().optional(),
    canonicalId: z.string().uuid().nullable().optional(),
    tenantId: z.string().min(1).default('default'),

    // Core
    entityType: EntityTypeSchema,
    label: z.string().min(1, 'label is required'),
    description: z.string().optional(),

    // Properties
    properties: z.record(z.string(), z.unknown()).default({}),
    customMetadata: z.record(z.string(), z.unknown()).optional(),

    // Quality
    confidence: z.number().min(0).max(1).default(0.5),
    source: z.string().min(1).default('api'),

    // Provenance
    provenance: ProvenanceChainSchema.optional(),

    // Policy (required fields enforced by PolicyLabelsSchema)
    policyLabels: PolicyLabelsSchema.optional(),

    // Bitemporal
    validFrom: z.coerce.date().nullable().optional(),
    validTo: z.coerce.date().nullable().optional(),
    observedAt: z.coerce.date().nullable().optional(),

    // Audit
    createdBy: z.string().min(1).default('system'),

    // Categorization
    tags: z.array(z.string()).default([]),

    // Context
    investigationId: z.string().optional(),
    caseId: z.string().optional(),
  })
  .transform((data) => ({
    ...data,
    policyLabels: data.policyLabels ?? getDefaultPolicyLabels(),
    provenance: data.provenance ?? getDefaultProvenanceChain(data.source),
    validFrom: data.validFrom ?? null,
    validTo: data.validTo ?? null,
    observedAt: data.observedAt ?? null,
  }));

/**
 * Entity stored format (with system-managed fields)
 */
export const EntityStoredSchema = EntityInputSchema.extend({
  id: z.string().uuid(),
  recordedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  updatedBy: z.string().optional(),
  version: z.number().int().min(1),
});

// =============================================================================
// RELATIONSHIP INPUT SCHEMA
// =============================================================================

/**
 * Relationship creation/update input schema
 */
export const RelationshipInputSchema = z
  .object({
    // Identity
    id: z.string().uuid().optional(),
    tenantId: z.string().min(1).default('default'),

    // Structure
    type: RelationshipTypeSchema,
    label: z.string().optional(),
    description: z.string().optional(),
    fromEntityId: z.string().uuid('fromEntityId must be a valid UUID'),
    toEntityId: z.string().uuid('toEntityId must be a valid UUID'),
    directed: z.boolean().default(true),
    weight: z.number().min(0).max(1).optional(),

    // Properties
    properties: z.record(z.string(), z.unknown()).default({}),
    customMetadata: z.record(z.string(), z.unknown()).optional(),

    // Quality
    confidence: z.number().min(0).max(1).default(0.5),
    source: z.string().min(1).default('api'),

    // Provenance
    provenance: ProvenanceChainSchema.optional(),

    // Policy (required fields enforced by PolicyLabelsSchema)
    policyLabels: PolicyLabelsSchema.optional(),

    // Bitemporal
    validFrom: z.coerce.date().nullable().optional(),
    validTo: z.coerce.date().nullable().optional(),
    observedAt: z.coerce.date().nullable().optional(),
    since: z.coerce.date().optional(),
    until: z.coerce.date().optional(),

    // Audit
    createdBy: z.string().min(1).default('system'),

    // Context
    investigationId: z.string().optional(),
    caseId: z.string().optional(),
  })
  .refine(
    (data) => data.fromEntityId !== data.toEntityId,
    {
      message: 'Self-loops not allowed: fromEntityId cannot equal toEntityId',
      path: ['toEntityId'],
    }
  )
  .transform((data) => ({
    ...data,
    policyLabels: data.policyLabels ?? getDefaultPolicyLabels(),
    provenance: data.provenance ?? getDefaultProvenanceChain(data.source),
    validFrom: data.validFrom ?? null,
    validTo: data.validTo ?? null,
    observedAt: data.observedAt ?? null,
  }));

/**
 * Relationship stored format (with system-managed fields)
 */
export const RelationshipStoredSchema = RelationshipInputSchema.extend({
  id: z.string().uuid(),
  recordedAt: z.coerce.date(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  updatedBy: z.string().optional(),
  version: z.number().int().min(1),
});

// =============================================================================
// QUERY SCHEMAS
// =============================================================================

/**
 * Temporal query parameters
 */
export const TemporalQuerySchema = z.object({
  /** Point in time for snapshot query (business time) */
  asOf: z.coerce.date().optional(),
  /** Point in time for system time query */
  recordedAsOf: z.coerce.date().optional(),
  /** Start of validity window */
  validFrom: z.coerce.date().optional(),
  /** End of validity window */
  validTo: z.coerce.date().optional(),
});

/**
 * Pagination parameters
 */
export const PaginationSchema = z.object({
  /** Number of items per page (max 100) */
  limit: z.number().int().min(1).max(100).default(20),
  /** Offset for pagination */
  offset: z.number().int().min(0).default(0),
  /** Cursor for cursor-based pagination */
  cursor: z.string().optional(),
});

/**
 * Neighborhood query parameters
 */
export const NeighborhoodQuerySchema = z.object({
  /** Starting entity ID */
  entityId: z.string().uuid(),
  /** Maximum depth to traverse */
  depth: z.number().int().min(1).max(5).default(2),
  /** Filter by entity types */
  entityTypes: z.array(EntityTypeSchema).optional(),
  /** Filter by relationship types */
  relationshipTypes: z.array(RelationshipTypeSchema).optional(),
  /** Minimum confidence threshold */
  minConfidence: z.number().min(0).max(1).optional(),
  /** Required clearance level */
  clearance: ClearanceLevelSchema.optional(),
  /** Temporal filter */
  temporal: TemporalQuerySchema.optional(),
  /** Pagination */
  pagination: PaginationSchema.optional(),
});

/**
 * Query cost estimation result
 */
export interface QueryCostEstimate {
  /** Estimated node count to be scanned */
  estimatedNodes: number;
  /** Estimated edge count to be scanned */
  estimatedEdges: number;
  /** Estimated execution time in ms */
  estimatedTimeMs: number;
  /** Whether query exceeds cost limits */
  exceedsLimit: boolean;
  /** Cost limit message if exceeded */
  limitMessage?: string;
}

/**
 * Query cost limits
 */
export const QueryCostLimits = {
  MAX_NODES: 10000,
  MAX_EDGES: 50000,
  MAX_DEPTH: 5,
  MAX_RESULTS: 1000,
  TIMEOUT_MS: 30000,
} as const;

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Validate entity input
 */
export function validateEntityInput(
  input: unknown
): z.SafeParseReturnType<unknown, z.infer<typeof EntityInputSchema>> {
  return EntityInputSchema.safeParse(input);
}

/**
 * Validate relationship input
 */
export function validateRelationshipInput(
  input: unknown
): z.SafeParseReturnType<unknown, z.infer<typeof RelationshipInputSchema>> {
  return RelationshipInputSchema.safeParse(input);
}

/**
 * Validate policy labels
 */
export function validatePolicyLabels(
  input: unknown
): z.SafeParseReturnType<unknown, z.infer<typeof PolicyLabelsSchema>> {
  return PolicyLabelsSchema.safeParse(input);
}

/**
 * Validate neighborhood query
 */
export function validateNeighborhoodQuery(
  input: unknown
): z.SafeParseReturnType<unknown, z.infer<typeof NeighborhoodQuerySchema>> {
  return NeighborhoodQuerySchema.safeParse(input);
}

// =============================================================================
// TYPE EXPORTS
// =============================================================================

export type EntityInput = z.infer<typeof EntityInputSchema>;
export type EntityStored = z.infer<typeof EntityStoredSchema>;
export type RelationshipInput = z.infer<typeof RelationshipInputSchema>;
export type RelationshipStored = z.infer<typeof RelationshipStoredSchema>;
export type TemporalQuery = z.infer<typeof TemporalQuerySchema>;
export type Pagination = z.infer<typeof PaginationSchema>;
export type NeighborhoodQuery = z.infer<typeof NeighborhoodQuerySchema>;
export type PolicyLabelsInput = z.infer<typeof PolicyLabelsSchema>;
