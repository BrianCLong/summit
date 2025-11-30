import { z } from 'zod';

/**
 * Zero-Knowledge Deconfliction Types
 */

export const SaltSchema = z.object({
  tenantId: z.string(),
  salt: z.string(),
  createdAt: z.string(),
});

export const CommitmentSchema = z.object({
  hash: z.string(),
  metadata: z.record(z.any()).optional(),
});

export const CommitmentSetSchema = z.object({
  tenantId: z.string(),
  commitments: z.array(CommitmentSchema),
  count: z.number(),
  merkleRoot: z.string(),
});

export const DeconflictRequestSchema = z.object({
  tenantAId: z.string(),
  tenantBId: z.string(),
  tenantACommitments: z.array(z.string()),
  tenantBCommitments: z.array(z.string()),
  auditContext: z.record(z.any()).optional(),
});

export const DeconflictResponseSchema = z.object({
  hasOverlap: z.boolean(),
  overlapCount: z.number().optional(),
  proof: z.string(),
  auditLogId: z.string(),
  timestamp: z.string(),
});

export const AuditLogEntrySchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  tenantAId: z.string(),
  tenantBId: z.string(),
  hasOverlap: z.boolean(),
  overlapCount: z.number().optional(),
  proof: z.string(),
  context: z.record(z.any()).optional(),
});

export type Salt = z.infer<typeof SaltSchema>;
export type Commitment = z.infer<typeof CommitmentSchema>;
export type CommitmentSet = z.infer<typeof CommitmentSetSchema>;
export type DeconflictRequest = z.infer<typeof DeconflictRequestSchema>;
export type DeconflictResponse = z.infer<typeof DeconflictResponseSchema>;
export type AuditLogEntry = z.infer<typeof AuditLogEntrySchema>;
