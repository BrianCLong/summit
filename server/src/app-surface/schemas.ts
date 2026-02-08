/**
 * App Surface Schemas
 *
 * Zod contracts for the AppCard message type and Policy Preflight Runner.
 * All user-provided strings are treated as untrusted; no dynamic code execution.
 */

import { z } from 'zod';

// --- Environment ---

export const EnvironmentSchema = z.enum(['dev', 'staging', 'prod']);
export type Environment = z.infer<typeof EnvironmentSchema>;

// --- AppCard status ---

export const AppCardStatusSchema = z.enum(['idle', 'pending', 'success', 'denied', 'error']);
export type AppCardStatus = z.infer<typeof AppCardStatusSchema>;

// --- Policy Preflight Request ---

export const PolicyPreflightRequestSchema = z.object({
  environment: EnvironmentSchema,
  tools: z.array(z.string().min(1).max(128)).min(1).max(50),
  rationale: z.string().min(1).max(2000),
  dryRun: z.boolean().optional().default(false),
});
export type PolicyPreflightRequest = z.infer<typeof PolicyPreflightRequestSchema>;

// --- Tool verdict ---

export const ToolVerdictSchema = z.object({
  tool: z.string(),
  allowed: z.boolean(),
  reason: z.string(),
});
export type ToolVerdict = z.infer<typeof ToolVerdictSchema>;

// --- Policy Preflight Response ---

export const PolicyPreflightResponseSchema = z.object({
  verdict: z.enum(['ALLOW', 'DENY', 'PARTIAL']),
  environment: EnvironmentSchema,
  toolVerdicts: z.array(ToolVerdictSchema),
  evidenceId: z.string(),
  timestamp: z.string(),
  dryRun: z.boolean(),
});
export type PolicyPreflightResponse = z.infer<typeof PolicyPreflightResponseSchema>;

// --- Evidence Bundle ---

export const EvidenceBundleSchema = z.object({
  id: z.string(),
  timestamp: z.string(),
  actor: z.string(),
  action: z.literal('policy_preflight'),
  inputsHash: z.string(),
  outputsHash: z.string(),
  policyDecision: z.enum(['ALLOW', 'DENY', 'PARTIAL']),
  environment: EnvironmentSchema,
  tools: z.array(z.string()),
  toolVerdicts: z.array(ToolVerdictSchema),
  rationale: z.string(),
  dryRun: z.boolean(),
});
export type EvidenceBundle = z.infer<typeof EvidenceBundleSchema>;
