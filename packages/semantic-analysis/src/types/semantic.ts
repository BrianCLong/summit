/**
 * Semantic Analysis Types
 */

import { z } from 'zod';

// Semantic Relation Types
export const SemanticRelationSchema = z.object({
  id: z.string(),
  type: z.enum([
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
  sourceEntityId: z.string(),
  targetEntityId: z.string(),
  confidence: z.number().min(0).max(1),
  extractedFrom: z.string(), // source text or document
  extractionMethod: z.enum(['rule_based', 'ml_model', 'manual', 'lexical']),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime(),
});

export type SemanticRelation = z.infer<typeof SemanticRelationSchema>;

// Event Extraction
export const EventSchema = z.object({
  id: z.string(),
  type: z.string(), // Event type (e.g., 'meeting', 'transaction', 'conflict')
  trigger: z.string(), // Trigger word/phrase
  participants: z.array(
    z.object({
      entityId: z.string(),
      role: z.string(), // e.g., 'agent', 'patient', 'instrument'
      confidence: z.number().min(0).max(1),
    }),
  ),
  temporalInfo: z.object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
    duration: z.string().optional(),
    frequency: z.string().optional(),
  }).optional(),
  location: z.string().optional(),
  properties: z.record(z.string(), z.any()),
  confidence: z.number().min(0).max(1),
  extractedFrom: z.string(),
  createdAt: z.string().datetime(),
});

export type Event = z.infer<typeof EventSchema>;

// Temporal Relation
export const TemporalRelationSchema = z.object({
  id: z.string(),
  type: z.enum([
    'before',
    'after',
    'during',
    'overlaps',
    'starts',
    'finishes',
    'equals',
    'meets',
  ]),
  sourceEventId: z.string(),
  targetEventId: z.string(),
  confidence: z.number().min(0).max(1),
  extractedFrom: z.string(),
  createdAt: z.string().datetime(),
});

export type TemporalRelation = z.infer<typeof TemporalRelationSchema>;

// Causal Relationship
export const CausalRelationshipSchema = z.object({
  id: z.string(),
  causeEntityId: z.string(),
  effectEntityId: z.string(),
  causalityType: z.enum(['direct', 'indirect', 'probabilistic', 'necessary', 'sufficient']),
  strength: z.number().min(0).max(1), // How strong the causal link is
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.string()), // Supporting evidence
  extractedFrom: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime(),
});

export type CausalRelationship = z.infer<typeof CausalRelationshipSchema>;

// Sentiment Analysis
export const SentimentSchema = z.object({
  entityId: z.string(),
  sentiment: z.enum(['positive', 'negative', 'neutral', 'mixed']),
  score: z.number().min(-1).max(1), // -1 (very negative) to 1 (very positive)
  confidence: z.number().min(0).max(1),
  aspects: z.array(
    z.object({
      aspect: z.string(),
      sentiment: z.enum(['positive', 'negative', 'neutral']),
      score: z.number().min(-1).max(1),
    }),
  ).optional(),
  extractedFrom: z.string(),
  createdAt: z.string().datetime(),
});

export type Sentiment = z.infer<typeof SentimentSchema>;

// Semantic Similarity
export const SimilarityResultSchema = z.object({
  entity1Id: z.string(),
  entity2Id: z.string(),
  similarityScore: z.number().min(0).max(1),
  similarityType: z.enum([
    'semantic',
    'structural',
    'contextual',
    'attribute',
    'embedding',
  ]),
  features: z.record(z.string(), z.number()).optional(), // Feature contributions
  computedAt: z.string().datetime(),
});

export type SimilarityResult = z.infer<typeof SimilarityResultSchema>;

// Concept Definition
export const ConceptSchema = z.object({
  id: z.string(),
  name: z.string(),
  definition: z.string(),
  synonyms: z.array(z.string()).default([]),
  hypernyms: z.array(z.string()).default([]), // Broader concepts
  hyponyms: z.array(z.string()).default([]), // Narrower concepts
  relatedConcepts: z.array(z.string()).default([]),
  examples: z.array(z.string()).default([]),
  namespace: z.string(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Concept = z.infer<typeof ConceptSchema>;
