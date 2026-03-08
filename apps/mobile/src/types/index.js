"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEOINTLayerSchema = exports.GEOINTFeatureSchema = exports.OSINTAlertSchema = exports.InvestigationSchema = exports.RelationshipSchema = exports.EntitySchema = exports.RelationshipType = exports.EntityType = exports.Priority = exports.ClassificationLevel = void 0;
const zod_1 = require("zod");
// Classification levels
exports.ClassificationLevel = zod_1.z.enum([
    'UNCLASSIFIED',
    'CONFIDENTIAL',
    'SECRET',
    'TOP_SECRET',
]);
// Priority levels
exports.Priority = zod_1.z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']);
// Entity types
exports.EntityType = zod_1.z.enum([
    'PERSON',
    'ORGANIZATION',
    'LOCATION',
    'EVENT',
    'DOCUMENT',
    'THREAT',
    'VEHICLE',
    'DEVICE',
    'FINANCIAL',
    'COMMUNICATION',
]);
// Relationship types
exports.RelationshipType = zod_1.z.enum([
    'ASSOCIATED_WITH',
    'WORKS_FOR',
    'LOCATED_AT',
    'OWNS',
    'COMMUNICATES_WITH',
    'RELATED_TO',
    'PART_OF',
    'FUNDED_BY',
    'TRANSACTED_WITH',
    'MENTIONED_IN',
]);
// Base entity schema
exports.EntitySchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.EntityType,
    name: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    classification: exports.ClassificationLevel,
    priority: exports.Priority.optional(),
    confidence: zod_1.z.number().min(0).max(100),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    location: zod_1.z
        .object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
        accuracy: zod_1.z.number().optional(),
    })
        .optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    sources: zod_1.z.array(zod_1.z.string()).optional(),
});
// Relationship schema
exports.RelationshipSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: exports.RelationshipType,
    sourceId: zod_1.z.string().uuid(),
    targetId: zod_1.z.string().uuid(),
    classification: exports.ClassificationLevel,
    confidence: zod_1.z.number().min(0).max(100),
    startDate: zod_1.z.string().datetime().optional(),
    endDate: zod_1.z.string().datetime().optional(),
    createdAt: zod_1.z.string().datetime(),
    metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
});
// Investigation schema
exports.InvestigationSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    description: zod_1.z.string().optional(),
    classification: exports.ClassificationLevel,
    priority: exports.Priority,
    status: zod_1.z.enum(['DRAFT', 'ACTIVE', 'ON_HOLD', 'CLOSED', 'ARCHIVED']),
    leadAnalyst: zod_1.z.string(),
    team: zod_1.z.array(zod_1.z.string()),
    createdAt: zod_1.z.string().datetime(),
    updatedAt: zod_1.z.string().datetime(),
    dueDate: zod_1.z.string().datetime().optional(),
    tags: zod_1.z.array(zod_1.z.string()).optional(),
    entityCount: zod_1.z.number().default(0),
    relationshipCount: zod_1.z.number().default(0),
});
// OSINT Alert schema
exports.OSINTAlertSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    priority: exports.Priority,
    source: zod_1.z.string(),
    sourceUrl: zod_1.z.string().url().optional(),
    entities: zod_1.z.array(zod_1.z.string().uuid()),
    location: zod_1.z
        .object({
        latitude: zod_1.z.number(),
        longitude: zod_1.z.number(),
        name: zod_1.z.string().optional(),
    })
        .optional(),
    timestamp: zod_1.z.string().datetime(),
    isRead: zod_1.z.boolean().default(false),
    isAcknowledged: zod_1.z.boolean().default(false),
    acknowledgedAt: zod_1.z.string().datetime().optional(),
    acknowledgedBy: zod_1.z.string().optional(),
});
// GEOINT Feature schema
exports.GEOINTFeatureSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.literal('Feature'),
    geometry: zod_1.z.object({
        type: zod_1.z.enum(['Point', 'LineString', 'Polygon', 'MultiPoint', 'MultiLineString', 'MultiPolygon']),
        coordinates: zod_1.z.union([
            zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]),
            zod_1.z.array(zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()])),
            zod_1.z.array(zod_1.z.array(zod_1.z.tuple([zod_1.z.number(), zod_1.z.number()]))),
        ]),
    }),
    properties: zod_1.z.object({
        name: zod_1.z.string().optional(),
        entityId: zod_1.z.string().uuid().optional(),
        entityType: exports.EntityType.optional(),
        classification: exports.ClassificationLevel.optional(),
        priority: exports.Priority.optional(),
        description: zod_1.z.string().optional(),
        timestamp: zod_1.z.string().datetime().optional(),
        source: zod_1.z.string().optional(),
        confidence: zod_1.z.number().min(0).max(100).optional(),
        metadata: zod_1.z.record(zod_1.z.unknown()).optional(),
    }),
});
// GEOINT Layer schema
exports.GEOINTLayerSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    type: zod_1.z.enum(['entities', 'alerts', 'heatmap', 'routes', 'areas', 'custom']),
    visible: zod_1.z.boolean(),
    opacity: zod_1.z.number().min(0).max(1),
    features: zod_1.z.array(exports.GEOINTFeatureSchema),
    style: zod_1.z.record(zod_1.z.unknown()).optional(),
});
