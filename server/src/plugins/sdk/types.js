"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManifestSchema = exports.RiskLevelSchema = exports.PluginCapabilitySchema = exports.PluginTypeSchema = void 0;
const zod_1 = require("zod");
// Semver regex (simplified for stability without external dep)
const SEMVER_REGEX = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:-((?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*)(?:\.(?:0|[1-9]\d*|\d*[a-zA-Z-][0-9a-zA-Z-]*))*))?(?:\+([0-9a-zA-Z-]+(?:\.[0-9a-zA-Z-]+)*))?$/;
exports.PluginTypeSchema = zod_1.z.enum(['connector', 'scorer', 'pattern', 'exporter']);
exports.PluginCapabilitySchema = zod_1.z.enum([
    'read:graph',
    'write:graph',
    'read:files',
    'write:files',
    'net:outbound',
    'compute:heavy'
]);
exports.RiskLevelSchema = zod_1.z.enum(['low', 'medium', 'high', 'critical']);
exports.PluginManifestSchema = zod_1.z.object({
    name: zod_1.z.string().min(3).max(64).regex(/^[a-z0-9-]+$/, "Name must be kebab-case"),
    version: zod_1.z.string().regex(SEMVER_REGEX, "Must be valid semver"),
    type: exports.PluginTypeSchema,
    capabilities: zod_1.z.array(exports.PluginCapabilitySchema).default([]),
    requiredScopes: zod_1.z.array(zod_1.z.string()).default([]),
    riskLevel: exports.RiskLevelSchema.default('low'),
    configSchema: zod_1.z.record(zod_1.z.any()).optional(), // JSON Schema or Zod definition in JSON
    owner: zod_1.z.string().email(),
    description: zod_1.z.string().optional(),
});
