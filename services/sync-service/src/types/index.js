"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SyncAuditRecordSchema = exports.ConflictRecordSchema = exports.ConflictTypeSchema = exports.SyncOperationSchema = exports.ImportResultSchema = exports.ExportResultSchema = exports.ImportRequestSchema = exports.ExportRequestSchema = exports.SyncBundleSchema = exports.BundleSignatureSchema = exports.BundleChecksumSchema = exports.BundleContentSchema = exports.BundleManifestSchema = exports.SyncScopeSchema = exports.SyncDirectionSchema = void 0;
exports.generateBundleId = generateBundleId;
exports.generateOperationId = generateOperationId;
exports.generateConflictId = generateConflictId;
exports.generateAuditId = generateAuditId;
exports.computeChecksum = computeChecksum;
const zod_1 = require("zod");
const node_crypto_1 = __importDefault(require("node:crypto"));
// ============================================================================
// Core Sync Types
// ============================================================================
exports.SyncDirectionSchema = zod_1.z.enum(['push_up', 'pull_down']);
exports.SyncScopeSchema = zod_1.z.object({
    cases: zod_1.z.array(zod_1.z.string()).optional(),
    tenants: zod_1.z.array(zod_1.z.string()).optional(),
    timeRange: zod_1.z
        .object({
        start: zod_1.z.string().datetime(),
        end: zod_1.z.string().datetime(),
    })
        .optional(),
    entities: zod_1.z.array(zod_1.z.string()).optional(),
    relationships: zod_1.z.array(zod_1.z.string()).optional(),
    includeEvidence: zod_1.z.boolean().default(true),
    includeAnalytics: zod_1.z.boolean().default(false),
});
// ============================================================================
// Bundle Types
// ============================================================================
exports.BundleManifestSchema = zod_1.z.object({
    id: zod_1.z.string(),
    version: zod_1.z.string(),
    direction: exports.SyncDirectionSchema,
    scope: exports.SyncScopeSchema,
    sourceDeployment: zod_1.z.object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        environment: zod_1.z.enum(['core', 'edge']),
        classification: zod_1.z.string(),
    }),
    targetDeployment: zod_1.z
        .object({
        id: zod_1.z.string(),
        name: zod_1.z.string(),
        environment: zod_1.z.enum(['core', 'edge']),
        classification: zod_1.z.string(),
    })
        .optional(),
    createdAt: zod_1.z.string().datetime(),
    createdBy: zod_1.z.string(),
    expiresAt: zod_1.z.string().datetime().optional(),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
