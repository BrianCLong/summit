"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PluginManifestSchema = exports.PluginSignatureSchema = void 0;
const zod_1 = require("zod");
const permissions_js_1 = require("../types/permissions.js");
exports.PluginSignatureSchema = zod_1.z
    .object({
    signature: zod_1.z.string().min(1, 'Signature is required'),
    publicKey: zod_1.z.string().min(1, 'Public key is required'),
    algorithm: zod_1.z.string().optional(),
    timestamp: zod_1.z.string().datetime({ offset: true }).optional(),
})
    .strict();
exports.PluginManifestSchema = zod_1.z
    .object({
    id: zod_1.z.string().min(3).max(100).regex(/^[a-z0-9-]+$/),
    name: zod_1.z.string().min(1).max(200),
    version: zod_1.z.string().regex(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?$/),
    description: zod_1.z.string().max(1000),
    author: zod_1.z
        .object({
        name: zod_1.z.string(),
        email: zod_1.z.string().email().optional(),
        url: zod_1.z.string().url().optional(),
    })
        .strict(),
    homepage: zod_1.z.string().url().optional(),
    repository: zod_1.z.string().url().optional(),
    license: zod_1.z.string(),
    category: zod_1.z.enum([
        'data-source',
        'analyzer',
        'visualization',
        'export',
        'authentication',
        'search',
        'ml-model',
        'workflow',
        'ui-theme',
        'api-extension',
        'integration',
        'utility',
    ]),
    main: zod_1.z.string(),
    icon: zod_1.z.string().optional(),
    dependencies: zod_1.z.record(zod_1.z.string()).optional(),
    peerDependencies: zod_1.z.record(zod_1.z.string()).optional(),
    engineVersion: zod_1.z.string().regex(/^\d+\.\d+\.\d+(?:-[a-zA-Z0-9.]+)?$/),
    permissions: zod_1.z.array(zod_1.z.nativeEnum(permissions_js_1.PluginPermission)).nonempty(),
    resources: zod_1.z
        .object({
        maxMemoryMB: zod_1.z.number().int().positive().max(2048).default(256),
        maxCpuPercent: zod_1.z.number().int().positive().max(100).default(50),
        maxStorageMB: zod_1.z.number().int().positive().max(1024).default(100),
        maxNetworkMbps: zod_1.z.number().int().positive().max(1000).default(10),
    })
        .strict()
        .optional(),
    extensionPoints: zod_1.z
        .array(zod_1.z
        .object({
        id: zod_1.z.string(),
        type: zod_1.z.string(),
        config: zod_1.z.record(zod_1.z.any()).optional(),
    })
        .strict())
        .optional(),
    configSchema: zod_1.z.record(zod_1.z.any()).optional(),
    webhooks: zod_1.z
        .array(zod_1.z
        .object({
        event: zod_1.z.string(),
        handler: zod_1.z.string(),
    })
        .strict())
        .optional(),
    apiEndpoints: zod_1.z
        .array(zod_1.z
        .object({
        method: zod_1.z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']),
        path: zod_1.z.string(),
        handler: zod_1.z.string(),
    })
        .strict())
        .optional(),
    signature: exports.PluginSignatureSchema.optional(),
})
    .strict();
