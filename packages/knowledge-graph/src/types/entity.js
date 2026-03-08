"use strict";
/**
 * Entity and Relationship Types for Knowledge Graph
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.NERResultSchema = exports.CoreferenceClusterSchema = exports.EntityLinkSchema = exports.KGRelationshipSchema = exports.KGEntitySchema = void 0;
const zod_1 = require("zod");
// Knowledge Graph Entity
exports.KGEntitySchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(), // References EntityType.id
    namespace: zod_1.z.string(),
    labels: zod_1.z.array(zod_1.z.string()), // Neo4j labels
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    confidence: zod_1.z.number().min(0).max(1).default(1.0),
    provenance: zod_1.z.object({
        sourceId: zod_1.z.string(),
        sourceType: zod_1.z.enum(['document', 'database', 'api', 'manual', 'inferred']),
        extractedAt: zod_1.z.string().datetime(),
        extractorVersion: zod_1.z.string().optional(),
        verifiedBy: zod_1.z.string().optional(),
        verifiedAt: zod_1.z.string().datetime().optional(),
    }),
    temporalInfo: zod_1.z
        .object({
        validFrom: zod_1.z.string().datetime().optional(),
        validTo: zod_1.z.string().datetime().optional(),
        asOf: zod_1.z.string().datetime().optional(),
    })
        .optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// Knowledge Graph Relationship
exports.KGRelationshipSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.string(), // References RelationshipType.id
    namespace: zod_1.z.string(),
    sourceId: zod_1.z.string(),
    targetId: zod_1.z.string(),
    properties: zod_1.z.record(zod_1.z.string(), zod_1.z.any()),
    confidence: zod_1.z.number().min(0).max(1).default(1.0),
    weight: zod_1.z.number().optional(), // For weighted graphs
    provenance: zod_1.z.object({
        sourceId: zod_1.z.string(),
        sourceType: zod_1.z.enum(['document', 'database', 'api', 'manual', 'inferred']),
        extractedAt: zod_1.z.string().datetime(),
        extractorVersion: zod_1.z.string().optional(),
    }),
    temporalInfo: zod_1.z
        .object({
        validFrom: zod_1.z.string().datetime().optional(),
        validTo: zod_1.z.string().datetime().optional(),
        asOf: zod_1.z.string().datetime().optional(),
    })
        .optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
});
// Entity Link (for entity linking to external KBs)
exports.EntityLinkSchema = zod_1.z.object({
    entityId: zod_1.z.string(),
    externalId: zod_1.z.string(),
    externalSource: zod_1.z.enum(['dbpedia', 'wikidata', 'freebase', 'yago', 'custom']),
    externalUri: zod_1.z.string().url(),
    linkType: zod_1.z.enum(['same_as', 'related_to', 'subclass_of', 'instance_of']),
    confidence: zod_1.z.number().min(0).max(1),
    disambiguationContext: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    createdAt: zod_1.z.string().datetime(),
});
// Co-reference Resolution
exports.CoreferenceClusterSchema = zod_1.z.object({
    id: zod_1.z.string(),
    entities: zod_1.z.array(zod_1.z.string()), // Entity IDs that refer to the same real-world entity
    canonicalEntityId: zod_1.z.string(), // The canonical/preferred entity
    confidence: zod_1.z.number().min(0).max(1),
    resolutionMethod: zod_1.z.enum([
        'exact_match',
        'fuzzy_match',
        'ml_model',
        'rule_based',
        'manual',
    ]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    createdAt: zod_1.z.string().datetime(),
});
// Named Entity Recognition Result
exports.NERResultSchema = zod_1.z.object({
    text: zod_1.z.string(),
    entities: zod_1.z.array(zod_1.z.object({
        text: zod_1.z.string(),
        type: zod_1.z.string(), // PERSON, ORG, LOC, DATE, etc.
        startOffset: zod_1.z.number(),
        endOffset: zod_1.z.number(),
        confidence: zod_1.z.number().min(0).max(1),
        metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
    })),
    model: zod_1.z.string(),
    modelVersion: zod_1.z.string(),
    processedAt: zod_1.z.string().datetime(),
});
