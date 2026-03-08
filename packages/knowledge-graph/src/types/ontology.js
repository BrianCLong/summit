"use strict";
/**
 * Ontology and Schema Types for Knowledge Graph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.STANDARD_NAMESPACES = exports.SchemaChangeSchema = exports.OntologySchema = exports.RelationshipTypeSchema = exports.EntityTypeSchema = void 0;
const zod_1 = require("zod");
// Entity Type Definition
exports.EntityTypeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    namespace: zod_1.z.string(), // e.g., 'foaf', 'schema.org', 'custom'
    properties: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        type: zod_1.z.enum([
            'string',
            'number',
            'boolean',
            'date',
            'datetime',
            'uri',
            'object',
        ]),
        required: zod_1.z.boolean().default(false),
        description: zod_1.z.string().optional(),
        constraints: zod_1.z
            .object({
            minLength: zod_1.z.number().optional(),
            maxLength: zod_1.z.number().optional(),
            pattern: zod_1.z.string().optional(),
            min: zod_1.z.number().optional(),
            max: zod_1.z.number().optional(),
            enum: zod_1.z.array(zod_1.z.string()).optional(),
        })
            .optional(),
    })),
    parentTypes: zod_1.z.array(zod_1.z.string()).default([]), // For type hierarchy
    version: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// Relationship Type Definition
exports.RelationshipTypeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    namespace: zod_1.z.string(),
    sourceTypes: zod_1.z.array(zod_1.z.string()), // Allowed source entity types
    targetTypes: zod_1.z.array(zod_1.z.string()), // Allowed target entity types
    properties: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        type: zod_1.z.enum(['string', 'number', 'boolean', 'date', 'datetime']),
        required: zod_1.z.boolean().default(false),
    })),
    cardinality: zod_1.z
        .enum(['one-to-one', 'one-to-many', 'many-to-one', 'many-to-many'])
        .default('many-to-many'),
    symmetric: zod_1.z.boolean().default(false), // e.g., 'knows' is symmetric
    transitive: zod_1.z.boolean().default(false), // e.g., 'ancestor_of' is transitive
    version: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// Ontology Definition
exports.OntologySchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    namespace: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    entityTypes: zod_1.z.array(exports.EntityTypeSchema),
    relationshipTypes: zod_1.z.array(exports.RelationshipTypeSchema),
    imports: zod_1.z.array(zod_1.z.object({
        ontologyId: zod_1.z.string(),
        version: zod_1.z.string(),
        prefix: zod_1.z.string(), // Prefix for imported types
    })),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// Schema Evolution
exports.SchemaChangeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    ontologyId: zod_1.z.string(),
    version: zod_1.z.string(),
    previousVersion: zod_1.z.string().optional(),
    changeType: zod_1.z.enum([
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
    changes: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    migrationType: zod_1.z.enum(['breaking', 'non-breaking', 'additive']),
    migrationScript: zod_1.z.string().optional(), // Cypher migration script
    appliedAt: zod_1.z.string().datetime().optional(),
    createdBy: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
});
// Standard Ontology Namespaces
exports.STANDARD_NAMESPACES = {
    FOAF: 'http://xmlns.com/foaf/0.1/',
    SCHEMA_ORG: 'https://schema.org/',
    DUBLIN_CORE: 'http://purl.org/dc/elements/1.1/',
    SKOS: 'http://www.w3.org/2004/02/skos/core#',
    OWL: 'http://www.w3.org/2002/07/owl#',
    RDF: 'http://www.w3.org/1999/02/22-rdf-syntax-ns#',
    RDFS: 'http://www.w3.org/2000/01/rdf-schema#',
    CUSTOM: 'http://intelgraph.io/ontology/',
};
