"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.playbookRunManifestSchema = void 0;
const zod_1 = require("zod");
const canonicalNodeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    tenantId: zod_1.z.string(),
    nodeType: zod_1.z.enum(['Input', 'Decision', 'Action', 'Outcome']),
    subType: zod_1.z.string(),
    label: zod_1.z.string(),
    timestamp: zod_1.z.string(),
    metadata: zod_1.z.record(zod_1.z.any()),
    hash: zod_1.z.string().optional(),
    sourceEntryId: zod_1.z.string().optional(),
});
const canonicalEdgeSchema = zod_1.z.object({
    sourceId: zod_1.z.string(),
    targetId: zod_1.z.string(),
    relation: zod_1.z.enum([
        'FED_INTO',
        'USED_BY',
        'TRIGGERED',
        'BLOCKED',
        'PRODUCED',
        'GENERATED',
        'AFFECTED',
        'DERIVED_FROM',
    ]),
    timestamp: zod_1.z.string(),
    properties: zod_1.z.record(zod_1.z.any()).optional(),
});
exports.playbookRunManifestSchema = zod_1.z.object({
    schemaVersion: zod_1.z.literal('1.0'),
    generatedAt: zod_1.z.string(),
    run: zod_1.z.object({
        id: zod_1.z.string(),
        playbookId: zod_1.z.string(),
        tenantId: zod_1.z.string(),
        status: zod_1.z.string(),
        startedAt: zod_1.z.string().nullable(),
        completedAt: zod_1.z.string().nullable(),
    }),
    playbook: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        description: zod_1.z.string().nullable(),
    }),
    provenance: zod_1.z.object({
        nodes: zod_1.z.array(canonicalNodeSchema),
        edges: zod_1.z.array(canonicalEdgeSchema),
    }),
});
