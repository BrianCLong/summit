/**
 * Inference and Reasoning Types
 */

import { z } from 'zod';

// Inference Rule
export const InferenceRuleSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  ruleType: z.enum([
    'transitive',      // If A->B and B->C then A->C
    'symmetric',       // If A->B then B->A
    'inverse',         // If A->B then B->A⁻¹
    'subproperty',     // Property inheritance
    'domain_range',    // Type constraints
    'cardinality',     // Cardinality constraints
    'custom',          // Custom rule
  ]),
  pattern: z.string(), // Cypher pattern to match
  conclusion: z.string(), // Cypher pattern to create
  confidence: z.number().min(0).max(1).default(1.0),
  enabled: z.boolean().default(true),
  priority: z.number().default(0), // Higher priority rules execute first
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type InferenceRule = z.infer<typeof InferenceRuleSchema>;

// Inferred Fact
export const InferredFactSchema = z.object({
  id: z.string(),
  factType: z.enum(['entity', 'relationship', 'property']),
  sourceRuleId: z.string(),
  sourceRuleName: z.string(),
  confidence: z.number().min(0).max(1),
  premises: z.array(z.string()), // IDs of facts used in inference
  conclusion: z.object({
    entityId: z.string().optional(),
    relationshipId: z.string().optional(),
    property: z.string().optional(),
    value: z.any().optional(),
  }),
  derivationChain: z.array(z.string()), // Chain of rules applied
  createdAt: z.string().datetime(),
});

export type InferredFact = z.infer<typeof InferredFactSchema>;

// Contradiction
export const ContradictionSchema = z.object({
  id: z.string(),
  contradictionType: z.enum([
    'property_conflict',
    'relationship_conflict',
    'type_conflict',
    'cardinality_violation',
    'constraint_violation',
  ]),
  entity1Id: z.string().optional(),
  entity2Id: z.string().optional(),
  relationshipId: z.string().optional(),
  description: z.string(),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  conflictingFacts: z.array(
    z.object({
      factId: z.string(),
      value: z.any(),
      source: z.string(),
      confidence: z.number(),
    }),
  ),
  suggestedResolution: z.string().optional(),
  resolved: z.boolean().default(false),
  resolvedBy: z.string().optional(),
  resolvedAt: z.string().datetime().optional(),
  detectedAt: z.string().datetime(),
});

export type Contradiction = z.infer<typeof ContradictionSchema>;

// Link Prediction
export const PredictedLinkSchema = z.object({
  id: z.string(),
  sourceEntityId: z.string(),
  targetEntityId: z.string(),
  predictedRelationType: z.string(),
  confidence: z.number().min(0).max(1),
  predictionMethod: z.enum([
    'graph_embedding',
    'path_ranking',
    'matrix_factorization',
    'rule_based',
    'ml_model',
  ]),
  features: z.record(z.string(), z.number()).optional(),
  supportingEvidence: z.array(z.string()).optional(),
  validated: z.boolean().default(false),
  validatedBy: z.string().optional(),
  validatedAt: z.string().datetime().optional(),
  createdAt: z.string().datetime(),
});

export type PredictedLink = z.infer<typeof PredictedLinkSchema>;
