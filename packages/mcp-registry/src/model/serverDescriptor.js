"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ServerDescriptor = void 0;
var zod_1 = require("zod");
exports.ServerDescriptor = zod_1.z.object({
    serverId: zod_1.z.string().min(1),
    tenantVisibility: zod_1.z.array(zod_1.z.string()).default([]),
    transport: zod_1.z.enum(["stdio", "http", "sse"]).optional(),
    authModel: zod_1.z.enum(["none", "bearer", "oauth2", "mTLS"]).optional(),
    tools: zod_1.z.array(zod_1.z.object({
        name: zod_1.z.string(),
        description: zod_1.z.string().default(""),
        capabilityTags: zod_1.z.array(zod_1.z.string()).default([]),
        riskTags: zod_1.z.array(zod_1.z.string()).default([]),
        inputSchemaHash: zod_1.z.string().optional(),
    })).default([]),
    resources: zod_1.z.array(zod_1.z.object({ uri: zod_1.z.string(), mimeType: zod_1.z.string().optional() })).default([]),
    prompts: zod_1.z.array(zod_1.z.object({ name: zod_1.z.string() })).default([]),
});
