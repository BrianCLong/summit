"use strict";
/**
 * Inference and Reasoning Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredictedLinkSchema = exports.ContradictionSchema = exports.InferredFactSchema = exports.InferenceRuleSchema = void 0;
const zod_1 = require("zod");
// Inference Rule
exports.InferenceRuleSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    ruleType: zod_1.z.enum([
        'transitive', // If A->B and B->C then A->C
        'symmetric', // If A->B then B->A
        'inverse', // If A->B then B->A⁻¹
        'subproperty', // Property inheritance
        'domain_range', // Type constraints
        'cardinality', // Cardinality constraints
        'custom', // Custom rule
    ]),
    pattern: zod_1.z.string(), // Cypher pattern to match
    conclusion: zod_1.z.string(), // Cypher pattern to create
    confidence: zod_1.z.number().min(0).max(1).default(1.0),
    enabled: zod_1.z.boolean().default(true),
    priority: zod_1.z.number().default(0), // Higher priority rules execute first
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// Inferred Fact
exports.InferredFactSchema = zod_1.z.object({
    id: zod_1.z.string(),
    factType: zod_1.z.enum(['entity', 'relationship', 'property']),
    sourceRuleId: zod_1.z.string(),
    sourceRuleName: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    premises: zod_1.z.array(zod_1.z.string()), // IDs of facts used in inference
    conclusion: zod_1.z.object({
        entityId: zod_1.z.string().optional(),
        relationshipId: zod_1.z.string().optional(),
        property: zod_1.z.string().optional(),
        value: zod_1.z.any().optional(),
    }),
    derivationChain: zod_1.z.array(zod_1.z.string()), // Chain of rules applied
    createdAt: zod_1.z.string().datetime(),
});
// Contradiction
exports.ContradictionSchema = zod_1.z.object({
    id: zod_1.z.string(),
    contradictionType: zod_1.z.enum([
        'property_conflict',
        'relationship_conflict',
        'type_conflict',
        'cardinality_violation',
        'constraint_violation',
    ]),
    entity1Id: zod_1.z.string().optional(),
    entity2Id: zod_1.z.string().optional(),
    relationshipId: zod_1.z.string().optional(),
    description: zod_1.z.string(),
    severity: zod_1.z.enum(['low', 'medium', 'high', 'critical']),
    conflictingFacts: zod_1.z.array(zod_1.z.object({
        factId: zod_1.z.string(),
        value: zod_1.z.any(),
        source: zod_1.z.string(),
        confidence: zod_1.z.number(),
    })),
    suggestedResolution: zod_1.z.string().optional(),
    resolved: zod_1.z.boolean().default(false),
    resolvedBy: zod_1.z.string().optional(),
    resolvedAt: zod_1.z.string().datetime().optional(),
    detectedAt: zod_1.z.string().datetime(),
});
// Link Prediction
exports.PredictedLinkSchema = zod_1.z.object({
    id: zod_1.z.string(),
    sourceEntityId: zod_1.z.string(),
    targetEntityId: zod_1.z.string(),
    predictedRelationType: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    predictionMethod: zod_1.z.enum([
        'graph_embedding',
        'path_ranking',
        'matrix_factorization',
        'rule_based',
        'ml_model',
    ]),
    features: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(),
    supportingEvidence: zod_1.z.array(zod_1.z.string()).optional(),
    validated: zod_1.z.boolean().default(false),
    validatedBy: zod_1.z.string().optional(),
    validatedAt: zod_1.z.string().datetime().optional(),
    createdAt: zod_1.z.string().datetime(),
});
