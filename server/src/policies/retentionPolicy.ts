import { z } from 'zod/v4';

export const RetentionAuthoritySchema = z.object({
  readinessAssertionRef: z.literal('docs/SUMMIT_READINESS_ASSERTION.md'),
  constitutionRef: z.literal('docs/governance/CONSTITUTION.md'),
  metaGovernanceRef: z.literal('docs/governance/META_GOVERNANCE.md'),
  agentMandatesRef: z.literal('docs/governance/AGENT_MANDATES.md'),
});

export const RetentionPolicyMetadataSchema = z.object({
  id: z.string().min(3),
  version: z.string().min(1),
  name: z.string().min(3),
  description: z.string().optional(),
  authority: RetentionAuthoritySchema,
});

export const RetentionScopeSchema = z.object({
  tenantId: z.string().optional(),
  dataset: z.string().optional(),
  region: z.string().optional(),
});

export const RetentionActionSchema = z.enum(['DELETE', 'ARCHIVE', 'ANONYMIZE']);

export const RetentionResourceSchema = z.object({
  type: z.string().min(1),
  table: z.string().optional(),
});

export const RetentionRuleSchema = z.object({
  id: z.string().min(3),
  resource: RetentionResourceSchema,
  retentionDays: z.number().int().min(1),
  action: RetentionActionSchema,
  reason: z.string().optional(),
  match: z.record(z.string(), z.string()).optional(),
});

export const RetentionPolicySchema = z.object({
  metadata: RetentionPolicyMetadataSchema,
  scope: RetentionScopeSchema.optional(),
  rules: z.array(RetentionRuleSchema).min(1),
});

export const RETENTION_POLICY_AUTHORITY = {
  readinessAssertionRef: 'docs/SUMMIT_READINESS_ASSERTION.md',
  constitutionRef: 'docs/governance/CONSTITUTION.md',
  metaGovernanceRef: 'docs/governance/META_GOVERNANCE.md',
  agentMandatesRef: 'docs/governance/AGENT_MANDATES.md',
} as const;

export type RetentionPolicy = z.infer<typeof RetentionPolicySchema>;
export type RetentionRule = z.infer<typeof RetentionRuleSchema>;
export type RetentionAction = z.infer<typeof RetentionActionSchema>;
