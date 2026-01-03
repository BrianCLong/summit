import { createHash } from 'crypto';
import { z } from 'zod';

export const redactedValue = '***REDACTED***';

export const policySnapshotMetadataSchema = z.object({
  timestamp: z.string(),
  environment: z.string().optional(),
  tenant: z.string().optional(),
  gitCommit: z.string().optional(),
  policySchemaVersion: z.string().optional(),
  serviceVersion: z.string().optional(),
  sourcePrecedence: z.array(z.string()).default([]),
  changeActor: z.string().optional().default('unknown'),
});

export const normalizedPolicySchema = z.object({
  toolAllowlist: z.array(z.string()).default([]),
  toolDenylist: z.array(z.string()).default([]),
  budgets: z.record(z.number()).default({}),
  strictAttribution: z.boolean().default(true),
  approvalRequirements: z.record(z.array(z.string())).default({}),
  riskWeights: z.record(z.number()).default({}),
  redaction: z
    .object({
      enabled: z.boolean().default(true),
      strategy: z.string().default('mask'),
      fields: z.array(z.string()).default([]),
    })
    .default({ enabled: true, strategy: 'mask', fields: [] }),
});

export const effectivePolicySnapshotSchema = z.object({
  snapshotId: z.string(),
  metadata: policySnapshotMetadataSchema,
  normalized: normalizedPolicySchema,
});

export type EffectivePolicySnapshot = ReturnType<typeof effectivePolicySnapshotSchema['parse']>;
export type NormalizedPolicy = ReturnType<typeof normalizedPolicySchema['parse']>;

export const driftDiffSchema = z.object({
  path: z.string(),
  before: z.unknown(),
  after: z.unknown(),
  classification: z.enum(['benign', 'risky', 'critical']),
  rationale: z.string(),
});

export type DriftDiff = ReturnType<typeof driftDiffSchema['parse']>;

export const policyDriftReportSchema = z.object({
  baselineSnapshotId: z.string(),
  runtimeSnapshotId: z.string(),
  severity: z.enum(['none', 'low', 'medium', 'high', 'critical']),
  confidence: z.enum(['low', 'medium', 'high']).default('medium'),
  diffs: z.array(driftDiffSchema),
  evidenceRefs: z.array(z.string()).default([]),
});

export type PolicyDriftReport = ReturnType<typeof policyDriftReportSchema['parse']>;

export function computeSnapshotId(snapshot: Omit<EffectivePolicySnapshot, 'snapshotId'>): string {
  const hash = createHash('sha256');
  hash.update(JSON.stringify(snapshot));
  return hash.digest('hex');
}

export function redactValue(value: unknown): unknown {
  if (value === undefined || value === null) return value;
  if (typeof value === 'string') {
    return value.replace(/[A-Za-z0-9_-]{12,}/g, redactedValue);
  }
  return value;
}

export function redactNormalized(normalized: NormalizedPolicy): NormalizedPolicy {
  return {
    ...normalized,
    budgets: Object.fromEntries(
      Object.entries(normalized.budgets).map(([key, val]) => [key, val]),
    ),
    approvalRequirements: Object.fromEntries(
      Object.entries(normalized.approvalRequirements).map(([key, val]) => [
        key,
        (Array.isArray(val) ? val : []).map((v: string) =>
          v.toLowerCase().includes('token') ? redactedValue : v
        ),
      ]),
    ),
    redaction: {
      ...normalized.redaction,
      fields: normalized.redaction.fields.map((field: string) => redactValue(field) as string),
    },
  };
}
