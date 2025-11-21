/**
 * Entity and Relationship Types for Knowledge Graph
 */

import { z } from 'zod';

// Knowledge Graph Entity
export const KGEntitySchema = z.object({
  id: z.string(),
  type: z.string(), // References EntityType.id
  namespace: z.string(),
  labels: z.array(z.string()), // Neo4j labels
  properties: z.record(z.string(), z.any()),
  confidence: z.number().min(0).max(1).default(1.0),
  provenance: z.object({
    sourceId: z.string(),
    sourceType: z.enum(['document', 'database', 'api', 'manual', 'inferred']),
    extractedAt: z.string().datetime(),
    extractorVersion: z.string().optional(),
    verifiedBy: z.string().optional(),
    verifiedAt: z.string().datetime().optional(),
  }),
  temporalInfo: z
    .object({
      validFrom: z.string().datetime().optional(),
      validTo: z.string().datetime().optional(),
      asOf: z.string().datetime().optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type KGEntity = z.infer<typeof KGEntitySchema>;

// Knowledge Graph Relationship
export const KGRelationshipSchema = z.object({
  id: z.string(),
  type: z.string(), // References RelationshipType.id
  namespace: z.string(),
  sourceId: z.string(),
  targetId: z.string(),
  properties: z.record(z.string(), z.any()),
  confidence: z.number().min(0).max(1).default(1.0),
  weight: z.number().optional(), // For weighted graphs
  provenance: z.object({
    sourceId: z.string(),
    sourceType: z.enum(['document', 'database', 'api', 'manual', 'inferred']),
    extractedAt: z.string().datetime(),
    extractorVersion: z.string().optional(),
  }),
  temporalInfo: z
    .object({
      validFrom: z.string().datetime().optional(),
      validTo: z.string().datetime().optional(),
      asOf: z.string().datetime().optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type KGRelationship = z.infer<typeof KGRelationshipSchema>;

// Entity Link (for entity linking to external KBs)
export const EntityLinkSchema = z.object({
  entityId: z.string(),
  externalId: z.string(),
  externalSource: z.enum(['dbpedia', 'wikidata', 'freebase', 'yago', 'custom']),
  externalUri: z.string().url(),
  linkType: z.enum(['same_as', 'related_to', 'subclass_of', 'instance_of']),
  confidence: z.number().min(0).max(1),
  disambiguationContext: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime(),
});

export type EntityLink = z.infer<typeof EntityLinkSchema>;

// Co-reference Resolution
export const CoreferenceClusterSchema = z.object({
  id: z.string(),
  entities: z.array(z.string()), // Entity IDs that refer to the same real-world entity
  canonicalEntityId: z.string(), // The canonical/preferred entity
  confidence: z.number().min(0).max(1),
  resolutionMethod: z.enum([
    'exact_match',
    'fuzzy_match',
    'ml_model',
    'rule_based',
    'manual',
  ]),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime(),
});

export type CoreferenceCluster = z.infer<typeof CoreferenceClusterSchema>;

// Named Entity Recognition Result
export const NERResultSchema = z.object({
  text: z.string(),
  entities: z.array(
    z.object({
      text: z.string(),
      type: z.string(), // PERSON, ORG, LOC, DATE, etc.
      startOffset: z.number(),
      endOffset: z.number(),
      confidence: z.number().min(0).max(1),
      metadata: z.record(z.string(), z.any()).optional(),
    }),
  ),
  model: z.string(),
  modelVersion: z.string(),
  processedAt: z.string().datetime(),
});

export type NERResult = z.infer<typeof NERResultSchema>;
