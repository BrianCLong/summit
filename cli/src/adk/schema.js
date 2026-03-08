"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manifestSchema = exports.knowledgeBaseSchema = exports.connectionSchema = exports.toolSchema = void 0;
const zod_1 = require("zod");
exports.toolSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    type: zod_1.z.string().optional(),
    allowed: zod_1.z.boolean().optional(),
});
exports.connectionSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    type: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    fields: zod_1.z.array(zod_1.z.string()).optional(),
});
exports.knowledgeBaseSchema = zod_1.z
    .object({
    sources: zod_1.z
        .array(zod_1.z.object({
        name: zod_1.z.string().min(1),
        uri: zod_1.z.string().min(1),
        type: zod_1.z.string().min(1),
    }))
        .optional(),
})
    .optional();
exports.manifestSchema = zod_1.z.object({
    schema_version: zod_1.z.literal('s-adk/v1'),
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    tools: zod_1.z.array(exports.toolSchema).optional(),
    connections: zod_1.z.array(exports.connectionSchema).optional(),
    knowledge_base: exports.knowledgeBaseSchema,
    policy: zod_1.z
        .object({
        allow_tools: zod_1.z.array(zod_1.z.string()).optional(),
        allow_network: zod_1.z.boolean().optional(),
    })
        .optional(),
});
