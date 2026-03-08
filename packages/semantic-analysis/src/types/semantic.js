"use strict";
/**
 * Semantic Analysis Types
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConceptSchema = exports.SimilarityResultSchema = exports.SentimentSchema = exports.CausalRelationshipSchema = exports.TemporalRelationSchema = exports.EventSchema = exports.SemanticRelationSchema = void 0;
const zod_1 = require("zod");
// Semantic Relation Types
exports.SemanticRelationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum([
        'hyponym', // is-a relationship
        'hypernym', // parent class
        'meronym', // part-of
        'holonym', // has-part
        'synonym',
        'antonym',
        'cause',
        'effect',
        'entailment',
        'custom',
    ]),
    sourceEntityId: zod_1.z.string(),
    targetEntityId: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    extractedFrom: zod_1.z.string(), // source text or document
    extractionMethod: zod_1.z.enum(['rule_based', 'ml_model', 'manual', 'lexical']),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    createdAt: zod_1.z.string().datetime(),
});
// Event Extraction
exports.EventSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(), // Event type (e.g., 'meeting', 'transaction', 'conflict')
    trigger: zod_1.z.string(), // Trigger word/phrase
    participants: zod_1.z.array(zod_1.z.object({
        entityId: zod_1.z.string(),
        role: zod_1.z.string(), // e.g., 'agent', 'patient', 'instrument'
        confidence: zod_1.z.number().min(0).max(1),
    })),
    temporalInfo: zod_1.z.object({
        startTime: zod_1.z.string().datetime().optional(),
        endTime: zod_1.z.string().datetime().optional(),
        duration: zod_1.z.string().optional(),
        frequency: zod_1.z.string().optional(),
    }).optional(),
    location: zod_1.z.string().optional(),
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    confidence: zod_1.z.number().min(0).max(1),
    extractedFrom: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
// Temporal Relation
exports.TemporalRelationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum([
        'before',
        'after',
        'during',
        'overlaps',
        'starts',
        'finishes',
        'equals',
        'meets',
    ]),
    sourceEventId: zod_1.z.string(),
    targetEventId: zod_1.z.string(),
    confidence: zod_1.z.number().min(0).max(1),
    extractedFrom: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
// Causal Relationship
exports.CausalRelationshipSchema = zod_1.z.object({
    id: zod_1.z.string(),
    causeEntityId: zod_1.z.string(),
    effectEntityId: zod_1.z.string(),
    causalityType: zod_1.z.enum(['direct', 'indirect', 'probabilistic', 'necessary', 'sufficient']),
    strength: zod_1.z.number().min(0).max(1), // How strong the causal link is
    confidence: zod_1.z.number().min(0).max(1),
    evidence: zod_1.z.array(zod_1.z.string()), // Supporting evidence
    extractedFrom: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    createdAt: zod_1.z.string().datetime(),
});
// Sentiment Analysis
exports.SentimentSchema = zod_1.z.object({
    entityId: zod_1.z.string(),
    sentiment: zod_1.z.enum(['positive', 'negative', 'neutral', 'mixed']),
    score: zod_1.z.number().min(-1).max(1), // -1 (very negative) to 1 (very positive)
    confidence: zod_1.z.number().min(0).max(1),
    aspects: zod_1.z.array(zod_1.z.object({
        aspect: zod_1.z.string(),
        sentiment: zod_1.z.enum(['positive', 'negative', 'neutral']),
        score: zod_1.z.number().min(-1).max(1),
    })).optional(),
    extractedFrom: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
// Semantic Similarity
exports.SimilarityResultSchema = zod_1.z.object({
    entity1Id: zod_1.z.string(),
    entity2Id: zod_1.z.string(),
    similarityScore: zod_1.z.number().min(0).max(1),
    similarityType: zod_1.z.enum([
        'semantic',
        'structural',
        'contextual',
        'attribute',
        'embedding',
    ]),
    features: zod_1.z.record(zod_1.z.string(), zod_1.z.number()).optional(), // Feature contributions
    computedAt: zod_1.z.string().datetime(),
});
// Concept Definition
exports.ConceptSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    definition: zod_1.z.string(),
    synonyms: zod_1.z.array(zod_1.z.string()).default([]),
    hypernyms: zod_1.z.array(zod_1.z.string()).default([]), // Broader concepts
    hyponyms: zod_1.z.array(zod_1.z.string()).default([]), // Narrower concepts
    relatedConcepts: zod_1.z.array(zod_1.z.string()).default([]),
    examples: zod_1.z.array(zod_1.z.string()).default([]),
    namespace: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
