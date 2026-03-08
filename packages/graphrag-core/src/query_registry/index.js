"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegistryLoader = exports.QueryRegistrySchema = exports.QueryMetadataSchema = void 0;
const zod_1 = require("zod");
const phases_js_1 = require("../phases.js");
exports.QueryMetadataSchema = zod_1.z.object({
    id: zod_1.z.string(),
    phase: zod_1.z.nativeEnum(phases_js_1.Phase),
    cypher: zod_1.z.string(),
    params: zod_1.z.array(zod_1.z.string()).optional(),
    max_rows: zod_1.z.number().int().positive().optional(),
    projection_allowlist: zod_1.z.array(zod_1.z.string()).optional(),
    pii_tags: zod_1.z.array(zod_1.z.string()).optional(),
    tenant_scope: zod_1.z.boolean().default(true),
});
exports.QueryRegistrySchema = zod_1.z.object({
    queries: zod_1.z.array(exports.QueryMetadataSchema),
});
class RegistryLoader {
    static validate(data) {
        return exports.QueryRegistrySchema.parse(data);
    }
}
exports.RegistryLoader = RegistryLoader;
