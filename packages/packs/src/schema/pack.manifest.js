"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PackManifestSchema = void 0;
const zod_1 = require("zod");
exports.PackManifestSchema = zod_1.z.object({
    name: zod_1.z.string().describe("e.g. ecc/everything-claude-code"),
    version: zod_1.z.string(),
    upstream: zod_1.z.object({
        repo: zod_1.z.string(),
        commit: zod_1.z.string(),
        license: zod_1.z.string(),
    }).optional(),
    content: zod_1.z.object({
        agents: zod_1.z.array(zod_1.z.string()).optional(),
        skills: zod_1.z.array(zod_1.z.string()).optional(),
        hooks: zod_1.z.array(zod_1.z.string()).optional(),
        mcpProfiles: zod_1.z.array(zod_1.z.string()).optional(),
        rules: zod_1.z.array(zod_1.z.string()).optional(),
    }),
    checksumsFile: zod_1.z.string().default('checksums.json'),
    signature: zod_1.z.object({
        alg: zod_1.z.literal('ed25519'),
        keyId: zod_1.z.string(),
        sig: zod_1.z.string(),
    }).optional(),
});
