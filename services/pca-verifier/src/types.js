"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProvenanceManifestSchema = exports.ProvenanceNodeSchema = exports.TransformSchema = void 0;
const zod_1 = require("zod");
/**
 * Proof-Carrying Analytics Types
 */
exports.TransformSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['parse', 'dedupe', 'aggregate', 'filter', 'join', 'transform']),
    version: zod_1.z.string(),
    params: zod_1.z.record(zod_1.z.any()),
    inputHash: zod_1.z.string().optional(),
    outputHash: zod_1.z.string().optional(),
});
exports.ProvenanceNodeSchema = zod_1.z.object({
    hash: zod_1.z.string(),
    type: zod_1.z.enum(['input', 'transform', 'output']),
    timestamp: zod_1.z.string(),
    transform: exports.TransformSchema.optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.ProvenanceManifestSchema = zod_1.z.object({
    version: zod_1.z.literal('1.0'),
    created: zod_1.z.string(),
    rootHash: zod_1.z.string(),
    nodes: zod_1.z.array(exports.ProvenanceNodeSchema),
    signature: zod_1.z.string().optional(),
    verifier: zod_1.z.object({
        algorithm: zod_1.z.string(),
        tolerance: zod_1.z.number().optional(),
    }),
});
