"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConflictResolutionSchema = exports.SyncMessageSchema = exports.PresenceSchema = exports.DocumentStateSchema = exports.OperationSchema = exports.OperationType = void 0;
const zod_1 = require("zod");
// Operation types for operational transformation
var OperationType;
(function (OperationType) {
    OperationType["INSERT"] = "insert";
    OperationType["DELETE"] = "delete";
    OperationType["RETAIN"] = "retain";
    OperationType["UPDATE"] = "update";
})(OperationType || (exports.OperationType = OperationType = {}));
exports.OperationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.nativeEnum(OperationType),
    position: zod_1.z.number(),
    length: zod_1.z.number().optional(),
    content: zod_1.z.any().optional(),
    attributes: zod_1.z.record(zod_1.z.any()).optional(),
    userId: zod_1.z.string(),
    timestamp: zod_1.z.number(),
    version: zod_1.z.number(),
    // Client-known version the operation was authored against. Used to transform
    // against remote history while preserving intent when rebasing.
    baseVersion: zod_1.z.number().optional()
});
exports.DocumentStateSchema = zod_1.z.object({
    id: zod_1.z.string(),
    content: zod_1.z.any(),
    version: zod_1.z.number(),
    checksum: zod_1.z.string().optional(),
    lastModified: zod_1.z.date(),
    modifiedBy: zod_1.z.string()
});
exports.PresenceSchema = zod_1.z.object({
    userId: zod_1.z.string(),
    userName: zod_1.z.string(),
    userAvatar: zod_1.z.string().optional(),
    documentId: zod_1.z.string(),
    cursor: zod_1.z.object({
        position: zod_1.z.number(),
        selection: zod_1.z.object({
            start: zod_1.z.number(),
            end: zod_1.z.number()
        }).optional()
    }).optional(),
    viewport: zod_1.z.object({
        top: zod_1.z.number(),
        bottom: zod_1.z.number()
    }).optional(),
    status: zod_1.z.enum(['active', 'idle', 'away']).default('active'),
    lastActivity: zod_1.z.date(),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.SyncMessageSchema = zod_1.z.discriminatedUnion('type', [
    zod_1.z.object({
        type: zod_1.z.literal('operation'),
        operation: exports.OperationSchema
    }),
    zod_1.z.object({
        type: zod_1.z.literal('presence'),
        presence: exports.PresenceSchema
    }),
    zod_1.z.object({
        type: zod_1.z.literal('ack'),
        operationId: zod_1.z.string(),
        version: zod_1.z.number()
    }),
    zod_1.z.object({
        type: zod_1.z.literal('sync_request'),
        documentId: zod_1.z.string(),
        version: zod_1.z.number()
    }),
    zod_1.z.object({
        type: zod_1.z.literal('sync_response'),
        documentId: zod_1.z.string(),
        state: exports.DocumentStateSchema,
        operations: zod_1.z.array(exports.OperationSchema)
    }),
    zod_1.z.object({
        type: zod_1.z.literal('conflict'),
        operationId: zod_1.z.string(),
        conflictingOperations: zod_1.z.array(exports.OperationSchema)
    })
]);
exports.ConflictResolutionSchema = zod_1.z.object({
    strategy: zod_1.z.enum(['last_write_wins', 'first_write_wins', 'merge', 'manual']),
    winner: zod_1.z.string().optional(),
    mergedOperation: exports.OperationSchema.optional()
});
