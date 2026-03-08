"use strict";
/**
 * @intelgraph/audio-forensics
 *
 * Audio forensics capabilities including:
 * - Audio authenticity verification
 * - Edit detection
 * - Source device identification
 * - Timeline reconstruction
 * - Chain of custody tracking
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChainOfCustodySchema = exports.EditDetectionResultSchema = exports.AuthenticityResultSchema = void 0;
const zod_1 = require("zod");
exports.AuthenticityResultSchema = zod_1.z.object({
    isAuthentic: zod_1.z.boolean(),
    confidence: zod_1.z.number().min(0).max(1),
    tampering: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.enum(['splice', 'copy-move', 'insertion', 'deletion', 'resampling']),
        startTime: zod_1.z.number(),
        endTime: zod_1.z.number(),
        confidence: zod_1.z.number()
    })),
    metadata: zod_1.z.object({
        recordingDevice: zod_1.z.string().optional(),
        recordingEnvironment: zod_1.z.string().optional(),
        compressionHistory: zod_1.z.array(zod_1.z.string()).optional()
    })
});
exports.EditDetectionResultSchema = zod_1.z.object({
    edits: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        location: zod_1.z.number(),
        duration: zod_1.z.number(),
        confidence: zod_1.z.number()
    })),
    editCount: zod_1.z.number(),
    continuityScore: zod_1.z.number().min(0).max(1)
});
exports.ChainOfCustodySchema = zod_1.z.object({
    recordId: zod_1.z.string(),
    events: zod_1.z.array(zod_1.z.object({
        timestamp: zod_1.z.date(),
        actor: zod_1.z.string(),
        action: zod_1.z.enum(['created', 'accessed', 'modified', 'transferred', 'analyzed']),
        location: zod_1.z.string(),
        hash: zod_1.z.string(),
        signature: zod_1.z.string().optional()
    })),
    currentHash: zod_1.z.string(),
    verified: zod_1.z.boolean()
});
