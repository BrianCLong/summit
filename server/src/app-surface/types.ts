/**
 * App Surface Types & Zod Schemas
 *
 * Typed contracts for the AppCard message type, Policy Preflight,
 * and Evidence Bundle. All user-provided strings are treated as
 * untrusted — no dynamic code execution, strict allowlists only.
 */

import { z } from 'zod';

// ============================================================================
// Environment & Tool Allowlist
// ============================================================================

export const EnvironmentSchema = z.enum(['dev', 'staging', 'prod']);
export type Environment = z.infer<typeof EnvironmentSchema>;

export const ToolIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9_-]+$/, 'Tool IDs must be alphanumeric with hyphens/underscores');
export type ToolId = z.infer<typeof ToolIdSchema>;

// ============================================================================
// Policy Verdict
// ============================================================================

export const PolicyVerdictSchema = z.enum(['ALLOW', 'DENY']);
export type PolicyVerdict = z.infer<typeof PolicyVerdictSchema>;

export const PolicyReasonSchema = z.object({
  tool: ToolIdSchema,
  verdict: PolicyVerdictSchema,
  reason: z.string().max(500),
});
export type PolicyReason = z.infer<typeof PolicyReasonSchema>;

// ============================================================================
// Policy Preflight Request / Response
// ============================================================================

export const PolicyPreflightRequestSchema = z.object({
  environment: EnvironmentSchema,
  tools: z.array(ToolIdSchema).min(1).max(50),
  rationale: z.string().min(1).max(2000),
  actor: z.string().min(1).max(256).optional(),
  dryRun: z.boolean().default(false),
});
export type PolicyPreflightRequest = z.infer<typeof PolicyPreflightRequestSchema>;

export const PolicyPreflightResponseSchema = z.object({
  verdict: PolicyVerdictSchema,
  reasons: z.array(PolicyReasonSchema),
  evidenceId: z.string(),
  timestamp: z.string().datetime(),
  environment: EnvironmentSchema,
  requestedTools: z.array(ToolIdSchema),
  allowedTools: z.array(ToolIdSchema),
  deniedTools: z.array(ToolIdSchema),
  dryRun: z.boolean(),
});
export type PolicyPreflightResponse = z.infer<typeof PolicyPreflightResponseSchema>;

// ============================================================================
// Evidence Bundle
// ============================================================================

export const EvidenceBundleSchema = z.object({
  id: z.string(),
  version: z.literal('1.0'),
  timestamp: z.string().datetime(),
  actor: z.string(),
  action: z.string(),
  inputsHash: z.string(),
  outputsHash: z.string(),
  policyDecision: PolicyVerdictSchema,
  environment: EnvironmentSchema,
  details: z.record(z.unknown()),
  integrityHash: z.string(),
});
export type EvidenceBundle = z.infer<typeof EvidenceBundleSchema>;

// ============================================================================
// AppCard Message Type
// ============================================================================

export const AppCardStatusSchema = z.enum([
  'pending',
  'running',
  'success',
  'denied',
  'error',
]);
export type AppCardStatus = z.infer<typeof AppCardStatusSchema>;

export const AppCardFormFieldSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: z.enum(['select', 'multi-select', 'text', 'textarea']),
  required: z.boolean().default(false),
  options: z.array(z.object({
    value: z.string(),
    label: z.string(),
  })).optional(),
  placeholder: z.string().optional(),
  maxLength: z.number().int().positive().optional(),
});
export type AppCardFormField = z.infer<typeof AppCardFormFieldSchema>;

export const AppCardSchema = z.object({
  id: z.string(),
  surface: z.string(),
  title: z.string().max(200),
  summary: z.string().max(500),
  status: AppCardStatusSchema,
  timestamp: z.string().datetime(),
  form: z.object({
    fields: z.array(AppCardFormFieldSchema),
  }).optional(),
  result: z.object({
    verdict: PolicyVerdictSchema.optional(),
    details: z.record(z.unknown()).optional(),
    evidenceId: z.string().optional(),
  }).optional(),
});
export type AppCard = z.infer<typeof AppCardSchema>;

// ============================================================================
// Tool Allowlist Config
// ============================================================================

export const ToolAllowlistConfigSchema = z.object({
  version: z.string(),
  environments: z.record(EnvironmentSchema, z.object({
    allowedTools: z.array(ToolIdSchema),
    denyByDefault: z.boolean().default(true),
    requireRationale: z.boolean().default(true),
  })),
});
export type ToolAllowlistConfig = z.infer<typeof ToolAllowlistConfigSchema>;