exports.BundleContentSchema = zod_1.z.object({
    cases: zod_1.z.array(zod_1.z.any()).default([]),
    entities: zod_1.z.array(zod_1.z.any()).default([]),
    relationships: zod_1.z.array(zod_1.z.any()).default([]),
    evidence: zod_1.z.array(zod_1.z.any()).default([]),
    analytics: zod_1.z.array(zod_1.z.any()).default([]),
    provenance: zod_1.z.array(zod_1.z.any()).default([]),
    auditRecords: zod_1.z.array(zod_1.z.any()).default([]),
});
exports.BundleChecksumSchema = zod_1.z.object({
    manifest: zod_1.z.string(),
    content: zod_1.z.string(),
    overall: zod_1.z.string(),
    algorithm: zod_1.z.string().default('sha256'),
});
exports.BundleSignatureSchema = zod_1.z.object({
    signature: zod_1.z.string(),
    algorithm: zod_1.z.string().default('RSA-SHA256'),
    publicKey: zod_1.z.string(),
    signedBy: zod_1.z.string(),
    signedAt: zod_1.z.string().datetime(),
});
exports.SyncBundleSchema = zod_1.z.object({
    manifest: exports.BundleManifestSchema,
    content: exports.BundleContentSchema,
    checksums: exports.BundleChecksumSchema,
    signatures: zod_1.z.array(exports.BundleSignatureSchema).default([]),
    encryptionMetadata: zod_1.z
        .object({
        encrypted: zod_1.z.boolean(),
        algorithm: zod_1.z.string().optional(),
        keyId: zod_1.z.string().optional(),
    })
        .optional(),
});
// ============================================================================
// Import/Export Types
// ============================================================================
exports.ExportRequestSchema = zod_1.z.object({
    scope: exports.SyncScopeSchema,
    direction: exports.SyncDirectionSchema.default('push_up'),
    targetDeployment: zod_1.z.string().optional(),
    encrypt: zod_1.z.boolean().default(false),
    expiresIn: zod_1.z.number().default(86400), // 24 hours
    dryRun: zod_1.z.boolean().default(false),
    requester: zod_1.z.string(),
    reason: zod_1.z.string(),
});
exports.ImportRequestSchema = zod_1.z.object({
    bundlePath: zod_1.z.string().optional(),
    bundleData: exports.SyncBundleSchema.optional(),
    verifySignatures: zod_1.z.boolean().default(true),
    dryRun: zod_1.z.boolean().default(false),
    conflictResolution: zod_1.z
        .enum(['abort', 'skip', 'overwrite', 'merge'])
        .default('abort'),
    requester: zod_1.z.string(),
    reason: zod_1.z.string(),
});
// ============================================================================
// Result Types
// ============================================================================
exports.ExportResultSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    bundleId: zod_1.z.string(),
    bundlePath: zod_1.z.string().optional(),
    manifest: exports.BundleManifestSchema,
    statistics: zod_1.z.object({
        casesExported: zod_1.z.number(),
        entitiesExported: zod_1.z.number(),
        relationshipsExported: zod_1.z.number(),
        evidenceExported: zod_1.z.number(),
        totalSize: zod_1.z.number(),
    }),
    checksums: exports.BundleChecksumSchema,
    signatures: zod_1.z.array(exports.BundleSignatureSchema),
    errors: zod_1.z.array(zod_1.z.string()).default([]),
    warnings: zod_1.z.array(zod_1.z.string()).default([]),
    exportedAt: zod_1.z.string().datetime(),
});
exports.ImportResultSchema = zod_1.z.object({
    success: zod_1.z.boolean(),
    bundleId: zod_1.z.string(),
    verification: zod_1.z.object({
        manifestValid: zod_1.z.boolean(),
        checksumValid: zod_1.z.boolean(),
        signaturesValid: zod_1.z.boolean(),
        notExpired: zod_1.z.boolean(),
    }),
    statistics: zod_1.z.object({
        casesImported: zod_1.z.number(),
        entitiesImported: zod_1.z.number(),
        relationshipsImported: zod_1.z.number(),
        evidenceImported: zod_1.z.number(),
        casesSkipped: zod_1.z.number(),
        entitiesSkipped: zod_1.z.number(),
        relationshipsSkipped: zod_1.z.number(),
        evidenceSkipped: zod_1.z.number(),
        conflicts: zod_1.z.number(),
    }),
    conflicts: zod_1.z.array(zod_1.z.object({
        type: zod_1.z.string(),
        id: zod_1.z.string(),
        reason: zod_1.z.string(),
        resolution: zod_1.z.string(),
    })),
    errors: zod_1.z.array(zod_1.z.string()).default([]),
    warnings: zod_1.z.array(zod_1.z.string()).default([]),
    importedAt: zod_1.z.string().datetime(),
    dryRun: zod_1.z.boolean(),
});
// ============================================================================
// Sync Operation Types
// ============================================================================
exports.SyncOperationSchema = zod_1.z.object({
    id: zod_1.z.string(),
    type: zod_1.z.enum(['export', 'import']),
    direction: exports.SyncDirectionSchema,
    bundleId: zod_1.z.string(),
    status: zod_1.z.enum(['pending', 'in_progress', 'completed', 'failed', 'aborted']),
    progress: zod_1.z.number().min(0).max(100).default(0),
    initiatedBy: zod_1.z.string(),
    initiatedAt: zod_1.z.string().datetime(),
    completedAt: zod_1.z.string().datetime().optional(),
    errors: zod_1.z.array(zod_1.z.string()).default([]),
    metadata: zod_1.z.record(zod_1.z.string(), zod_1.z.any()).optional(),
});
// ============================================================================
// Conflict Types
// ============================================================================
exports.ConflictTypeSchema = zod_1.z.enum([
    'duplicate_id',
    'version_mismatch',
    'classification_mismatch',
    'tenant_mismatch',
    'data_corruption',
    'permission_denied',
]);
exports.ConflictRecordSchema = zod_1.z.object({
    id: zod_1.z.string(),
    bundleId: zod_1.z.string(),
    type: exports.ConflictTypeSchema,
    resourceType: zod_1.z.enum([
        'case',
        'entity',
        'relationship',
        'evidence',
        'analytic',
    ]),
    resourceId: zod_1.z.string(),
    existingData: zod_1.z.any(),
    incomingData: zod_1.z.any(),
    detectedAt: zod_1.z.string().datetime(),
    resolvedAt: zod_1.z.string().datetime().optional(),
    resolution: zod_1.z.string().optional(),
    resolvedBy: zod_1.z.string().optional(),
});
// ============================================================================
// Audit Types
// ============================================================================
exports.SyncAuditRecordSchema = zod_1.z.object({
    id: zod_1.z.string(),
    timestamp: zod_1.z.string().datetime(),
    operation: zod_1.z.enum(['export', 'import', 'verify', 'sign']),
    bundleId: zod_1.z.string(),
    actor: zod_1.z.string(),
    actorRole: zod_1.z.string(),
    sourceDeployment: zod_1.z.string(),
    targetDeployment: zod_1.z.string().optional(),
    scope: exports.SyncScopeSchema,
    result: zod_1.z.enum(['success', 'failure', 'partial']),
    statistics: zod_1.z.any(),
    errors: zod_1.z.array(zod_1.z.string()).default([]),
    reason: zod_1.z.string(),
    classification: zod_1.z.string(),
    hash: zod_1.z.string(),
    previousHash: zod_1.z.string().optional(),
});
// ============================================================================
// Utility Functions
// ============================================================================
function generateBundleId() {
    return `bundle_${node_crypto_1.default.randomUUID()}`;
}
function generateOperationId() {
    return `op_${node_crypto_1.default.randomUUID()}`;
}
function generateConflictId() {
    return `conflict_${node_crypto_1.default.randomUUID()}`;
}
function generateAuditId() {
    return `audit_${node_crypto_1.default.randomUUID()}`;
}
function computeChecksum(data, algorithm = 'sha256') {
    const hash = node_crypto_1.default.createHash(algorithm);
    if (Buffer.isBuffer(data)) {
        hash.update(data);
    }
    else if (typeof data === 'string') {
        hash.update(data);
    }
    else {
        hash.update(JSON.stringify(data, Object.keys(data).sort()));
    }
    return hash.digest('hex');
}
