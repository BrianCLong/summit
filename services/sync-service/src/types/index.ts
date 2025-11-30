import { z } from 'zod';
import crypto from 'node:crypto';

// ============================================================================
// Core Sync Types
// ============================================================================

export const SyncDirectionSchema = z.enum(['push_up', 'pull_down']);
export type SyncDirection = z.infer<typeof SyncDirectionSchema>;

export const SyncScopeSchema = z.object({
  cases: z.array(z.string()).optional(),
  tenants: z.array(z.string()).optional(),
  timeRange: z
    .object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    })
    .optional(),
  entities: z.array(z.string()).optional(),
  relationships: z.array(z.string()).optional(),
  includeEvidence: z.boolean().default(true),
  includeAnalytics: z.boolean().default(false),
});
export type SyncScope = z.infer<typeof SyncScopeSchema>;

// ============================================================================
// Bundle Types
// ============================================================================

export const BundleManifestSchema = z.object({
  id: z.string(),
  version: z.string(),
  direction: SyncDirectionSchema,
  scope: SyncScopeSchema,
  sourceDeployment: z.object({
    id: z.string(),
    name: z.string(),
    environment: z.enum(['core', 'edge']),
    classification: z.string(),
  }),
  targetDeployment: z
    .object({
      id: z.string(),
      name: z.string(),
      environment: z.enum(['core', 'edge']),
      classification: z.string(),
    })
    .optional(),
  createdAt: z.string().datetime(),
  createdBy: z.string(),
  expiresAt: z.string().datetime().optional(),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type BundleManifest = z.infer<typeof BundleManifestSchema>;

export const BundleContentSchema = z.object({
  cases: z.array(z.any()).default([]),
  entities: z.array(z.any()).default([]),
  relationships: z.array(z.any()).default([]),
  evidence: z.array(z.any()).default([]),
  analytics: z.array(z.any()).default([]),
  provenance: z.array(z.any()).default([]),
  auditRecords: z.array(z.any()).default([]),
});
export type BundleContent = z.infer<typeof BundleContentSchema>;

export const BundleChecksumSchema = z.object({
  manifest: z.string(),
  content: z.string(),
  overall: z.string(),
  algorithm: z.string().default('sha256'),
});
export type BundleChecksum = z.infer<typeof BundleChecksumSchema>;

export const BundleSignatureSchema = z.object({
  signature: z.string(),
  algorithm: z.string().default('RSA-SHA256'),
  publicKey: z.string(),
  signedBy: z.string(),
  signedAt: z.string().datetime(),
});
export type BundleSignature = z.infer<typeof BundleSignatureSchema>;

export const SyncBundleSchema = z.object({
  manifest: BundleManifestSchema,
  content: BundleContentSchema,
  checksums: BundleChecksumSchema,
  signatures: z.array(BundleSignatureSchema).default([]),
  encryptionMetadata: z
    .object({
      encrypted: z.boolean(),
      algorithm: z.string().optional(),
      keyId: z.string().optional(),
    })
    .optional(),
});
export type SyncBundle = z.infer<typeof SyncBundleSchema>;

// ============================================================================
// Import/Export Types
// ============================================================================

export const ExportRequestSchema = z.object({
  scope: SyncScopeSchema,
  direction: SyncDirectionSchema.default('push_up'),
  targetDeployment: z.string().optional(),
  encrypt: z.boolean().default(false),
  expiresIn: z.number().default(86400), // 24 hours
  dryRun: z.boolean().default(false),
  requester: z.string(),
  reason: z.string(),
});
export type ExportRequest = z.infer<typeof ExportRequestSchema>;

export const ImportRequestSchema = z.object({
  bundlePath: z.string().optional(),
  bundleData: SyncBundleSchema.optional(),
  verifySignatures: z.boolean().default(true),
  dryRun: z.boolean().default(false),
  conflictResolution: z
    .enum(['abort', 'skip', 'overwrite', 'merge'])
    .default('abort'),
  requester: z.string(),
  reason: z.string(),
});
export type ImportRequest = z.infer<typeof ImportRequestSchema>;

// ============================================================================
// Result Types
// ============================================================================

export const ExportResultSchema = z.object({
  success: z.boolean(),
  bundleId: z.string(),
  bundlePath: z.string().optional(),
  manifest: BundleManifestSchema,
  statistics: z.object({
    casesExported: z.number(),
    entitiesExported: z.number(),
    relationshipsExported: z.number(),
    evidenceExported: z.number(),
    totalSize: z.number(),
  }),
  checksums: BundleChecksumSchema,
  signatures: z.array(BundleSignatureSchema),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  exportedAt: z.string().datetime(),
});
export type ExportResult = z.infer<typeof ExportResultSchema>;

export const ImportResultSchema = z.object({
  success: z.boolean(),
  bundleId: z.string(),
  verification: z.object({
    manifestValid: z.boolean(),
    checksumValid: z.boolean(),
    signaturesValid: z.boolean(),
    notExpired: z.boolean(),
  }),
  statistics: z.object({
    casesImported: z.number(),
    entitiesImported: z.number(),
    relationshipsImported: z.number(),
    evidenceImported: z.number(),
    casesSkipped: z.number(),
    entitiesSkipped: z.number(),
    relationshipsSkipped: z.number(),
    evidenceSkipped: z.number(),
    conflicts: z.number(),
  }),
  conflicts: z.array(
    z.object({
      type: z.string(),
      id: z.string(),
      reason: z.string(),
      resolution: z.string(),
    }),
  ),
  errors: z.array(z.string()).default([]),
  warnings: z.array(z.string()).default([]),
  importedAt: z.string().datetime(),
  dryRun: z.boolean(),
});
export type ImportResult = z.infer<typeof ImportResultSchema>;

// ============================================================================
// Sync Operation Types
// ============================================================================

export const SyncOperationSchema = z.object({
  id: z.string(),
  type: z.enum(['export', 'import']),
  direction: SyncDirectionSchema,
  bundleId: z.string(),
  status: z.enum(['pending', 'in_progress', 'completed', 'failed', 'aborted']),
  progress: z.number().min(0).max(100).default(0),
  initiatedBy: z.string(),
  initiatedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  errors: z.array(z.string()).default([]),
  metadata: z.record(z.string(), z.any()).optional(),
});
export type SyncOperation = z.infer<typeof SyncOperationSchema>;

// ============================================================================
// Conflict Types
// ============================================================================

export const ConflictTypeSchema = z.enum([
  'duplicate_id',
  'version_mismatch',
  'classification_mismatch',
  'tenant_mismatch',
  'data_corruption',
  'permission_denied',
]);
export type ConflictType = z.infer<typeof ConflictTypeSchema>;

export const ConflictRecordSchema = z.object({
  id: z.string(),
  bundleId: z.string(),
  type: ConflictTypeSchema,
  resourceType: z.enum([
    'case',
    'entity',
    'relationship',
    'evidence',
    'analytic',
  ]),
  resourceId: z.string(),
  existingData: z.any(),
  incomingData: z.any(),
  detectedAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
  resolution: z.string().optional(),
  resolvedBy: z.string().optional(),
});
export type ConflictRecord = z.infer<typeof ConflictRecordSchema>;

// ============================================================================
// Audit Types
// ============================================================================

export const SyncAuditRecordSchema = z.object({
  id: z.string(),
  timestamp: z.string().datetime(),
  operation: z.enum(['export', 'import', 'verify', 'sign']),
  bundleId: z.string(),
  actor: z.string(),
  actorRole: z.string(),
  sourceDeployment: z.string(),
  targetDeployment: z.string().optional(),
  scope: SyncScopeSchema,
  result: z.enum(['success', 'failure', 'partial']),
  statistics: z.any(),
  errors: z.array(z.string()).default([]),
  reason: z.string(),
  classification: z.string(),
  hash: z.string(),
  previousHash: z.string().optional(),
});
export type SyncAuditRecord = z.infer<typeof SyncAuditRecordSchema>;

// ============================================================================
// Utility Functions
// ============================================================================

export function generateBundleId(): string {
  return `bundle_${crypto.randomUUID()}`;
}

export function generateOperationId(): string {
  return `op_${crypto.randomUUID()}`;
}

export function generateConflictId(): string {
  return `conflict_${crypto.randomUUID()}`;
}

export function generateAuditId(): string {
  return `audit_${crypto.randomUUID()}`;
}

export function computeChecksum(data: any, algorithm = 'sha256'): string {
  const hash = crypto.createHash(algorithm);
  if (Buffer.isBuffer(data)) {
    hash.update(data);
  } else if (typeof data === 'string') {
    hash.update(data);
  } else {
    hash.update(JSON.stringify(data, Object.keys(data).sort()));
  }
  return hash.digest('hex');
}
