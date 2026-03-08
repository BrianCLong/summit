"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MergeManifestSchema = exports.MergePolicyConfigSchema = exports.MergeDeltaSchema = void 0;
const zod_1 = require("zod");
exports.MergeDeltaSchema = zod_1.z.object({
    id: zod_1.z.string(),
    uri: zod_1.z.string().describe("URI to the delta artifact"),
    weight: zod_1.z.number().default(1.0),
    metadata: zod_1.z.record(zod_1.z.any()).optional()
});
exports.MergePolicyConfigSchema = zod_1.z.object({
    name: zod_1.z.enum(['ram', 'ram_plus', 'ties', 'average']),
    parameters: zod_1.z.object({
        threshold: zod_1.z.number().min(0).max(1).default(0.001),
        rescale: zod_1.z.boolean().default(true),
        // Additional parameters for other policies can go here
    }).optional()
});
exports.MergeManifestSchema = zod_1.z.object({
    version: zod_1.z.string().default("1.0.0"),
    timestamp: zod_1.z.string().datetime().default(() => new Date().toISOString()),
    baseModel: zod_1.z.object({
        uri: zod_1.z.string(),
        hash: zod_1.z.string()
    }),
    deltas: zod_1.z.array(exports.MergeDeltaSchema),
    policy: exports.MergePolicyConfigSchema,
    toolchain: zod_1.z.object({
        engine: zod_1.z.string().default("@summit/behavior-merge-engine"),
        version: zod_1.z.string().optional()
    })
});
