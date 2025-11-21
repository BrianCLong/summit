/**
 * Ontology and Schema Types for Knowledge Graph
 */

import { z } from 'zod';

// Entity Type Definition
export const EntityTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  namespace: z.string(), // e.g., 'foaf', 'schema.org', 'custom'
  properties: z.array(
    z.object({
      name: z.string(),
      type: z.enum([
        'string',
        'number',
        'boolean',
        'date',
        'datetime',
        'uri',
        'object',
      ]),
      required: z.boolean().default(false),
      description: z.string().optional(),
      constraints: z
        .object({
          minLength: z.number().optional(),
          maxLength: z.number().optional(),
          pattern: z.string().optional(),
          min: z.number().optional(),
          max: z.number().optional(),
          enum: z.array(z.string()).optional(),
        })
        .optional(),
    }),
  ),
  parentTypes: z.array(z.string()).default([]), // For type hierarchy
  version: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type EntityType = z.infer<typeof EntityTypeSchema>;

// Relationship Type Definition
export const RelationshipTypeSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  namespace: z.string(),
  sourceTypes: z.array(z.string()), // Allowed source entity types
  targetTypes: z.array(z.string()), // Allowed target entity types
  properties: z.array(
    z.object({
      name: z.string(),
      type: z.enum(['string', 'number', 'boolean', 'date', 'datetime']),
      required: z.boolean().default(false),
    }),
  ),
  cardinality: z
    .enum(['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'])
    .default('many-to-many'),
  symmetric: z.boolean().default(false), // e.g., 'knows' is symmetric
  transitive: z.boolean().default(false), // e.g., 'ancestor_of' is transitive
  version: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type RelationshipType = z.infer<typeof RelationshipTypeSchema>;

// Ontology Definition
export const OntologySchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.string(),
  namespace: z.string(),
  description: z.string().optional(),
  entityTypes: z.array(EntityTypeSchema),
  relationshipTypes: z.array(RelationshipTypeSchema),
  imports: z.array(
    z.object({
      ontologyId: z.string(),
      version: z.string(),
      prefix: z.string(), // Prefix for imported types
    }),
  ),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type Ontology = z.infer<typeof OntologySchema>;

// Schema Evolution
export const SchemaChangeSchema = z.object({
  id: z.string(),
  ontologyId: z.string(),
  version: z.string(),
  previousVersion: z.string().optional(),
  changeType: z.enum([
    'entity_type_added',
    'entity_type_removed',
    'entity_type_modified',
    'relationship_type_added',
    'relationship_type_removed',
    'relationship_type_modified',
    'property_added',
    'property_removed',
    'property_modified',
  ]),
  changes: z.record(z.string(), z.any()),
  migrationType: z.enum(['breaking', 'non-breaking', 'additive']),
  migrationScript: z.string().optional(), // Cypher migration script
  appliedAt: z.string().datetime().optional(),
  createdBy: z.string(),
  createdAt: z.string().datetime(),
});

export type SchemaChange = z.infer<typeof SchemaChangeSchema>;

// Standard Ontology Namespaces
export const STANDARD_NAMESPACES = {
  FOAF: 'http://xmlns.com/foaf/0.1/',
  SCHEMA_ORG: 'https://schema.org/',
  DUBLIN_CORE: 'http://purl.org/dc/elements/1.1/',
  SKOS: 'http://www.w3.org/2004/02/skos/core#',
  OWL: 'http://www.w3.org/2002/07/owl#',
  RDF: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
  RDFS: 'http://www.w3.org/2000/01/rdf-schema#',
  CUSTOM: 'http://intelgraph.io/ontology/',
} as const;
