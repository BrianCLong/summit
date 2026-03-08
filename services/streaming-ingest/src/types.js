"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReplayRequestSchema = exports.CheckpointSchema = exports.EventSchema = void 0;
const zod_1 = require("zod");
/**
 * Core event schema with provenance metadata
 */
exports.EventSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    type: zod_1.z.string().min(1),
    source: zod_1.z.string().min(1),
    timestamp: zod_1.z.number().int().positive(),
    data: zod_1.z.record(zod_1.z.unknown()),
    metadata: zod_1.z.object({
        version: zod_1.z.string().default('1.0.0'),
        correlationId: zod_1.z.string().uuid().optional(),
        causationId: zod_1.z.string().uuid().optional(),
        userId: zod_1.z.string().optional(),
        tenantId: zod_1.z.string().optional(),
    }),
    provenance: zod_1.z.object({
        hash: zod_1.z.string(),
        signature: zod_1.z.string().optional(),
        policyTags: zod_1.z.array(zod_1.z.string()).default([]),
        classification: zod_1.z.enum(['UNCLASSIFIED', 'CONFIDENTIAL', 'SECRET', 'TOP_SECRET']).default('UNCLASSIFIED'),
        source: zod_1.z.string(),
        ingestionTime: zod_1.z.number().int().positive(),
        transformations: zod_1.z.array(zod_1.z.object({
            operation: zod_1.z.string(),
            timestamp: zod_1.z.number().int().positive(),
            userId: zod_1.z.string().optional(),
        })).default([]),
    }),
});
/**
 * Checkpoint for deterministic replay
 */
exports.CheckpointSchema = zod_1.z.object({
    id: zod_1.z.string().uuid(),
    topic: zod_1.z.string(),
    partition: zod_1.z.number().int().nonnegative(),
    offset: zod_1.z.string(),
    timestamp: zod_1.z.number().int().positive(),
    eventCount: zod_1.z.number().int().nonnegative(),
    hash: zod_1.z.string(),
});
/**
 * Replay request schema
 */
exports.ReplayRequestSchema = zod_1.z.object({
    checkpointId: zod_1.z.string().uuid().optional(),
    fromOffset: zod_1.z.string().optional(),
    toOffset: zod_1.z.string().optional(),
    topic: zod_1.z.string(),
    targetTopic: zod_1.z.string().optional(),
    filters: zod_1.z.object({
        eventTypes: zod_1.z.array(zod_1.z.string()).optional(),
        sources: zod_1.z.array(zod_1.z.string()).optional(),
        tenantIds: zod_1.z.array(zod_1.z.string()).optional(),
    }).optional(),
});
