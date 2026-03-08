"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.envelopeSchema = exports.envelopeKindEnum = exports.secretSchema = exports.runSchema = exports.runStatusEnum = exports.connectorSchema = exports.edgeSchema = exports.entitySchema = exports.edgeTypes = exports.entityKinds = void 0;
const zod_1 = require("zod");
exports.entityKinds = [
    'Person',
    'Org',
    'Location',
    'Event',
    'Document',
    'Indicator',
    'Case',
    'Claim',
];
exports.edgeTypes = [
    'relatesTo',
    'locatedAt',
    'participatesIn',
    'derivedFrom',
    'mentions',
    'contradicts',
    'supports',
    'enrichedFrom',
];
exports.entitySchema = zod_1.z.object({
    id: zod_1.z.string(),
    kind: zod_1.z.enum(exports.entityKinds),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    observedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
    policyLabels: zod_1.z.array(zod_1.z.string()).default([]),
    provenance: zod_1.z
        .object({
        chain: zod_1.z.array(zod_1.z.string()),
    })
        .default({ chain: [] }),
});
exports.edgeSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(exports.edgeTypes),
    sourceId: zod_1.z.string(),
    targetId: zod_1.z.string(),
    observedAt: zod_1.z.string().datetime(),
    tenantId: zod_1.z.string(),
    policyLabels: zod_1.z.array(zod_1.z.string()).default([]),
    provenance: zod_1.z
        .object({
        chain: zod_1.z.array(zod_1.z.string()),
    })
        .default({ chain: [] }),
});
exports.connectorSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    version: zod_1.z.string(),
    kind: zod_1.z.enum(['BUILTIN', 'PLUGIN']),
    entrypoint: zod_1.z.string(),
    manifestHash: zod_1.z.string().optional(),
    permissions: zod_1.z.array(zod_1.z.string()),
    paramsSchema: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()).optional(),
    policyLabels: zod_1.z.array(zod_1.z.string()).default([]),
    createdAt: zod_1.z.string().datetime(),
});
exports.runStatusEnum = zod_1.z.enum([
    'PENDING',
    'RUNNING',
    'SUCCEEDED',
    'FAILED',
    'DLQ',
]);
exports.runSchema = zod_1.z.object({
    id: zod_1.z.string(),
    connectorId: zod_1.z.string(),
    status: exports.runStatusEnum,
    attempt: zod_1.z.number().int().nonnegative(),
    scheduleId: zod_1.z.string().optional(),
    startedAt: zod_1.z.string().datetime(),
    finishedAt: zod_1.z.string().datetime().optional(),
    error: zod_1.z.string().optional(),
    metrics: zod_1.z.object({
        items: zod_1.z.number().int().nonnegative(),
        bytes: zod_1.z.number().int().nonnegative(),
        durationMs: zod_1.z.number().int().nonnegative(),
    }),
    provenanceRef: zod_1.z.string(),
    dedupeKey: zod_1.z.string().optional(),
    tenantId: zod_1.z.string(),
});
exports.secretSchema = zod_1.z.object({
    id: zod_1.z.string(),
    name: zod_1.z.string(),
    scope: zod_1.z.enum(['TENANT', 'GLOBAL']),
    valueEnc: zod_1.z.string(),
    createdAt: zod_1.z.string().datetime(),
    rotationAt: zod_1.z.string().datetime().optional(),
});
exports.envelopeKindEnum = zod_1.z.enum(['ENTITY', 'EDGE']);
exports.envelopeSchema = zod_1.z.object({
    tenantId: zod_1.z.string(),
    source: zod_1.z.object({
        name: zod_1.z.string(),
        url: zod_1.z.string().url().optional(),
        license: zod_1.z.string().optional(),
    }),
    kind: exports.envelopeKindEnum,
    type: zod_1.z.string(),
    payload: zod_1.z.record(zod_1.z.string(), zod_1.z.unknown()),
    observedAt: zod_1.z.string().datetime(),
    hash: zod_1.z.string(),
    policyLabels: zod_1.z.array(zod_1.z.string()).default([]),
    provenance: zod_1.z.object({
        chain: zod_1.z.array(zod_1.z.string()),
    }),
    dedupeKey: zod_1.z.string().optional(),
});
